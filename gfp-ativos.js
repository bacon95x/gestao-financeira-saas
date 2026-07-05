(function () {
  "use strict";

  var STORAGE_ATIVOS = "gfp_ativos_v1";
  var COTACAO_INTERVAL_MS = 120000;

  var METAS_DEFAULT = { acao: 30, fii: 25, etf: 15 };

  var ativosDefaults = {
    cotacaoAuto: true,
    reinvestirAuto: false,
    tickerSelecionado: "",
    metasAlocacao: { acao: 30, fii: 25, etf: 15 },
    posicoes: [],
    proventos: [],
    proventosPendentes: [],
  };

  var ativosState = JSON.parse(JSON.stringify(ativosDefaults));
  var cotacoesCache = {};
  var cotacaoFetchedAt = 0;
  var cotacaoIntervalId = null;
  var compraEditandoId = null;
  var proventosSyncDebounce = null;
  var PROVENTOS_SYNC_MIN_MS = 30 * 60 * 1000;

  var chartAtivosRosca = null;

  var CORES_ATIVOS_CLASSE = {
    acao: "#3b82f6",
    fii: "#8b5cf6",
    etf: "#06b6d4",
  };

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

  function formatValorInput(n) {
    var v = Number(n);
    if (!Number.isFinite(v)) return "";
    return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function setInputMoeda(el, n) {
    if (!el) return;
    el.value = formatValorInput(n);
  }

  function metaClasse(classe) {
    var m = ativosState.metasAlocacao || METAS_DEFAULT;
    var v = Number(m[classe]);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }

  function normalizarMetas(raw) {
    var out = { acao: 30, fii: 25, etf: 15 };
    if (!raw || typeof raw !== "object") return out;
    ["acao", "fii", "etf"].forEach(function (k) {
      var v = Number(raw[k]);
      out[k] = Number.isFinite(v) && v >= 0 ? Math.min(100, Math.round(v)) : out[k];
    });
    return out;
  }

  function formatPct(n) {
    var v = Number(n);
    if (!Number.isFinite(v)) return "—";
    var sign = v > 0 ? "+" : "";
    return sign + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
  }

  function somaMetasAlocacao() {
    return metaClasse("acao") + metaClasse("fii") + metaClasse("etf");
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
      ativosState.ultimoProventosSyncAt = Number(o.ultimoProventosSyncAt) || 0;
      ativosState.metasAlocacao = normalizarMetas(o.metasAlocacao);
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

  function formatDataBR(iso) {
    if (!iso || typeof iso !== "string") return "—";
    var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso;
    return m[3] + "/" + m[2] + "/" + m[1];
  }

  function badgeReinvestido(sim) {
    if (sim) {
      return '<span class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Sim</span>';
    }
    return '<span class="rounded-full bg-zinc-700/50 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">Não</span>';
  }

  function calcReinvestPreview(ticker, valorRaw, dataIso) {
    var tickerNorm = normTicker(ticker);
    var valor = parseNum(valorRaw);
    if (!tickerNorm || !Number.isFinite(valor) || valor <= 0) return "";
    var preco = precoAtualTicker(tickerNorm);
    if (!Number.isFinite(preco) || preco <= 0) {
      return "Atualize as cotações para calcular as cotas.";
    }
    var cotas = Math.floor(valor / preco);
    if (cotas < 1) {
      return "Valor insuficiente para 1 cota a " + formatMoney(preco) + ".";
    }
    return (
      "→ cria compra de <strong class=\"text-emerald-300\">" +
      cotas +
      " cotas</strong> a " +
      formatMoney(preco) +
      " em " +
      formatDataBR(dataIso)
    );
  }

  function updateReinvestPreview() {
    var el = document.getElementById("ativos-prov-reinvest-preview");
    var chk = document.getElementById("ativos-prov-reinvestir");
    if (!el) return;
    if (chk && !chk.checked) {
      el.innerHTML = "";
      return;
    }
    var tickerIn = document.getElementById("ativos-prov-ticker");
    var valorIn = document.getElementById("ativos-prov-valor");
    var dataIn = document.getElementById("ativos-prov-data");
    el.innerHTML = calcReinvestPreview(
      tickerIn ? tickerIn.value : "",
      valorIn ? valorIn.value : "",
      dataIn ? dataIn.value : ""
    );
  }

  function renderProventosDatalist() {
    var dl = document.getElementById("ativos-tickers-datalist");
    if (!dl) return;
    dl.innerHTML = "";
    todosTickers().forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t;
      dl.appendChild(opt);
    });
  }

  function renderResumoProventosAnual() {
    var totalEl = document.getElementById("ativos-prov-resumo-total");
    var anoEl = document.getElementById("ativos-prov-resumo-ano");
    var breakdownEl = document.getElementById("ativos-prov-resumo-breakdown");
    if (!totalEl) return;

    var ano = new Date().getFullYear();
    var porClasse = { fii: 0, acao: 0, etf: 0 };
    var total = 0;

    (ativosState.proventos || []).forEach(function (pr) {
      if (!pr.data || String(pr.data).slice(0, 4) !== String(ano)) return;
      var v = Number(pr.valor);
      if (!Number.isFinite(v)) return;
      total += v;
      var pos = posicaoPorTicker(pr.ticker);
      var cl = pos ? pos.classe : inferirClasse(pr.ticker);
      if (porClasse[cl] != null) porClasse[cl] += v;
    });

    totalEl.textContent = formatMoney(total);
    if (anoEl) anoEl.textContent = "proventos recebidos em " + ano;

    if (!breakdownEl) return;
    var rows = [];
    if (porClasse.fii > 0) rows.push({ label: "FIIs", val: porClasse.fii });
    if (porClasse.acao > 0) rows.push({ label: "Ações", val: porClasse.acao });
    if (porClasse.etf > 0) rows.push({ label: "ETFs", val: porClasse.etf });
    if (!rows.length) {
      breakdownEl.innerHTML = '<p class="text-xs text-bank-muted">Sem proventos neste ano.</p>';
      return;
    }
    breakdownEl.innerHTML = rows
      .map(function (r) {
        return (
          '<div class="flex items-center justify-between text-zinc-300">' +
          "<span>" +
          r.label +
          '</span><span class="tabular-nums text-zinc-200">' +
          formatMoney(r.val) +
          "</span></div>"
        );
      })
      .join("");
  }

  function dataPrimeiraCompraAtivos() {
    var min = null;
    ativosState.posicoes.forEach(function (p) {
      (p.compras || []).forEach(function (c) {
        var d = String(c.data || "").trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(d) && (!min || d < min)) min = d;
      });
    });
    return min;
  }

  function dataInicioProventosSync() {
    var min = dataPrimeiraCompraAtivos();
    if (min) return min;
    var d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.toISOString().slice(0, 10);
  }

  function registrarProventoConfirmado(pend) {
    if (proventoJaRegistrado(pend.brapiKey)) return false;
    var pr = {
      id: uid(),
      brapiKey: pend.brapiKey,
      ticker: pend.ticker,
      data: pend.data,
      tipo: pend.tipo,
      valor: pend.valor,
      qty: pend.qty,
      reinvestido: false,
      cotasReinvestidas: null,
    };
    ativosState.proventos.push(pr);
    if (ativosState.reinvestirAuto) reinvestirProvento(pr);
    return true;
  }

  function aplicarProventosPendentes(lista) {
    var n = 0;
    (lista || []).forEach(function (pend) {
      if (registrarProventoConfirmado(pend)) n++;
    });
    return n;
  }

  function ativosAgendarSyncProventos() {
    if (!todosTickers().length) return;
    if (proventosSyncDebounce) clearTimeout(proventosSyncDebounce);
    proventosSyncDebounce = setTimeout(function () {
      var ultimo = Number(ativosState.ultimoProventosSyncAt) || 0;
      if (Date.now() - ultimo < PROVENTOS_SYNC_MIN_MS) return;
      ativosSincronizarProventos({ silencioso: true, autoConfirmar: true });
    }, 2000);
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

  async function ativosSincronizarProventos(opts) {
    opts = opts || {};
    var silencioso = !!opts.silencioso;
    var autoConfirmar = opts.autoConfirmar !== false;
    var forcar = !!opts.forcar;

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
      if (!silencioso) alert("Cadastre ações ou FIIs antes de sincronizar proventos.");
      return;
    }

    if (!forcar) {
      var ultimo = Number(ativosState.ultimoProventosSyncAt) || 0;
      if (Date.now() - ultimo < PROVENTOS_SYNC_MIN_MS) return;
    }

    if (!silencioso) ativosUpdateStatus("Sincronizando proventos…", "warn");
    var pendentes = [];
    var startStr = dataInicioProventosSync();

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

      ativosState.ultimoProventosSyncAt = Date.now();

      if (pendentes.length && autoConfirmar) {
        var importados = aplicarProventosPendentes(pendentes);
        ativosState.proventosPendentes = [];
        ativosSave();
        var msg =
          importados > 0
            ? importados + " provento(s) importado(s) automaticamente."
            : "Nenhum provento novo encontrado.";
        if (!silencioso) ativosUpdateStatus(msg, importados > 0 ? "ok" : "warn");
        renderAtivosUI();
        return;
      }

      ativosState.proventosPendentes = pendentes;
      ativosSave();
      if (!silencioso) {
        ativosUpdateStatus(
          pendentes.length
            ? pendentes.length + " provento(s) novo(s) — confirme abaixo."
            : "Nenhum provento novo encontrado.",
          pendentes.length ? "ok" : "warn"
        );
      }
      renderAtivosUI();
    } catch (e) {
      if (!silencioso) {
        ativosUpdateStatus(e.message || String(e), "err");
        alert(e.message || String(e));
      } else {
        console.warn("Sync proventos:", e);
      }
    }
  }

  function confirmarProventoPendente(id) {
    var pend = ativosState.proventosPendentes.find(function (x) {
      return x.id === id;
    });
    if (!pend) return;
    registrarProventoConfirmado(pend);
    ativosState.proventosPendentes = ativosState.proventosPendentes.filter(function (x) {
      return x.id !== id;
    });
    ativosSave();
    renderAtivosUI();
  }

  function confirmarTodosProventosPendentes() {
    aplicarProventosPendentes(ativosState.proventosPendentes.slice());
    ativosState.proventosPendentes = [];
    ativosSave();
    renderAtivosUI();
  }

  function reinvestirProvento(pend) {
    var p = posicaoPorTicker(pend.ticker);
    if (!p) return false;
    var preco = precoAtualTicker(pend.ticker);
    if (!Number.isFinite(preco) || preco <= 0) preco = Number(pend.rate) || NaN;
    if (!Number.isFinite(preco) || preco <= 0) return false;
    var valor = Number(pend.valor);
    if (!Number.isFinite(valor) || valor <= 0) return false;
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
      return (pend.id && x.id === pend.id) || (pend.brapiKey && x.brapiKey === pend.brapiKey);
    });
    if (pr) {
      pr.reinvestido = true;
      pr.cotasReinvestidas = qty;
    }
    return true;
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
      var meta = metaClasse(cl.id);
      var plCls =
        Number.isFinite(r.plVal) && r.plVal >= 0 ? "text-emerald-300" : "text-red-300";
      var pctMetaCls = "text-zinc-400";
      if (totalPat > 0 && meta > 0) {
        if (pctCarteira > meta + 2) pctMetaCls = "text-amber-300";
        else if (pctCarteira < meta - 2 && r.count > 0) pctMetaCls = "text-cyan-300";
      }
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
        '<td class="px-3 py-3 text-right tabular-nums ' +
        pctMetaCls +
        '">' +
        (totalPat > 0 ? pctCarteira.toFixed(0) + "%" : "—") +
        ' <span class="text-zinc-600">/ ' +
        meta +
        "%</span></td>";
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
    renderAtivosRoscaAlocacao();
  }

  function renderAtivosRoscaLegenda(labels, data, cores, totalPat) {
    var leg = document.getElementById("ativos-rosca-legenda");
    if (!leg) return;
    if (!labels.length) {
      leg.innerHTML = "";
      return;
    }
    leg.innerHTML = labels
      .map(function (label, i) {
        var pct = totalPat > 0 ? ((data[i] / totalPat) * 100).toFixed(0) : "0";
        return (
          '<span class="inline-flex items-center gap-1.5 text-zinc-400">' +
          '<span class="h-2 w-2 shrink-0 rounded-full" style="background:' +
          cores[i] +
          '"></span>' +
          label +
          ' <span class="tabular-nums text-zinc-500">' +
          pct +
          "%</span></span>"
        );
      })
      .join("");
  }

  function renderAtivosRoscaAlocacao() {
    var canvas = document.getElementById("chart-ativos-rosca");
    var emptyEl = document.getElementById("chart-ativos-rosca-empty");
    var wrapAll = document.getElementById("ativos-rosca-wrap");
    var centroEl = document.getElementById("ativos-rosca-centro-valor");
    if (!canvas || !emptyEl) return;

    var classes = [
      { id: "acao", label: "Ações" },
      { id: "fii", label: "FIIs" },
      { id: "etf", label: "ETFs" },
    ];
    var labels = [];
    var data = [];
    var cores = [];
    var totalPat = patrimonioTotalAtivos();

    classes.forEach(function (cl) {
      var r = resumoClasse(cl.id);
      var val = Number.isFinite(r.atual) && r.atual > 0 ? r.atual : r.investido;
      if (!Number.isFinite(val) || val <= 0) return;
      labels.push(cl.label);
      data.push(val);
      cores.push(CORES_ATIVOS_CLASSE[cl.id]);
    });

    if (centroEl) centroEl.textContent = totalPat > 0 ? formatMoney(totalPat) : "—";

    if (!labels.length || totalPat <= 0) {
      if (wrapAll) wrapAll.classList.add("hidden");
      emptyEl.classList.remove("hidden");
      renderAtivosRoscaLegenda([], [], [], 0);
      if (chartAtivosRosca) {
        chartAtivosRosca.destroy();
        chartAtivosRosca = null;
      }
      return;
    }

    if (wrapAll) wrapAll.classList.remove("hidden");
    emptyEl.classList.add("hidden");
    renderAtivosRoscaLegenda(labels, data, cores, totalPat);

    if (typeof Chart === "undefined") return;

    var light = document.documentElement.getAttribute("data-appearance") === "light";
    var pieBorder = light ? "#fafafa" : "#0c0c10";
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (chartAtivosRosca) chartAtivosRosca.destroy();

    chartAtivosRosca = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: cores,
            borderColor: pieBorder,
            borderWidth: 2,
            hoverOffset: 6,
            spacing: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        devicePixelRatio: dpr,
        cutout: "68%",
        layout: { padding: 2 },
        animation: { duration: 350 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: light ? "rgba(255,255,255,0.96)" : "rgba(18,18,26,0.96)",
            titleColor: light ? "#18181b" : "#fafafa",
            bodyColor: light ? "#52525b" : "#d4d4d8",
            borderColor: light ? "#e4e4e7" : "#27272a",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: function (ctx) {
                var v = ctx.raw;
                var sum = ctx.dataset.data.reduce(function (a, b) {
                  return a + b;
                }, 0);
                var pct = sum ? ((v / sum) * 100).toFixed(1) : 0;
                return " " + formatMoney(v) + " (" + pct + "%)";
              },
            },
          },
        },
      },
    });
  }

  function renderMetasAlocacao() {
    var wrap = document.getElementById("ativos-metas-wrap");
    var elSoma = document.getElementById("ativos-metas-soma");
    if (!wrap) return;

    var classes = [
      { id: "acao", label: "Ações", bar: "bg-blue-500/70" },
      { id: "fii", label: "FIIs", bar: "bg-violet-500/70" },
      { id: "etf", label: "ETFs", bar: "bg-cyan-500/70" },
    ];
    var totalPat = patrimonioTotalAtivos();
    wrap.innerHTML = "";

    classes.forEach(function (cl) {
      var r = resumoClasse(cl.id);
      var meta = metaClasse(cl.id);
      var atualPct = totalPat > 0 && Number.isFinite(r.atual) ? (r.atual / totalPat) * 100 : 0;
      var barW = Math.min(100, Math.max(0, atualPct));

      var row = document.createElement("div");
      row.innerHTML =
        '<div class="mb-1 flex justify-between text-xs">' +
        '<span class="text-zinc-400">' +
        cl.label +
        "</span>" +
        '<span class="tabular-nums text-zinc-300">' +
        (totalPat > 0 ? Math.round(atualPct) + "%" : "—") +
        " / " +
        '<input type="number" min="0" max="100" step="1" data-meta-classe="' +
        cl.id +
        '" class="w-9 border-0 border-b border-transparent bg-transparent p-0 text-right tabular-nums text-zinc-300 outline-none transition hover:border-zinc-600 focus:border-violet-500/70" value="' +
        meta +
        '" title="Meta %" />' +
        "%</span></div>" +
        '<div class="h-2 rounded-full bg-bank-bg">' +
        '<div class="h-2 rounded-full ' +
        cl.bar +
        '" style="width:' +
        barW.toFixed(1) +
        '%"></div></div>';
      wrap.appendChild(row);
    });

    wrap.querySelectorAll("[data-meta-classe]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var k = inp.getAttribute("data-meta-classe");
        var v = Math.round(Number(inp.value));
        if (!k) return;
        if (!Number.isFinite(v) || v < 0) v = 0;
        if (v > 100) v = 100;
        if (!ativosState.metasAlocacao) ativosState.metasAlocacao = normalizarMetas(null);
        ativosState.metasAlocacao[k] = v;
        inp.value = String(v);
        ativosSave();
        renderResumoClasses();
        renderMetasAlocacao();
      });
    });

    if (elSoma) {
      var s = somaMetasAlocacao();
      elSoma.textContent = "Metas: " + s + "%";
      elSoma.classList.toggle("text-amber-400", s > 100);
      elSoma.classList.toggle("text-zinc-500", s <= 100);
    }
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
        if (!compraEditandoId) {
          var form = document.getElementById("form-ativos-compra");
          if (form) {
            form.ticker.value = t;
            form.classe.value = p.classe || inferirClasse(t);
          }
        }
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
        '</td><td class="px-3 py-2 text-center">' +
        '<button type="button" class="mr-1 inline-flex rounded p-1 text-violet-300 hover:bg-violet-500/15" title="Editar" data-edit-compra="' +
        c.id +
        '"><i data-lucide="pencil" class="h-3.5 w-3.5"></i></button>' +
        '<button type="button" class="inline-flex rounded p-1 text-red-400 hover:bg-red-500/15" title="Excluir" data-del-compra="' +
        c.id +
        '"><i data-lucide="trash-2" class="h-3.5 w-3.5"></i></button></td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll("[data-edit-compra]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        iniciarEdicaoCompra(t, btn.getAttribute("data-edit-compra"));
      });
    });
    tbody.querySelectorAll("[data-del-compra]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
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
        if (compraEditandoId === cid) limparEdicaoCompra();
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
        '<tr><td colspan="6" class="px-4 py-6 text-sm text-bank-muted sm:px-5">Nenhum provento ainda. Registre manualmente ou use «Sincronizar proventos».</td></tr>';
      return;
    }
    list.forEach(function (pr) {
      var cotasCell = '<span class="text-zinc-600">—</span>';
      if (pr.reinvestido) {
        var q = Number(pr.cotasReinvestidas);
        if (Number.isFinite(q) && q > 0) {
          var c = Math.floor(q);
          cotasCell = c >= 1 ? '<span class="tabular-nums text-zinc-300">+' + c + "</span>" : cotasCell;
        }
      }
      var tr = document.createElement("tr");
      tr.className = "border-b border-bank-border/50";
      tr.innerHTML =
        '<td class="px-4 py-3 tabular-nums text-zinc-300 sm:px-5">' +
        formatDataBR(pr.data) +
        "</td>" +
        '<td class="px-3 py-3 font-medium text-white">' +
        pr.ticker +
        "</td>" +
        '<td class="px-3 py-3 text-zinc-400">' +
        (pr.tipo || "—") +
        "</td>" +
        '<td class="px-3 py-3 text-right tabular-nums text-cyan-200">' +
        formatMoney(pr.valor) +
        "</td>" +
        '<td class="px-3 py-3 text-center">' +
        badgeReinvestido(!!pr.reinvestido) +
        "</td>" +
        '<td class="px-3 py-3 text-right">' +
        cotasCell +
        "</td>";
      tbody.appendChild(tr);
    });
  }

  function atualizarUiFormCompra() {
    var titulo = document.getElementById("ativos-form-titulo");
    var submit = document.getElementById("ativos-form-submit");
    var cancel = document.getElementById("ativos-btn-cancelar-edicao");
    var editando = !!compraEditandoId;
    if (titulo) titulo.textContent = editando ? "Editar compra" : "Nova compra";
    if (submit) submit.textContent = editando ? "Salvar alterações" : "Registrar compra";
    if (cancel) cancel.classList.toggle("hidden", !editando);
    var tickerIn = document.getElementById("ativos-add-ticker");
    var classeSel = document.querySelector("#form-ativos-compra select[name=classe]");
    if (tickerIn) tickerIn.readOnly = editando;
    if (classeSel) classeSel.disabled = editando;
  }

  function limparEdicaoCompra(resetForm) {
    compraEditandoId = null;
    atualizarUiFormCompra();
    if (resetForm !== false) {
      var form = document.getElementById("form-ativos-compra");
      if (form) {
        form.investido.value = "";
        form.preco.value = "";
        var tickerIn = document.getElementById("ativos-add-ticker");
        if (tickerIn) tickerIn.readOnly = false;
        var classeSel = form.classe;
        if (classeSel) classeSel.disabled = false;
      }
    }
  }

  function iniciarEdicaoCompra(ticker, compraId) {
    var t = normTicker(ticker);
    var p = posicaoPorTicker(t);
    if (!p) return;
    var c = (p.compras || []).find(function (x) {
      return x.id === compraId;
    });
    if (!c) return;

    compraEditandoId = compraId;
    ativosState.tickerSelecionado = t;

    var form = document.getElementById("form-ativos-compra");
    if (form) {
      form.data.value = c.data || "";
      form.ticker.value = t;
      form.classe.value = p.classe || inferirClasse(t);
      setInputMoeda(form.investido, c.investido);
      setInputMoeda(form.preco, c.preco);
    }
    atualizarUiFormCompra();
    renderDetalheTicker();

    var bloco = document.getElementById("form-ativos-compra");
    if (bloco && bloco.closest(".rounded-2xl"))
      bloco.closest(".rounded-2xl").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderAtivosUI() {
    renderResumoClasses();
    renderMetasAlocacao();
    renderListaPosicoes();
    renderDetalheTicker();
    renderProventosDatalist();
    renderResumoProventosAnual();
    renderProventosPendentes();
    renderHistoricoProventos();
    updateReinvestPreview();
    if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
  }

  function salvarCompraForm(form) {
    var ticker = normTicker(form.ticker.value);
    var data = String(form.data.value || "").trim();
    var investido = parseNum(form.investido.value);
    var preco = parseNum(form.preco.value);
    if (!ticker || !/^[A-Z]{4}\d{1,2}$/.test(ticker)) {
      alert("Ticker inválido (ex.: PETR4, MXRF11).");
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      alert("Informe a data da compra.");
      return false;
    }
    if (!Number.isFinite(investido) || investido <= 0) {
      alert("Informe o valor investido.");
      return false;
    }
    if (!Number.isFinite(preco) || preco <= 0) {
      alert("Informe o preço na compra.");
      return false;
    }
    var qty = investido / preco;

    if (compraEditandoId) {
      var pEdit = null;
      var cEdit = null;
      ativosState.posicoes.forEach(function (pos) {
        (pos.compras || []).forEach(function (cx) {
          if (cx.id === compraEditandoId) {
            pEdit = pos;
            cEdit = cx;
          }
        });
      });
      if (!cEdit || !pEdit) {
        alert("Compra não encontrada.");
        limparEdicaoCompra();
        return false;
      }
      cEdit.data = data;
      cEdit.investido = investido;
      cEdit.preco = preco;
      cEdit.qty = qty;
      pEdit.classe = form.classe.value || inferirClasse(ticker);
      ativosState.tickerSelecionado = normTicker(pEdit.ticker);
      limparEdicaoCompra();
    } else {
      var p = posicaoPorTicker(ticker);
      if (!p) {
        p = {
          id: uid(),
          ticker: ticker,
          classe: form.classe.value || inferirClasse(ticker),
          compras: [],
        };
        ativosState.posicoes.push(p);
      } else {
        p.classe = form.classe.value || inferirClasse(ticker);
      }
      p.compras.push({
        id: uid(),
        data: data,
        investido: investido,
        preco: preco,
        qty: qty,
      });
      ativosState.tickerSelecionado = ticker;
      form.investido.value = "";
      form.preco.value = "";
    }

    ativosSave();
    renderAtivosUI();
    ativosFetchCotacoes(false);
    ativosAgendarSyncProventos();
    return true;
  }

  function salvarProventoManual(form) {
    var ticker = normTicker(form.ticker.value);
    var data = String(form.data.value || "").trim();
    var valor = parseNum(form.valor.value);
    var tipo = String(form.tipo.value || "Outro").trim();
    if (!ticker || !/^[A-Z]{4}\d{1,2}$/.test(ticker)) {
      alert("Ticker inválido (ex.: PETR4, MXRF11).");
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      alert("Informe a data de crédito.");
      return false;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      alert("Informe o valor do provento.");
      return false;
    }
    var brapiKey = "manual-" + ticker + "-" + data + "-" + valor.toFixed(2);
    if (proventoJaRegistrado(brapiKey)) {
      alert("Este provento já está registrado.");
      return false;
    }
    var chkReinvEl = document.getElementById("ativos-prov-reinvestir");
    var reinvestir = !!(chkReinvEl && chkReinvEl.checked);
    var pr = {
      id: uid(),
      brapiKey: brapiKey,
      ticker: ticker,
      data: data,
      tipo: tipo,
      valor: valor,
      reinvestido: false,
      cotasReinvestidas: null,
    };
    ativosState.proventos.push(pr);
    if (reinvestir) {
      if (!reinvestirProvento(pr)) {
        alert("Provento salvo, mas não foi possível reinvestir — cadastre uma posição em " + ticker + " e atualize as cotações.");
      }
    }
    ativosSave();
    form.valor.value = "";
    renderAtivosUI();
    ativosFetchCotacoes(false);
    return true;
  }

  function registrarCompra(form) {
    salvarCompraForm(form);
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
      btnProv.addEventListener("click", function () {
        ativosSincronizarProventos({ forcar: true, autoConfirmar: true, silencioso: false });
      });
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
    var chkReinv = document.getElementById("ativos-prov-reinvestir");
    if (chkReinv && !chkReinv._wired) {
      chkReinv._wired = true;
      chkReinv.checked = !!ativosState.reinvestirAuto;
      chkReinv.addEventListener("change", function () {
        ativosState.reinvestirAuto = chkReinv.checked;
        ativosSave();
        updateReinvestPreview();
      });
    }
    var formProv = document.getElementById("form-ativos-provento");
    if (formProv && !formProv._wired) {
      formProv._wired = true;
      formProv.addEventListener("submit", function (ev) {
        ev.preventDefault();
        salvarProventoManual(formProv);
      });
      ["input", "change"].forEach(function (evt) {
        formProv.addEventListener(evt, updateReinvestPreview);
      });
    }
    var provDataIn = document.getElementById("ativos-prov-data");
    if (provDataIn && !provDataIn.value) provDataIn.value = new Date().toISOString().slice(0, 10);

    var dataIn = document.getElementById("ativos-add-data");
    if (dataIn && !dataIn.value) dataIn.value = new Date().toISOString().slice(0, 10);

    var btnCancel = document.getElementById("ativos-btn-cancelar-edicao");
    if (btnCancel && !btnCancel._wired) {
      btnCancel._wired = true;
      btnCancel.addEventListener("click", function () {
        limparEdicaoCompra();
      });
    }

    atualizarUiFormCompra();
  }

  function gfpInitAtivos() {
    ativosLoad();
    compraEditandoId = null;
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
    ativosAgendarSyncProventos();
  }

  window.gfpInitAtivos = gfpInitAtivos;
  window.gfpRenderAtivosUI = renderAtivosUI;
  window.gfpAtivosOnTabOpen = gfpAtivosOnTabOpen;
  window.gfpAtivosStopInterval = ativosStopCotacaoInterval;
})();
