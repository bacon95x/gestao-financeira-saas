(function () {
  "use strict";

  var STORAGE_ATIVOS = "gfp_ativos_v1";
  var COTACAO_INTERVAL_MS = 120000;

  var ativosDefaults = {
    cotacaoAuto: true,
    reinvestirAuto: false,
    tickerSelecionado: "",
    posicoes: [],
    proventos: [],
    proventosPendentes: [],
  };

  var ativosState = JSON.parse(JSON.stringify(ativosDefaults));
  var cotacoesCache = {};
  var cotacaoFetchedAt = 0;
  var cotacaoIntervalId = null;

  function uid() {
    return "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  function parseNum(raw) {
    if (raw == null || raw === "") return NaN;
    if (typeof raw === "number") return raw;
    var s = String(raw).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    var n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function formatMoney(n) {
    var v = Number(n);
    if (!Number.isFinite(v)) return "—";
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatPct(n) {
    var v = Number(n);
    if (!Number.isFinite(v)) return "—";
    var sign = v > 0 ? "+" : "";
    return sign + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  }

  function normTicker(t) {
    return String(t || "")
      .trim()
      .toUpperCase()
      .replace(/\.SA$/i, "");
  }

  function classeLabel(c) {
    if (c === "fii") return "FII";
    if (c === "etf") return "ETF";
    return "Ação";
  }

  function inferirClasse(ticker) {
    var t = normTicker(ticker);
    if (/11$/.test(t)) return "fii";
    if (/^(BOVA|IVVB|SMAL|HASH|X)[A-Z0-9]*11$/.test(t)) return "etf";
    return "acao";
  }

  function ativosSave() {
    try {
      localStorage.setItem(STORAGE_ATIVOS, JSON.stringify(ativosState));
    } catch (e) {}
    if (typeof window.gfpCloudSaveNow === "function") {
      window.gfpCloudSaveNow({ auto: true }).catch(function () {});
    }
  }

  function ativosLoad() {
    ativosState = JSON.parse(JSON.stringify(ativosDefaults));
    try {
      var raw = localStorage.getItem(STORAGE_ATIVOS);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") return;
      ativosState.cotacaoAuto = o.cotacaoAuto !== false;
      ativosState.reinvestirAuto = !!o.reinvestirAuto;
      ativosState.tickerSelecionado = normTicker(o.tickerSelecionado || "");
      ativosState.posicoes = Array.isArray(o.posicoes) ? o.posicoes : [];
      ativosState.proventos = Array.isArray(o.proventos) ? o.proventos : [];
      ativosState.proventosPendentes = Array.isArray(o.proventosPendentes) ? o.proventosPendentes : [];
    } catch (e) {}
  }

  function posicaoPorTicker(ticker) {
    var t = normTicker(ticker);
    return ativosState.posicoes.find(function (p) {
      return normTicker(p.ticker) === t;
    });
  }

  function qtyTotalPosicao(p) {
    if (!p || !Array.isArray(p.compras)) return 0;
    return p.compras.reduce(function (s, c) {
      var q = Number(c.qty);
      return s + (Number.isFinite(q) && q > 0 ? q : 0);
    }, 0);
  }

  function investidoTotalPosicao(p) {
    if (!p || !Array.isArray(p.compras)) return 0;
    return p.compras.reduce(function (s, c) {
      var v = Number(c.investido);
      return s + (Number.isFinite(v) && v > 0 ? v : 0);
    }, 0);
  }

  function precoMedioPosicao(p) {
    var qty = qtyTotalPosicao(p);
    if (qty <= 0) return NaN;
    return investidoTotalPosicao(p) / qty;
  }

  function precoAtualTicker(ticker) {
    var t = normTicker(ticker);
    var q = cotacoesCache[t];
    if (!q) return NaN;
    var p = Number(q.regularMarketPrice != null ? q.regularMarketPrice : q.price);
    return Number.isFinite(p) && p > 0 ? p : NaN;
  }

  function plPosicao(p) {
    var preco = precoAtualTicker(p.ticker);
    var qty = qtyTotalPosicao(p);
    var inv = investidoTotalPosicao(p);
    if (!Number.isFinite(preco) || qty <= 0) return { val: NaN, pct: NaN, atual: NaN };
    var atual = preco * qty;
    var val = atual - inv;
    var pct = inv > 0 ? (val / inv) * 100 : NaN;
    return { val: val, pct: pct, atual: atual };
  }

  function todosTickers() {
    var set = {};
    ativosState.posicoes.forEach(function (p) {
      var t = normTicker(p.ticker);
      if (t) set[t] = true;
    });
    return Object.keys(set);
  }

  function tickersPorClasse(classe) {
    return ativosState.posicoes.filter(function (p) {
      return (p.classe || inferirClasse(p.ticker)) === classe;
    });
  }

  function resumoClasse(classe) {
    var list = tickersPorClasse(classe);
    var totalAtual = 0;
    var totalInv = 0;
    var count = list.length;
    list.forEach(function (p) {
      var pl = plPosicao(p);
      totalInv += investidoTotalPosicao(p);
      if (Number.isFinite(pl.atual)) totalAtual += pl.atual;
    });
    var plVal = totalAtual - totalInv;
    var plPct = totalInv > 0 ? (plVal / totalInv) * 100 : NaN;
    return { count: count, investido: totalInv, atual: totalAtual, plVal: plVal, plPct: plPct };
  }

  function patrimonioTotalAtivos() {
    var t = 0;
    ativosState.posicoes.forEach(function (p) {
      var pl = plPosicao(p);
      if (Number.isFinite(pl.atual)) t += pl.atual;
      else t += investidoTotalPosicao(p);
    });
    return t;
  }

  async function ativosApiCall(payload) {
    var sb = window.gfpSupabase;
    if (!sb) throw new Error("Sessão não disponível.");
    var sessRes = await sb.auth.getSession();
    var session = sessRes && sessRes.data ? sessRes.data.session : null;
    if (!session || !session.access_token) throw new Error("Faça login novamente.");

    var base = String(window.GFP_SUPABASE_URL || "").replace(/\/$/, "");
    if (!base || base.indexOf("SEU_PROJETO") !== -1) {
      throw new Error("Supabase não configurado.");
    }

    var res = await fetch(base + "/functions/v1/cotacoes-ativos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + session.access_token,
        apikey: window.GFP_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });

    var data = await res.json().catch(function () {
      return { ok: false, error: "Resposta inválida." };
    });
    if (!res.ok || !data.ok) {
      throw new Error((data && data.error) || "Erro ao consultar cotações.");
    }
    return data;
  }

  function aplicarQuotesNoCache(data) {
    var results = data && data.data && data.data.results;
    if (!Array.isArray(results)) return;
    results.forEach(function (r) {
      if (r && r.symbol) cotacoesCache[normTicker(r.symbol)] = r;
    });
    cotacaoFetchedAt = Date.now();
  }

  function ativosUpdateStatus(msg, tone) {
    var el = document.getElementById("ativos-cotacao-status");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.remove("text-emerald-300", "text-amber-300", "text-red-300", "text-bank-muted");
    if (tone === "ok") el.classList.add("text-emerald-300");
    else if (tone === "warn") el.classList.add("text-amber-300");
    else if (tone === "err") el.classList.add("text-red-300");
    else el.classList.add("text-bank-muted");
  }

  async function ativosFetchCotacoes(showAlert) {
    var tickers = todosTickers();
    if (!tickers.length) {
      ativosUpdateStatus("Cadastre um ativo para buscar cotações.", "warn");
      return;
    }
    ativosUpdateStatus("Buscando cotações…", "warn");
    try {
      var data = await ativosApiCall({ action: "quote", symbols: tickers });
      aplicarQuotesNoCache(data);
      var hora = new Date(cotacaoFetchedAt).toLocaleString("pt-BR");
      ativosUpdateStatus(tickers.length + " ativo(s) · atualizado " + hora, "ok");
      renderAtivosUI();
    } catch (e) {
      ativosUpdateStatus(e.message || String(e), "err");
      if (showAlert) alert(e.message || String(e));
    }
  }

  function ativosStopCotacaoInterval() {
    if (cotacaoIntervalId) {
      clearInterval(cotacaoIntervalId);
      cotacaoIntervalId = null;
    }
  }

  function ativosStartCotacaoInterval() {
    ativosStopCotacaoInterval();
    if (!ativosState.cotacaoAuto) return;
    cotacaoIntervalId = setInterval(function () {
      ativosFetchCotacoes(false);
    }, COTACAO_INTERVAL_MS);
  }

  function qtyNaDataEx(p, dataEx) {
    if (!p || !Array.isArray(p.compras) || !dataEx) return 0;
    var qty = 0;
    p.compras.forEach(function (c) {
      var d = String(c.data || "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d <= dataEx) {
        var q = Number(c.qty);
        if (Number.isFinite(q) && q > 0) qty += q;
      }
    });
    return qty;
  }

  function proventoJaRegistrado(chave) {
    return ativosState.proventos.some(function (pr) {
      return pr.brapiKey === chave;
    });
  }

  function parseDividendosAcoes(apiData, symbols) {
    var out = [];
    var results = apiData && apiData.data && apiData.data.results;
    if (!Array.isArray(results)) return out;
    results.forEach(function (block) {
      var ticker = normTicker(block.symbol || block.requestedSymbol);
      if (!ticker) return;
      var p = posicaoPorTicker(ticker);
      if (!p) return;
      var cash = block.data && block.data.cashDividends;
      if (!Array.isArray(cash)) return;
      cash.forEach(function (ev, idx) {
        var payment = String(ev.paymentDate || "").slice(0, 10);
        var exDate = String(ev.lastDatePrior || payment).slice(0, 10);
        var rate = Number(ev.rate);
        if (!payment || !Number.isFinite(rate) || rate <= 0) return;
        var qty = qtyNaDataEx(p, exDate);
        if (qty <= 0) return;
        var brapiKey = ticker + "|" + payment + "|" + rate + "|" + (ev.label || "DIV");
        if (proventoJaRegistrado(brapiKey)) return;
        out.push({
          id: uid(),
          brapiKey: brapiKey,
          ticker: ticker,
          classe: p.classe || inferirClasse(ticker),
          data: payment,
          dataEx: exDate,
          tipo: String(ev.label || "DIVIDENDO"),
          rate: rate,
          qty: qty,
          valor: rate * qty,
        });
      });
    });
    return out;
  }

  function parseDividendosFii(apiData) {
    var out = [];
    var list = apiData && apiData.data && apiData.data.dividends;
    if (!Array.isArray(list)) return out;
    list.forEach(function (ev) {
      var ticker = normTicker(ev.symbol);
      if (!ticker) return;
      var p = posicaoPorTicker(ticker);
      if (!p) return;
      var payment = String(ev.paymentDate || "").slice(0, 10);
      var exDate = String(ev.lastDatePrior || payment).slice(0, 10);
      var rate = Number(ev.rate);
      if (!payment || !Number.isFinite(rate) || rate <= 0) return;
      var qty = qtyNaDataEx(p, exDate);
      if (qty <= 0) return;
      var brapiKey = ticker + "|" + payment + "|" + rate + "|FII";
      if (proventoJaRegistrado(brapiKey)) return;
      out.push({
        id: uid(),
        brapiKey: brapiKey,
        ticker: ticker,
        classe: "fii",
        data: payment,
        dataEx: exDate,
        tipo: String(ev.label || "RENDIMENTO"),
        rate: rate,
        qty: qty,
        valor: rate * qty,
      });
    });
    return out;
  }

  async function ativosSincronizarProventos() {
    var acoes = tickersPorClasse("acao").concat(tickersPorClasse("etf")).map(function (p) {
      return normTicker(p.ticker);
    });
    var fiis = tickersPorClasse("fii").map(function (p) {
      return normTicker(p.ticker);
    });
    acoes = acoes.filter(function (t, i, a) {
      return a.indexOf(t) === i;
    });
    fiis = fiis.filter(function (t, i, a) {
      return a.indexOf(t) === i;
    });

    if (!acoes.length && !fiis.length) {
      alert("Cadastre ações ou FIIs antes de sincronizar proventos.");
      return;
    }

    ativosUpdateStatus("Sincronizando proventos…", "warn");
    var pendentes = [];
    var startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    var startStr = startDate.toISOString().slice(0, 10);

    try {
      if (acoes.length) {
        var da = await ativosApiCall({
          action: "dividends_acoes",
          symbols: acoes,
          startDate: startStr,
        });
        pendentes = pendentes.concat(parseDividendosAcoes(da, acoes));
      }
      if (fiis.length) {
        try {
          var df = await ativosApiCall({
            action: "dividends_fii",
            symbols: fiis,
            startDate: startStr,
          });
          pendentes = pendentes.concat(parseDividendosFii(df));
        } catch (fiiErr) {
          console.warn("FIIs proventos:", fiiErr);
          if (!acoes.length) throw fiiErr;
        }
      }
      ativosState.proventosPendentes = pendentes;
      ativosSave();
      ativosUpdateStatus(
        pendentes.length
          ? pendentes.length + " provento(s) novo(s) — confirme abaixo."
          : "Nenhum provento novo encontrado.",
        pendentes.length ? "ok" : "warn"
      );
      renderAtivosUI();
    } catch (e) {
      ativosUpdateStatus(e.message || String(e), "err");
      alert(e.message || String(e));
    }
  }

  function confirmarProventoPendente(id) {
    var pend = ativosState.proventosPendentes.find(function (x) {
      return x.id === id;
    });
    if (!pend) return;
    ativosState.proventos.push({
      id: uid(),
      brapiKey: pend.brapiKey,
      ticker: pend.ticker,
      data: pend.data,
      tipo: pend.tipo,
      valor: pend.valor,
      qty: pend.qty,
      reinvestido: false,
    });
    ativosState.proventosPendentes = ativosState.proventosPendentes.filter(function (x) {
      return x.id !== id;
    });

    if (ativosState.reinvestirAuto) {
      reinvestirProvento(pend);
    }
    ativosSave();
    renderAtivosUI();
  }

  function confirmarTodosProventosPendentes() {
    var copy = ativosState.proventosPendentes.slice();
    copy.forEach(function (pend) {
      ativosState.proventos.push({
        id: uid(),
        brapiKey: pend.brapiKey,
        ticker: pend.ticker,
        data: pend.data,
        tipo: pend.tipo,
        valor: pend.valor,
        qty: pend.qty,
        reinvestido: false,
      });
      if (ativosState.reinvestirAuto) reinvestirProvento(pend);
    });
    ativosState.proventosPendentes = [];
    ativosSave();
    renderAtivosUI();
  }

  function reinvestirProvento(pend) {
    var p = posicaoPorTicker(pend.ticker);
    if (!p) return;
    var preco = precoAtualTicker(pend.ticker);
    if (!Number.isFinite(preco) || preco <= 0) preco = Number(pend.rate) || NaN;
    if (!Number.isFinite(preco) || preco <= 0) return;
    var valor = Number(pend.valor);
    if (!Number.isFinite(valor) || valor <= 0) return;
    var qty = valor / preco;
    p.compras.push({
      id: uid(),
      data: pend.data,
      investido: valor,
      preco: preco,
      qty: qty,
      origem: "provento",
    });
    var pr = ativosState.proventos.find(function (x) {
      return x.brapiKey === pend.brapiKey;
    });
    if (pr) pr.reinvestido = true;
  }

  function renderResumoClasses() {
    var tbody = document.getElementById("ativos-tbody-classes");
    if (!tbody) return;
    var totalPat = patrimonioTotalAtivos();
    var classes = [
      { id: "acao", label: "Ações", icon: "line-chart", iconClass: "bg-blue-500/15 text-blue-300" },
      { id: "fii", label: "FIIs", icon: "building-2", iconClass: "bg-violet-500/15 text-violet-300" },
      { id: "etf", label: "ETFs", icon: "bar-chart-3", iconClass: "bg-cyan-500/15 text-cyan-300" },
    ];
    tbody.innerHTML = "";
    classes.forEach(function (cl) {
      var r = resumoClasse(cl.id);
      var pctCarteira = totalPat > 0 && Number.isFinite(r.atual) ? (r.atual / totalPat) * 100 : 0;
      var plCls =
        Number.isFinite(r.plVal) && r.plVal >= 0 ? "text-emerald-300" : "text-red-300";
      var tr = document.createElement("tr");
      tr.className = "border-b border-bank-border/60 cursor-pointer hover:bg-white/[0.02]";
      tr.innerHTML =
        '<td class="px-4 py-3 sm:px-5"><div class="flex items-center gap-3">' +
        '<span class="flex h-9 w-9 items-center justify-center rounded-xl ' +
        cl.iconClass +
        '"><i data-lucide="' +
        cl.icon +
        '" class="h-4 w-4"></i></span>' +
        '<span class="font-semibold text-white">' +
        cl.label +
        "</span></div></td>" +
        '<td class="px-3 py-3 text-center tabular-nums text-zinc-300">' +
        r.count +
        "</td>" +
        '<td class="px-3 py-3 text-right tabular-nums font-medium text-white">' +
        formatMoney(r.atual || r.investido) +
        "</td>" +
        '<td class="px-3 py-3 text-right tabular-nums ' +
        plCls +
        '">' +
        (Number.isFinite(r.plPct) ? formatPct(r.plPct) : "—") +
        "</td>" +
        '<td class="px-3 py-3 text-right tabular-nums text-zinc-400">' +
        (totalPat > 0 ? pctCarteira.toFixed(0) + "%" : "—") +
        "</td>";
      tr.addEventListener("click", function () {
        ativosState.tickerSelecionado =
          tickersPorClasse(cl.id)[0] && tickersPorClasse(cl.id)[0].ticker
            ? tickersPorClasse(cl.id)[0].ticker
            : "";
        renderAtivosUI();
        var det = document.getElementById("ativos-bloco-detalhe");
        if (det) det.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      tbody.appendChild(tr);
    });

    var elPat = document.getElementById("ativos-patrimonio-total");
    if (elPat) elPat.textContent = formatMoney(totalPat);
  }

  function renderListaPosicoes() {
    var wrap = document.getElementById("ativos-lista-posicoes");
    if (!wrap) return;
    if (!ativosState.posicoes.length) {
      wrap.innerHTML =
        '<p class="text-sm text-bank-muted">Nenhum ativo cadastrado. Use o formulário abaixo.</p>';
      return;
    }
    wrap.innerHTML = "";
    ativosState.posicoes.forEach(function (p) {
      var t = normTicker(p.ticker);
      var sel = normTicker(ativosState.tickerSelecionado) === t;
      var pl = plPosicao(p);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition " +
        (sel
          ? "border-violet-500/50 bg-violet-500/15 text-violet-100"
          : "border-bank-border bg-bank-bg/40 text-zinc-300 hover:border-violet-500/30");
      btn.innerHTML =
        "<span><strong>" +
        t +
        "</strong> <span class=\"text-xs text-bank-muted\">" +
        classeLabel(p.classe || inferirClasse(t)) +
        "</span></span>" +
        '<span class="tabular-nums ' +
        (Number.isFinite(pl.val) && pl.val >= 0 ? "text-emerald-300" : "text-red-300") +
        '">' +
        (Number.isFinite(pl.val) ? formatMoney(pl.val) : "—") +
        "</span>";
      btn.addEventListener("click", function () {
        ativosState.tickerSelecionado = t;
        renderAtivosUI();
      });
      wrap.appendChild(btn);
    });
  }

  function renderDetalheTicker() {
    var box = document.getElementById("ativos-detalhe-conteudo");
    if (!box) return;
    var t = normTicker(ativosState.tickerSelecionado);
    var p = posicaoPorTicker(t);
    if (!p) {
      box.innerHTML = '<p class="text-sm text-bank-muted">Selecione um ativo na lista.</p>';
      return;
    }
    var pl = plPosicao(p);
    var preco = precoAtualTicker(t);
    var pm = precoMedioPosicao(p);
    var qty = qtyTotalPosicao(p);
    var q = cotacoesCache[t];
    var nome = q && q.shortName ? q.shortName : "";

    box.innerHTML =
      '<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">' +
      '<div class="rounded-xl border border-bank-border/80 bg-bank-bg/50 px-4 py-3"><p class="text-xs text-bank-muted">Preço atual</p><p class="mt-1 text-xl font-bold tabular-nums text-blue-200">' +
      (Number.isFinite(preco) ? formatMoney(preco) : "—") +
      '</p></div><div class="rounded-xl border border-bank-border/80 bg-bank-bg/50 px-4 py-3"><p class="text-xs text-bank-muted">Quantidade</p><p class="mt-1 text-xl font-bold tabular-nums">' +
      qty.toLocaleString("pt-BR", { maximumFractionDigits: 4 }) +
      '</p></div><div class="rounded-xl border border-bank-border/80 bg-bank-bg/50 px-4 py-3"><p class="text-xs text-bank-muted">Preço médio</p><p class="mt-1 text-xl font-bold tabular-nums">' +
      (Number.isFinite(pm) ? formatMoney(pm) : "—") +
      '</p></div><div class="rounded-xl border border-bank-border/80 bg-bank-bg/50 px-4 py-3"><p class="text-xs text-bank-muted">Investido</p><p class="mt-1 text-xl font-bold tabular-nums">' +
      formatMoney(investidoTotalPosicao(p)) +
      '</p></div><div class="rounded-xl border border-bank-border/80 bg-bank-bg/50 px-4 py-3"><p class="text-xs text-bank-muted">P/L</p><p class="mt-1 text-xl font-bold tabular-nums ' +
      (pl.val >= 0 ? "text-emerald-300" : "text-red-300") +
      '">' +
      (Number.isFinite(pl.val) ? formatMoney(pl.val) : "—") +
      " " +
      (Number.isFinite(pl.pct) ? '<span class="text-sm">' + formatPct(pl.pct) + "</span>" : "") +
      "</p></div></div>" +
      (nome ? '<p class="mt-2 text-xs text-bank-muted">' + nome + "</p>" : "");

    var tbody = document.getElementById("ativos-tbody-compras");
    if (!tbody) return;
    tbody.innerHTML = "";
    (p.compras || []).slice().reverse().forEach(function (c) {
      var tr = document.createElement("tr");
      tr.className = "border-b border-bank-border/50";
      tr.innerHTML =
        '<td class="px-3 py-2 tabular-nums text-zinc-300">' +
        (c.data || "—") +
        "</td>" +
        '<td class="px-3 py-2 text-right tabular-nums">' +
        formatMoney(c.investido) +
        "</td>" +
        '<td class="px-3 py-2 text-right tabular-nums">' +
        formatMoney(c.preco) +
        "</td>" +
        '<td class="px-3 py-2 text-right tabular-nums">' +
        Number(c.qty).toLocaleString("pt-BR", { maximumFractionDigits: 4 }) +
        "</td>" +
        '<td class="px-3 py-2 text-right text-xs text-bank-muted">' +
        (c.origem === "provento" ? "Provento" : "Compra") +
        '</td><td class="px-3 py-2 text-right"><button type="button" class="text-red-400 hover:text-red-300" data-del-compra="' +
        c.id +
        '"><i data-lucide="trash-2" class="h-3.5 w-3.5"></i></button></td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll("[data-del-compra]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cid = btn.getAttribute("data-del-compra");
        p.compras = (p.compras || []).filter(function (x) {
          return x.id !== cid;
        });
        if (!p.compras.length) {
          ativosState.posicoes = ativosState.posicoes.filter(function (x) {
            return normTicker(x.ticker) !== t;
          });
          ativosState.tickerSelecionado = "";
        }
        ativosSave();
        renderAtivosUI();
        ativosFetchCotacoes(false);
      });
    });
  }

  function renderProventosPendentes() {
    var wrap = document.getElementById("ativos-proventos-pendentes");
    if (!wrap) return;
    if (!ativosState.proventosPendentes.length) {
      wrap.innerHTML = "";
      wrap.classList.add("hidden");
      return;
    }
    wrap.classList.remove("hidden");
    wrap.innerHTML =
      '<div class="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4">' +
      '<div class="flex flex-wrap items-center justify-between gap-2">' +
      '<p class="text-sm font-semibold text-cyan-200">' +
      ativosState.proventosPendentes.length +
      " provento(s) detectado(s)</p>" +
      '<button type="button" id="ativos-btn-confirmar-todos" class="rounded-lg bg-emerald-600/80 px-3 py-1.5 text-xs font-semibold text-white">Confirmar todos</button></div>' +
      '<ul class="mt-3 space-y-2" id="ativos-lista-pendentes"></ul></div>';
    var ul = document.getElementById("ativos-lista-pendentes");
    ativosState.proventosPendentes.forEach(function (pend) {
      var li = document.createElement("li");
      li.className =
        "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-bank-border/60 bg-bank-bg/40 px-3 py-2 text-sm";
      li.innerHTML =
        "<span><strong>" +
        pend.ticker +
        "</strong> · " +
        pend.data +
        " · " +
        pend.tipo +
        " · <span class=\"tabular-nums text-cyan-200\">" +
        formatMoney(pend.valor) +
        "</span></span>" +
        '<button type="button" class="rounded-lg border border-emerald-500/40 px-2 py-1 text-xs text-emerald-200" data-conf-pend="' +
        pend.id +
        '">Confirmar</button>';
      ul.appendChild(li);
    });
    ul.querySelectorAll("[data-conf-pend]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        confirmarProventoPendente(btn.getAttribute("data-conf-pend"));
      });
    });
    var btnAll = document.getElementById("ativos-btn-confirmar-todos");
    if (btnAll) btnAll.addEventListener("click", confirmarTodosProventosPendentes);
  }

  function renderHistoricoProventos() {
    var tbody = document.getElementById("ativos-tbody-proventos");
    if (!tbody) return;
    tbody.innerHTML = "";
    var list = (ativosState.proventos || []).slice().reverse();
    if (!list.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="px-4 py-4 text-sm text-bank-muted">Nenhum provento confirmado. Use «Sincronizar proventos».</td></tr>';
      return;
    }
    list.forEach(function (pr) {
      var tr = document.createElement("tr");
      tr.className = "border-b border-bank-border/50";
      tr.innerHTML =
        '<td class="px-3 py-2 tabular-nums">' +
        pr.data +
        "</td>" +
        '<td class="px-3 py-2 font-medium">' +
        pr.ticker +
        "</td>" +
        '<td class="px-3 py-2 text-bank-muted">' +
        (pr.tipo || "—") +
        "</td>" +
        '<td class="px-3 py-2 text-right tabular-nums text-cyan-200">' +
        formatMoney(pr.valor) +
        "</td>" +
        '<td class="px-3 py-2 text-center text-xs">' +
        (pr.reinvestido
          ? '<span class="text-emerald-300">Sim</span>'
          : '<span class="text-zinc-500">Não</span>') +
        "</td>";
      tbody.appendChild(tr);
    });
  }

  function renderAtivosUI() {
    renderResumoClasses();
    renderListaPosicoes();
    renderDetalheTicker();
    renderProventosPendentes();
    renderHistoricoProventos();
    if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
  }

  function registrarCompra(form) {
    var ticker = normTicker(form.ticker.value);
    var data = String(form.data.value || "").trim();
    var investido = parseNum(form.investido.value);
    var preco = parseNum(form.preco.value);
    if (!ticker || !/^[A-Z]{4}\d{1,2}$/.test(ticker)) {
      alert("Ticker inválido (ex.: PETR4, MXRF11).");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      alert("Informe a data da compra.");
      return;
    }
    if (!Number.isFinite(investido) || investido <= 0) {
      alert("Informe o valor investido.");
      return;
    }
    if (!Number.isFinite(preco) || preco <= 0) {
      alert("Informe o preço na compra.");
      return;
    }
    var qty = investido / preco;
    var p = posicaoPorTicker(ticker);
    if (!p) {
      p = {
        id: uid(),
        ticker: ticker,
        classe: form.classe.value || inferirClasse(ticker),
        compras: [],
      };
      ativosState.posicoes.push(p);
    }
    p.compras.push({
      id: uid(),
      data: data,
      investido: investido,
      preco: preco,
      qty: qty,
    });
    ativosState.tickerSelecionado = ticker;
    ativosSave();
    form.investido.value = "";
    form.preco.value = "";
    renderAtivosUI();
    ativosFetchCotacoes(false);
  }

  function wireAtivosForm() {
    var form = document.getElementById("form-ativos-compra");
    if (form && !form._wired) {
      form._wired = true;
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        registrarCompra(form);
      });
    }
    var btnCot = document.getElementById("ativos-btn-atualizar");
    if (btnCot && !btnCot._wired) {
      btnCot._wired = true;
      btnCot.addEventListener("click", function () {
        ativosFetchCotacoes(true);
      });
    }
    var btnProv = document.getElementById("ativos-btn-sync-proventos");
    if (btnProv && !btnProv._wired) {
      btnProv._wired = true;
      btnProv.addEventListener("click", ativosSincronizarProventos);
    }
    var chkAuto = document.getElementById("ativos-cotacao-auto");
    if (chkAuto && !chkAuto._wired) {
      chkAuto._wired = true;
      chkAuto.checked = !!ativosState.cotacaoAuto;
      chkAuto.addEventListener("change", function () {
        ativosState.cotacaoAuto = chkAuto.checked;
        ativosSave();
        ativosStopCotacaoInterval();
        if (ativosState.cotacaoAuto) {
          ativosFetchCotacoes(false).then(function () {
            ativosStartCotacaoInterval();
          });
        }
      });
    }
    var chkReinv = document.getElementById("ativos-reinvestir-auto");
    if (chkReinv && !chkReinv._wired) {
      chkReinv._wired = true;
      chkReinv.checked = !!ativosState.reinvestirAuto;
      chkReinv.addEventListener("change", function () {
        ativosState.reinvestirAuto = chkReinv.checked;
        ativosSave();
      });
    }
    var dataIn = document.getElementById("ativos-add-data");
    if (dataIn && !dataIn.value) dataIn.value = new Date().toISOString().slice(0, 10);
  }

  function gfpInitAtivos() {
    ativosLoad();
    wireAtivosForm();
    renderAtivosUI();
    if (ativosState.cotacaoAuto && todosTickers().length) {
      ativosFetchCotacoes(false).then(function () {
        var p = document.getElementById("panel-ativos");
        if (p && !p.classList.contains("hidden")) ativosStartCotacaoInterval();
      });
    } else {
      ativosUpdateStatus(
        ativosState.cotacaoAuto
          ? "Cadastre um ativo e clique em «Atualizar cotações»."
          : "Ative «Atualizar automaticamente» ou clique em «Atualizar cotações».",
        "warn"
      );
    }
  }

  function gfpAtivosOnTabOpen() {
    renderAtivosUI();
    ativosStopCotacaoInterval();
    if (ativosState.cotacaoAuto && todosTickers().length) {
      ativosFetchCotacoes(false);
      ativosStartCotacaoInterval();
    }
  }

  window.gfpInitAtivos = gfpInitAtivos;
  window.gfpRenderAtivosUI = renderAtivosUI;
  window.gfpAtivosOnTabOpen = gfpAtivosOnTabOpen;
  window.gfpAtivosStopInterval = ativosStopCotacaoInterval;
})();
