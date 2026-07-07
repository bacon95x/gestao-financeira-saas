(function () {
  "use strict";

  var STORAGE_ATIVOS = "gfp_ativos_v1";
  var COTACAO_INTERVAL_MS = 120000;

  var METAS_DEFAULT = { acao: 30, fii: 25, etf: 15, exterior: 10 };

  var TICKER_B3_RE = /^[A-Z]{4}\d{1,2}$/;
  var TICKER_EXTERIOR_RE = /^[A-Z][A-Z0-9.\-]{1,9}$/;

  var ativosDefaults = {
    cotacaoAuto: true,
    reinvestirAuto: false,
    tickerSelecionado: "",
    metasAlocacao: { acao: 30, fii: 25, etf: 15, exterior: 10 },
    posicoes: [],
    proventos: [],
    proventosPendentes: [],
  };

  var ativosState = JSON.parse(JSON.stringify(ativosDefaults));
  var cotacoesCache = {};
  var cotacaoFetchedAt = 0;
  var cotacaoIntervalId = null;
  var compraEditandoId = null;
  var vendaEditandoId = null;
  var proventosSyncDebounce = null;
  var PROVENTOS_SYNC_MIN_MS = 30 * 60 * 1000;

  var chartAtivosRosca = null;

  var CORES_ATIVOS_CLASSE = {
    acao: "#3b82f6",
    fii: "#8b5cf6",
    exterior: "#f59e0b",
  };

  function isClasseExterior(classe) {
    return classe === "exterior";
  }

  function isTickerB3(ticker) {
    return TICKER_B3_RE.test(normTicker(ticker));
  }

  function validarTickerAtivo(ticker, classe) {
    var t = normTicker(ticker);
    if (!t) return { ok: false, msg: "Informe o ticker." };
    if (isClasseExterior(classe)) {
      if (TICKER_EXTERIOR_RE.test(t)) return { ok: true };
      return {
        ok: false,
        msg: "Ticker exterior inválido (ex.: TSLA, AAPL, NVDA). Use letras e números, sem espaços.",
      };
    }
    if (TICKER_B3_RE.test(t)) return { ok: true };
    if (/^[A-Z]{2,5}$/.test(t) && !/\d/.test(t)) {
      return {
        ok: false,
        msg:
          "«" +
          t +
          "» é ticker americano. Escolha a classe «Exterior» ou use o BDR na B3 (ex.: TSLA34).",
      };
    }
    return { ok: false, msg: "Ticker B3 inválido (ex.: PETR4, MXRF11, TSLA34)." };
  }

  function tickersB3Cotacao() {
    return todosTickers().filter(function (t) {
      var p = posicaoPorTicker(t);
      var cl = p ? p.classe || inferirClasse(t) : inferirClasse(t);
      return !isClasseExterior(cl) && isTickerB3(t);
    });
  }

  function aplicarCotacaoManual(ticker, preco, nome) {
    var t = normTicker(ticker);
    if (!t || !Number.isFinite(Number(preco)) || Number(preco) <= 0) return;
    cotacoesCache[t] = {
      symbol: t,
      shortName: nome || t + " (exterior)",
      regularMarketPrice: Number(preco),
      manual: true,
    };
  }

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
    var out = { acao: 30, fii: 25, etf: 15, exterior: 10 };
    if (!raw || typeof raw !== "object") return out;
    ["acao", "fii", "etf", "exterior"].forEach(function (k) {
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
    return metaClasse("acao") + metaClasse("fii") + metaClasse("etf") + metaClasse("exterior");
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
    if (c === "exterior") return "Exterior";
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

  function rehidratarCotacoesManuais() {
    ativosState.posicoes.forEach(function (p) {
      if (!isClasseExterior(p.classe || inferirClasse(p.ticker))) return;
      if (Number.isFinite(precoManualPosicao(p))) {
        syncCotacaoManualPosicao(p);
        return;
      }
      var melhor = null;
      (p.compras || []).forEach(function (c) {
        if (!melhor || String(c.data || "") >= String(melhor.data || "")) melhor = c;
      });
      if (melhor && Number(melhor.preco) > 0) {
        p.precoManual = Number(melhor.preco);
        syncCotacaoManualPosicao(p);
      }
    });
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
      ativosState.posicoes.forEach(function (p) {
        if (!Array.isArray(p.vendas)) p.vendas = [];
      });
    } catch (e) {}
    rehidratarCotacoesManuais();
  }

  function posicaoPorTicker(ticker) {
    var t = normTicker(ticker);
    return ativosState.posicoes.find(function (p) {
      return normTicker(p.ticker) === t;
    });
  }

  function qtyComprasPosicao(p) {
    if (!p || !Array.isArray(p.compras)) return 0;
    return p.compras.reduce(function (s, c) {
      var q = Number(c.qty);
      return s + (Number.isFinite(q) && q > 0 ? q : 0);
    }, 0);
  }

  function qtyVendasPosicao(p) {
    if (!p || !Array.isArray(p.vendas)) return 0;
    return p.vendas.reduce(function (s, v) {
      var q = Number(v.qty);
      return s + (Number.isFinite(q) && q > 0 ? q : 0);
    }, 0);
  }

  function qtyTotalPosicao(p) {
    return Math.max(0, qtyComprasPosicao(p) - qtyVendasPosicao(p));
  }

  function investidoComprasPosicao(p) {
    if (!p || !Array.isArray(p.compras)) return 0;
    return p.compras.reduce(function (s, c) {
      var v = Number(c.investido);
      return s + (Number.isFinite(v) && v > 0 ? v : 0);
    }, 0);
  }

  function custoVendidoPosicao(p) {
    if (!p || !Array.isArray(p.vendas)) return 0;
    return p.vendas.reduce(function (s, v) {
      var c = Number(v.custoBase);
      return s + (Number.isFinite(c) && c > 0 ? c : 0);
    }, 0);
  }

  function investidoTotalPosicao(p) {
    return Math.max(0, investidoComprasPosicao(p) - custoVendidoPosicao(p));
  }

  function plRealizadoTotalPosicao(p) {
    if (!p || !Array.isArray(p.vendas)) return 0;
    return p.vendas.reduce(function (s, v) {
      var pl = Number(v.plRealizado);
      return s + (Number.isFinite(pl) ? pl : 0);
    }, 0);
  }

  function precoMedioPosicao(p) {
    var qty = qtyTotalPosicao(p);
    if (qty <= 0) return NaN;
    return investidoTotalPosicao(p) / qty;
  }

  function precoManualPosicao(p) {
    if (!p) return NaN;
    var v = Number(p.precoManual);
    return Number.isFinite(v) && v > 0 ? v : NaN;
  }

  function syncCotacaoManualPosicao(p) {
    if (!p || !isClasseExterior(p.classe || inferirClasse(p.ticker))) return;
    var pm = precoManualPosicao(p);
    if (Number.isFinite(pm)) aplicarCotacaoManual(p.ticker, pm);
  }

  function salvarPrecoManualExterior(ticker, raw) {
    var p = posicaoPorTicker(ticker);
    if (!p || !isClasseExterior(p.classe)) return false;
    var preco = parseNum(raw);
    if (!Number.isFinite(preco) || preco <= 0) {
      alert("Informe o preço de mercado atual.");
      return false;
    }
    p.precoManual = preco;
    syncCotacaoManualPosicao(p);
    ativosSave();
    renderAtivosUI();
    return true;
  }

  function refreshAtivosDetalheIcons() {
    var bloco = document.getElementById("ativos-bloco-detalhe");
    if (!bloco || typeof lucide === "undefined" || !lucide.createIcons) return;
    lucide.createIcons({ nodes: bloco.querySelectorAll("[data-lucide]") });
  }

  function precoAtualTicker(ticker) {
    var t = normTicker(ticker);
    var pos = posicaoPorTicker(t);
    if (pos && isClasseExterior(pos.classe || inferirClasse(t))) {
      var pm = precoManualPosicao(pos);
      if (Number.isFinite(pm)) return pm;
    }
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
      if (!r || !r.symbol) return;
      var t = normTicker(r.symbol);
      if (cotacoesCache[t] && cotacoesCache[t].manual) return;
      cotacoesCache[t] = r;
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
    var tickers = tickersB3Cotacao();
    var total = todosTickers().length;
    if (!total) {
      ativosUpdateStatus("Cadastre um ativo para buscar cotações.", "warn");
      return;
    }
    if (!tickers.length) {
      ativosUpdateStatus(
        total + " ativo(s) · exterior usa preço manual (edite a compra para atualizar).",
        "warn"
      );
      renderAtivosUI();
      return;
    }
    ativosUpdateStatus("Buscando cotações…", "warn");
    try {
      var data = await ativosApiCall({ action: "quote", symbols: tickers });
      aplicarQuotesNoCache(data);
      var hora = new Date(cotacaoFetchedAt).toLocaleString("pt-BR");
      var extra = total > tickers.length ? " · exterior manual" : "";
      ativosUpdateStatus(tickers.length + " ativo(s) B3 · atualizado " + hora + extra, "ok");
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
    if (!p || !dataEx) return 0;
    var qty = 0;
    (p.compras || []).forEach(function (c) {
      var d = String(c.data || "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d <= dataEx) {
        var q = Number(c.qty);
        if (Number.isFinite(q) && q > 0) qty += q;
      }
    });
    (p.vendas || []).forEach(function (v) {
      var d = String(v.data || "").trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d <= dataEx) {
        var q = Number(v.qty);
        if (Number.isFinite(q) && q > 0) qty -= q;
      }
    });
    return Math.max(0, qty);
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
    var porClasse = { fii: 0, acao: 0, etf: 0, exterior: 0 };
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
    if (porClasse.exterior > 0) rows.push({ label: "Exterior", val: porClasse.exterior });
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
      { id: "exterior", label: "Exterior", icon: "globe", iconClass: "bg-amber-500/15 text-amber-300" },
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
      { id: "exterior", label: "Exterior" },
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
      { id: "exterior", label: "Exterior", bar: "bg-amber-500/70" },
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
      var qty = qtyTotalPosicao(p);
      var plReal = plRealizadoTotalPosicao(p);
      var displayVal = qty > 0 ? pl.val : plReal;
      var displayCls =
        Number.isFinite(displayVal) && displayVal >= 0 ? "text-emerald-300" : "text-red-300";
      var suffix =
        qty <= 0 && plReal !== 0
          ? ' <span class="text-[10px] text-bank-muted">realizado</span>'
          : "";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "ativos-pos-btn flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm transition " +
        (sel
          ? "border-violet-500/50 bg-violet-500/15 text-violet-100"
          : "border-bank-border bg-bank-bg/40 text-zinc-300 hover:border-violet-500/30");
      btn.innerHTML =
        "<span class=\"min-w-0\"><strong>" +
        t +
        "</strong> <span class=\"text-xs text-bank-muted\">" +
        classeLabel(p.classe || inferirClasse(t)) +
        (qty <= 0 && (p.vendas || []).length ? " · encerrado" : "") +
        "</span></span>" +
        '<span class="shrink-0 tabular-nums ' +
        displayCls +
        '">' +
        (Number.isFinite(displayVal) ? formatMoney(displayVal) : "—") +
        suffix +
        "</span>";
      btn.addEventListener("click", function () {
        ativosState.tickerSelecionado = t;
        if (!compraEditandoId && !vendaEditandoId) {
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
    var plReal = plRealizadoTotalPosicao(p);
    var preco = precoAtualTicker(t);
    var pm = precoMedioPosicao(p);
    var qty = qtyTotalPosicao(p);
    var q = cotacoesCache[t];
    var nome = q && q.shortName ? q.shortName : "";
    var exterior = isClasseExterior(p.classe);
    var precoLabel = exterior ? "Preço manual" : "Preço atual";
    var precoManualVal = exterior && Number.isFinite(preco) ? formatValorInput(preco) : "";
    var plAbertoCls = pl.val >= 0 ? "text-emerald-300" : "text-red-300";
    var plRealCls = plReal >= 0 ? "text-emerald-300" : "text-red-300";

    function detCard(label, valorHtml, cardCls, labelCls) {
      return (
        '<div class="ativos-det-card rounded-xl border border-bank-border/80 bg-bank-bg/50' +
        (cardCls ? " " + cardCls : "") +
        '"><p class="text-[11px] leading-snug sm:text-xs ' +
        (labelCls || "text-bank-muted") +
        '">' +
        label +
        '</p><div class="ativos-det-valor">' +
        valorHtml +
        "</div></div>"
      );
    }

    box.innerHTML =
      '<div class="ativos-det-grid">' +
      detCard(
        precoLabel,
        Number.isFinite(preco)
          ? '<span class="text-blue-200">' + formatMoney(preco) + "</span>"
          : "—"
      ) +
      detCard(
        "Quantidade",
        qty.toLocaleString("pt-BR", { maximumFractionDigits: 4 })
      ) +
      detCard(
        "Preço médio",
        Number.isFinite(pm) ? formatMoney(pm) : "—"
      ) +
      detCard("Investido", formatMoney(investidoTotalPosicao(p))) +
      detCard(
        "P/L em aberto",
        qty > 0 && Number.isFinite(pl.val)
          ? '<span class="' +
            plAbertoCls +
            '">' +
            formatMoney(pl.val) +
            "</span>" +
            (Number.isFinite(pl.pct)
              ? '<span class="ml-1 text-[11px] font-semibold sm:text-xs ' +
                plAbertoCls +
                '">' +
                formatPct(pl.pct) +
                "</span>"
              : "")
          : "—"
      ) +
      detCard(
        "P/L realizado",
        '<span class="' + plRealCls + '">' + formatMoney(plReal) + "</span>",
        "border-amber-500/25 bg-amber-950/10",
        "text-amber-200/80"
      ) +
      "</div>" +
      (nome ? '<p class="mt-2 text-xs text-bank-muted">' + nome + "</p>" : "") +
      (exterior
        ? '<div class="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-amber-500/20 bg-amber-950/15 px-3 py-3">' +
          '<label class="flex min-w-[8rem] flex-1 flex-col gap-1">' +
          '<span class="text-xs text-amber-200/90">Atualizar preço de mercado (R$)</span>' +
          '<input id="ativos-preco-manual-input" type="text" inputmode="decimal" placeholder="0,00" value="' +
          precoManualVal +
          '" class="rounded-lg border border-bank-border bg-bank-bg px-3 py-2 text-sm tabular-nums text-white outline-none ring-amber-500/30 focus:border-amber-500/40 focus:ring-2" />' +
          "</label>" +
          '<button type="button" id="ativos-btn-salvar-preco-manual" class="rounded-lg bg-amber-600/80 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600">Atualizar P/L</button>' +
          "</div>" +
          '<p class="mt-1 text-[10px] text-bank-muted">O preço registrado na compra não muda — só o valor de mercado para calcular lucro/prejuízo.</p>'
        : "");

    var tbody = document.getElementById("ativos-tbody-compras");
    if (!tbody) return;
    tbody.innerHTML = "";
    var movs = [];
    (p.compras || []).forEach(function (c) {
      movs.push({
        kind: "compra",
        id: c.id,
        data: c.data || "",
        valor: c.investido,
        preco: c.preco,
        qty: c.qty,
        origem: c.origem === "provento" ? "Provento" : "Compra",
        pl: null,
      });
    });
    (p.vendas || []).forEach(function (v) {
      movs.push({
        kind: "venda",
        id: v.id,
        data: v.data || "",
        valor: v.recebido,
        preco: v.preco,
        qty: v.qty,
        origem: "Venda",
        pl: v.plRealizado,
      });
    });
    movs.sort(function (a, b) {
      return String(b.data).localeCompare(String(a.data));
    });
    if (!movs.length) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="px-3 py-4 text-sm text-bank-muted">Nenhuma movimentação ainda.</td></tr>';
    }
    movs.forEach(function (m) {
      var tr = document.createElement("tr");
      tr.className = "border-b border-bank-border/50";
      var plCell = "—";
      if (m.kind === "venda" && Number.isFinite(Number(m.pl))) {
        var plv = Number(m.pl);
        plCell =
          '<span class="' +
          (plv >= 0 ? "text-emerald-300" : "text-red-300") +
          '">' +
          formatMoney(plv) +
          "</span>";
      }
      var acoes =
        m.kind === "compra"
          ? '<button type="button" class="mr-1 inline-flex rounded p-1 text-violet-300 hover:bg-violet-500/15" title="Editar" data-edit-compra="' +
            m.id +
            '"><i data-lucide="pencil" class="h-3.5 w-3.5"></i></button>' +
            '<button type="button" class="inline-flex rounded p-1 text-red-400 hover:bg-red-500/15" title="Excluir" data-del-compra="' +
            m.id +
            '"><i data-lucide="trash-2" class="h-3.5 w-3.5"></i></button>'
          : '<button type="button" class="mr-1 inline-flex rounded p-1 text-amber-300 hover:bg-amber-500/15" title="Editar" data-edit-venda="' +
            m.id +
            '"><i data-lucide="pencil" class="h-3.5 w-3.5"></i></button>' +
            '<button type="button" class="inline-flex rounded p-1 text-red-400 hover:bg-red-500/15" title="Excluir" data-del-venda="' +
            m.id +
            '"><i data-lucide="trash-2" class="h-3.5 w-3.5"></i></button>';
      tr.innerHTML =
        '<td class="px-3 py-2 tabular-nums text-zinc-300">' +
        (m.data || "—") +
        "</td>" +
        '<td class="px-3 py-2 text-right tabular-nums">' +
        formatMoney(m.valor) +
        "</td>" +
        '<td class="px-3 py-2 text-right tabular-nums">' +
        formatMoney(m.preco) +
        "</td>" +
        '<td class="px-3 py-2 text-right tabular-nums">' +
        Number(m.qty).toLocaleString("pt-BR", { maximumFractionDigits: 4 }) +
        "</td>" +
        '<td class="px-3 py-2 text-right text-xs text-bank-muted">' +
        m.origem +
        '</td><td class="px-3 py-2 text-right tabular-nums text-xs">' +
        plCell +
        '</td><td class="px-3 py-2 text-center">' +
        acoes +
        "</td>";
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
        if (!(p.compras || []).length && !(p.vendas || []).length) {
          ativosState.posicoes = ativosState.posicoes.filter(function (x) {
            return normTicker(x.ticker) !== t;
          });
          ativosState.tickerSelecionado = "";
        }
        if (compraEditandoId === cid) limparEdicaoMovimento();
        ativosSave();
        renderAtivosUI();
        ativosFetchCotacoes(false);
      });
    });
    tbody.querySelectorAll("[data-edit-venda]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        iniciarEdicaoVenda(t, btn.getAttribute("data-edit-venda"));
      });
    });
    tbody.querySelectorAll("[data-del-venda]").forEach(function (btn) {
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        var vid = btn.getAttribute("data-del-venda");
        p.vendas = (p.vendas || []).filter(function (x) {
          return x.id !== vid;
        });
        if (!(p.compras || []).length && !(p.vendas || []).length) {
          ativosState.posicoes = ativosState.posicoes.filter(function (x) {
            return normTicker(x.ticker) !== t;
          });
          ativosState.tickerSelecionado = "";
        }
        if (vendaEditandoId === vid) limparEdicaoMovimento();
        ativosSave();
        renderAtivosUI();
        ativosFetchCotacoes(false);
      });
    });

    var btnPrecoManual = document.getElementById("ativos-btn-salvar-preco-manual");
    var inpPrecoManual = document.getElementById("ativos-preco-manual-input");
    if (btnPrecoManual && inpPrecoManual) {
      btnPrecoManual.addEventListener("click", function () {
        salvarPrecoManualExterior(t, inpPrecoManual.value);
      });
      inpPrecoManual.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          salvarPrecoManualExterior(t, inpPrecoManual.value);
        }
      });
    }

    refreshAtivosDetalheIcons();
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

  function tipoMovimentoForm() {
    var sel = document.getElementById("ativos-mov-tipo");
    return sel && sel.value === "venda" ? "venda" : "compra";
  }

  function atualizarCamposMovimentoForm() {
    var tipo = tipoMovimentoForm();
    var editando = !!(compraEditandoId || vendaEditandoId);
    var campInv = document.getElementById("ativos-campo-investido");
    var campPrecoC = document.getElementById("ativos-campo-preco-compra");
    var campQty = document.getElementById("ativos-campo-qty-venda");
    var campPrecoV = document.getElementById("ativos-campo-preco-venda");
    var hintDisp = document.getElementById("ativos-venda-disponivel");
    var selTipo = document.getElementById("ativos-mov-tipo");
    var isVenda = tipo === "venda";
    if (campInv) {
      campInv.classList.toggle("hidden", isVenda);
      campInv.classList.toggle("flex", !isVenda);
    }
    if (campPrecoC) {
      campPrecoC.classList.toggle("hidden", isVenda);
      campPrecoC.classList.toggle("flex", !isVenda);
    }
    if (campQty) {
      campQty.classList.toggle("hidden", !isVenda);
      campQty.classList.toggle("flex", isVenda);
    }
    if (campPrecoV) {
      campPrecoV.classList.toggle("hidden", !isVenda);
      campPrecoV.classList.toggle("flex", isVenda);
    }
    if (selTipo) selTipo.disabled = editando;
    if (hintDisp) {
      if (!isVenda) {
        hintDisp.classList.add("hidden");
        hintDisp.textContent = "";
      } else {
        var form = document.getElementById("form-ativos-compra");
        var ticker = form ? normTicker(form.ticker.value) : "";
        var pos = ticker ? posicaoPorTicker(ticker) : null;
        var disp = pos ? qtyTotalPosicao(pos) : 0;
        if (vendaEditandoId && pos) {
          var vEdit = (pos.vendas || []).find(function (x) {
            return x.id === vendaEditandoId;
          });
          if (vEdit) disp += Number(vEdit.qty) || 0;
        }
        hintDisp.textContent = ticker
          ? "Disponível para venda: " +
            disp.toLocaleString("pt-BR", { maximumFractionDigits: 4 }) +
            " cotas" +
            (disp <= 0 ? " — cadastre uma compra antes." : "")
          : "Informe o ticker para ver a quantidade disponível.";
        hintDisp.classList.remove("hidden");
      }
    }
  }

  function atualizarUiFormCompra() {
    var titulo = document.getElementById("ativos-form-titulo");
    var submit = document.getElementById("ativos-form-submit");
    var cancel = document.getElementById("ativos-btn-cancelar-edicao");
    var editandoCompra = !!compraEditandoId;
    var editandoVenda = !!vendaEditandoId;
    var tipo = editandoVenda ? "venda" : editandoCompra ? "compra" : tipoMovimentoForm();
    if (titulo) {
      if (editandoCompra) titulo.textContent = "Editar compra";
      else if (editandoVenda) titulo.textContent = "Editar venda";
      else titulo.textContent = tipo === "venda" ? "Nova venda" : "Nova compra";
    }
    if (submit) {
      if (editandoCompra || editandoVenda) submit.textContent = "Salvar alterações";
      else submit.textContent = tipo === "venda" ? "Registrar venda" : "Registrar compra";
      submit.classList.toggle("bg-amber-600", tipo === "venda" && !editandoCompra && !editandoVenda);
      submit.classList.toggle("hover:bg-amber-500", tipo === "venda" && !editandoCompra && !editandoVenda);
      submit.classList.toggle("bg-violet-600", tipo !== "venda" || editandoCompra || editandoVenda);
      submit.classList.toggle("hover:bg-violet-500", tipo !== "venda" || editandoCompra || editandoVenda);
    }
    if (cancel) cancel.classList.toggle("hidden", !editandoCompra && !editandoVenda);
    var tickerIn = document.getElementById("ativos-add-ticker");
    var classeSel = document.querySelector("#form-ativos-compra select[name=classe]");
    var selTipo = document.getElementById("ativos-mov-tipo");
    if (tickerIn) tickerIn.readOnly = editandoCompra || editandoVenda;
    if (classeSel) classeSel.disabled = editandoCompra || editandoVenda;
    if (selTipo && (editandoCompra || editandoVenda)) selTipo.value = editandoVenda ? "venda" : "compra";
    atualizarCamposMovimentoForm();
  }

  function limparEdicaoMovimento(resetForm) {
    compraEditandoId = null;
    vendaEditandoId = null;
    atualizarUiFormCompra();
    if (resetForm !== false) {
      var form = document.getElementById("form-ativos-compra");
      if (form) {
        form.investido.value = "";
        form.preco.value = "";
        if (form.qtyVenda) form.qtyVenda.value = "";
        if (form.precoVenda) form.precoVenda.value = "";
        var tickerIn = document.getElementById("ativos-add-ticker");
        if (tickerIn) tickerIn.readOnly = false;
        var classeSel = form.classe;
        if (classeSel) classeSel.disabled = false;
        var selTipo = document.getElementById("ativos-mov-tipo");
        if (selTipo) selTipo.disabled = false;
      }
    }
    renderDetalheTicker();
  }

  function limparEdicaoCompra(resetForm) {
    limparEdicaoMovimento(resetForm);
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
    vendaEditandoId = null;
    ativosState.tickerSelecionado = t;

    var form = document.getElementById("form-ativos-compra");
    if (form) {
      form.data.value = c.data || "";
      form.ticker.value = t;
      form.classe.value = p.classe || inferirClasse(t);
      setInputMoeda(form.investido, c.investido);
      setInputMoeda(form.preco, c.preco);
      if (form.qtyVenda) form.qtyVenda.value = "";
      if (form.precoVenda) form.precoVenda.value = "";
    }
    atualizarUiFormCompra();
    renderDetalheTicker();

    var bloco = document.getElementById("form-ativos-compra");
    if (bloco && bloco.closest(".rounded-2xl"))
      bloco.closest(".rounded-2xl").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function iniciarEdicaoVenda(ticker, vendaId) {
    var t = normTicker(ticker);
    var p = posicaoPorTicker(t);
    if (!p) return;
    var v = (p.vendas || []).find(function (x) {
      return x.id === vendaId;
    });
    if (!v) return;

    vendaEditandoId = vendaId;
    compraEditandoId = null;
    ativosState.tickerSelecionado = t;

    var form = document.getElementById("form-ativos-compra");
    if (form) {
      form.data.value = v.data || "";
      form.ticker.value = t;
      form.classe.value = p.classe || inferirClasse(t);
      if (form.qtyVenda) form.qtyVenda.value = String(v.qty);
      if (form.precoVenda) setInputMoeda(form.precoVenda, v.preco);
      form.investido.value = "";
      form.preco.value = "";
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
    atualizarUiFormCompra();
    if (typeof lucide !== "undefined" && lucide.createIcons) lucide.createIcons();
  }

  function qtyDisponivelParaVenda(p, excludeVendaId) {
    if (!p) return 0;
    var disp = qtyTotalPosicao(p);
    if (excludeVendaId) {
      var v = (p.vendas || []).find(function (x) {
        return x.id === excludeVendaId;
      });
      if (v) disp += Number(v.qty) || 0;
    }
    return disp;
  }

  function precoMedioParaVenda(p, excludeVendaId) {
    if (!p) return NaN;
    if (!excludeVendaId) return precoMedioPosicao(p);
    var temp = {
      compras: p.compras || [],
      vendas: (p.vendas || []).filter(function (v) {
        return v.id !== excludeVendaId;
      }),
    };
    return precoMedioPosicao(temp);
  }

  function salvarVendaForm(form) {
    var ticker = normTicker(form.ticker.value);
    var classe = String(form.classe.value || inferirClasse(ticker)).trim();
    var data = String(form.data.value || "").trim();
    var qty = parseNum(form.qtyVenda && form.qtyVenda.value);
    var precoVenda = parseNum(form.precoVenda && form.precoVenda.value);
    var valTicker = validarTickerAtivo(ticker, classe);
    if (!valTicker.ok) {
      alert(valTicker.msg);
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      alert("Informe a data da venda.");
      return false;
    }
    var p = posicaoPorTicker(ticker);
    if (!p || qtyComprasPosicao(p) <= 0) {
      alert("Cadastre uma compra deste ativo antes de registrar venda.");
      return false;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      alert("Informe a quantidade vendida.");
      return false;
    }
    if (!Number.isFinite(precoVenda) || precoVenda <= 0) {
      alert("Informe o preço na venda.");
      return false;
    }
    var disp = qtyDisponivelParaVenda(p, vendaEditandoId);
    if (qty > disp + 1e-8) {
      alert(
        "Quantidade maior que a posição disponível (" +
          disp.toLocaleString("pt-BR", { maximumFractionDigits: 4 }) +
          " cotas)."
      );
      return false;
    }
    var pm = precoMedioParaVenda(p, vendaEditandoId);
    if (!Number.isFinite(pm) || pm <= 0) {
      alert("Não foi possível calcular o preço médio para esta venda.");
      return false;
    }
    var custoBase = pm * qty;
    var recebido = precoVenda * qty;
    var plRealizado = recebido - custoBase;
    if (!Array.isArray(p.vendas)) p.vendas = [];

    if (vendaEditandoId) {
      var vEdit = p.vendas.find(function (x) {
        return x.id === vendaEditandoId;
      });
      if (!vEdit) {
        alert("Venda não encontrada.");
        limparEdicaoMovimento();
        return false;
      }
      vEdit.data = data;
      vEdit.qty = qty;
      vEdit.preco = precoVenda;
      vEdit.recebido = recebido;
      vEdit.custoMedio = pm;
      vEdit.custoBase = custoBase;
      vEdit.plRealizado = plRealizado;
      ativosState.tickerSelecionado = normTicker(p.ticker);
      limparEdicaoMovimento();
    } else {
      p.vendas.push({
        id: uid(),
        data: data,
        qty: qty,
        preco: precoVenda,
        recebido: recebido,
        custoMedio: pm,
        custoBase: custoBase,
        plRealizado: plRealizado,
      });
      ativosState.tickerSelecionado = ticker;
      if (form.qtyVenda) form.qtyVenda.value = "";
      if (form.precoVenda) form.precoVenda.value = "";
    }

    ativosSave();
    renderAtivosUI();
    if (!isClasseExterior(classe)) ativosFetchCotacoes(false);
    return true;
  }

  function salvarCompraForm(form) {
    if (vendaEditandoId) return salvarVendaForm(form);
    if (!compraEditandoId && tipoMovimentoForm() === "venda") return salvarVendaForm(form);
    var ticker = normTicker(form.ticker.value);
    var classe = String(form.classe.value || inferirClasse(ticker)).trim();
    var data = String(form.data.value || "").trim();
    var investido = parseNum(form.investido.value);
    var preco = parseNum(form.preco.value);
    var valTicker = validarTickerAtivo(ticker, classe);
    if (!valTicker.ok) {
      alert(valTicker.msg);
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
        limparEdicaoMovimento();
        return false;
      }
      cEdit.data = data;
      cEdit.investido = investido;
      cEdit.preco = preco;
      cEdit.qty = qty;
      pEdit.classe = classe || inferirClasse(ticker);
      ativosState.tickerSelecionado = normTicker(pEdit.ticker);
      limparEdicaoMovimento();
    } else {
      var p = posicaoPorTicker(ticker);
      if (!p) {
        p = {
          id: uid(),
          ticker: ticker,
          classe: classe || inferirClasse(ticker),
          compras: [],
          vendas: [],
        };
        ativosState.posicoes.push(p);
      } else {
        p.classe = classe || inferirClasse(ticker);
      }
      p.compras.push({
        id: uid(),
        data: data,
        investido: investido,
        preco: preco,
        qty: qty,
      });
      if (isClasseExterior(p.classe) && !Number.isFinite(precoManualPosicao(p))) {
        p.precoManual = preco;
        syncCotacaoManualPosicao(p);
      }
      ativosState.tickerSelecionado = ticker;
      form.investido.value = "";
      form.preco.value = "";
    }

    ativosSave();
    renderAtivosUI();
    if (!isClasseExterior(classe)) {
      ativosFetchCotacoes(false);
      ativosAgendarSyncProventos();
    }
    return true;
  }

  function salvarProventoManual(form) {
    var ticker = normTicker(form.ticker.value);
    var data = String(form.data.value || "").trim();
    var valor = parseNum(form.valor.value);
    var tipo = String(form.tipo.value || "Outro").trim();
    var pos = posicaoPorTicker(ticker);
    var classe = pos ? pos.classe || inferirClasse(ticker) : inferirClasse(ticker);
    var valTicker = validarTickerAtivo(ticker, classe);
    if (!valTicker.ok) {
      alert(valTicker.msg);
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
        limparEdicaoMovimento();
      });
    }
    var selTipo = document.getElementById("ativos-mov-tipo");
    if (selTipo && !selTipo._wired) {
      selTipo._wired = true;
      selTipo.addEventListener("change", function () {
        atualizarUiFormCompra();
      });
    }
    var tickerIn = document.getElementById("ativos-add-ticker");
    if (tickerIn && !tickerIn._wiredMov) {
      tickerIn._wiredMov = true;
      tickerIn.addEventListener("input", function () {
        atualizarCamposMovimentoForm();
      });
    }

    atualizarUiFormCompra();
  }

  function gfpInitAtivos() {
    ativosLoad();
    compraEditandoId = null;
    vendaEditandoId = null;
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
