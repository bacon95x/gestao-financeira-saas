/**
 * Capital Novo — i18n PT/EN
 * Uso: data-i18n="key" | data-i18n-html | data-i18n-placeholder | data-i18n-title | data-i18n-aria
 * API: GFP.t(key), GFP.getLang(), GFP.setLang('en'|'pt'), GFP.applyI18n(root?)
 */
(function (global) {
  var STORAGE_KEY = "gfp_lang";
  var dict = {
    pt: {
      "lang.switchTo": "EN",
      "lang.switchTitle": "Switch to English",
      "lang.aria": "Idioma",

      "landing.meta.title": "Capital Novo · Organize hoje. Construa o capital de amanhã.",
      "landing.meta.desc":
        "Capital Novo — dashboard financeiro pessoal. Gastos, contas fixas, cartões, patrimônio e simulador de longo prazo em um só painel, com privacidade.",
      "landing.eyebrow": "Dashboard financeiro inteligente",
      "landing.hero.title":
        'Organize hoje.<br />Construa o capital<br /><span class="text-zinc-500">de amanhã.</span>',
      "landing.hero.sub":
        "O Capital Novo reúne gastos, contas e investimentos em um painel elegante — para você ter controle da sua vida financeira com visão de longo prazo para seu patrimônio.",
      "landing.cta.demo": "Ver demonstração grátis",
      "landing.cta.start": "Começar por R$ 29,90/mês",
      "landing.cta.hint": "Explore o dashboard com dados de exemplo — sem cartão e sem compromisso.",
      "landing.mock.gastos": "Total de gastos no mês",
      "landing.mock.ref": "Referência: Junho de 2026 (mês atual)",
      "landing.mock.patrimonio": "Patrimônio",
      "landing.mock.valorGastos": "R$ 3.521,69",
      "landing.mock.valorPatrimonio": "R$ 218k",
      "landing.mock.valorMini": "R$ 5.120",

      "landing.login.title": "Já tem senha? Entre",
      "landing.login.email": "E-mail",
      "landing.login.password": "Senha",
      "landing.login.submit": "Entrar",
      "landing.login.forgot": "Esqueci minha senha",
      "landing.login.create": "Acabei de pagar · criar minha senha",
      "landing.login.resetHint": "Enviaremos um link para redefinir a senha no e-mail da sua conta.",
      "landing.login.resetEmail": "E-mail da conta",
      "landing.login.resetSubmit": "Enviar link de redefinição",
      "landing.login.createTitle": "Pagamento confirmado",
      "landing.login.createHint":
        'Crie sua senha com o <strong class="text-zinc-300">mesmo e-mail</strong> que você usou para o pagamento.',
      "landing.login.createSubmit": "Criar senha e entrar",
      "landing.login.showPassword": "Mostrar senha",

      "landing.compare.title": "Sem controle vs. Com Capital Novo",
      "landing.compare.before": "Antes",
      "landing.compare.after": "Depois",
      "landing.compare.b1": "✗ Planilhas e cadernos que trazem dor de cabeça e desorganização",
      "landing.compare.b2": "✗ Esqueceu de pagar uma conta e levou multa",
      "landing.compare.b3": "✗ Surpresa na fatura todo mês",
      "landing.compare.b4": "✗ Patrimônio “mais ou menos” na cabeça",
      "landing.compare.a1": "✓ Tudo registrado em um painel só",
      "landing.compare.a2": "✓ Saiba quando e o que precisa pagar antecipadamente",
      "landing.compare.a3": "✓ Saldo e categorias sempre visíveis",
      "landing.compare.a4": "✓ Patrimônio e metas com números reais",

      "landing.benefits.title": "Feito para quem leva dinheiro a sério",
      "landing.benefits.sub": "Seis pilares que só o Capital Novo entrega com essa profundidade.",
      "landing.benefits.1.t": "Onde vai cada real",
      "landing.benefits.1.d":
        "Gráficos por categoria e origem para você saber exatamente o que gasta em cada parte da sua vida.",
      "landing.benefits.2.t": "Cartões sob controle",
      "landing.benefits.2.d": "Controle todos os seus cartões de crédito em um só lugar e organize o seu dia a dia.",
      "landing.benefits.3.t": "Projete o seu sonho",
      "landing.benefits.3.d":
        "Simulador profissional de longo prazo: juros compostos, aportes em dólar e real e patrimônio real descontado da inflação.",
      "landing.benefits.4.t": "Patrimônio personalizado",
      "landing.benefits.4.d": "O único dashboard que permite personalizar 100% como o seu patrimônio é constituído.",
      "landing.benefits.5.t": "Lance pelo WhatsApp",
      "landing.benefits.5.d":
        "Registre um gasto com uma mensagem rápida — uma linha ou um dado por linha. Consulte seus números pelo celular. Tudo sincroniza direto no dashboard.",
      "landing.benefits.6.t": "Segurança e privacidade",
      "landing.benefits.6.d":
        "Seus dados financeiros são exclusivos da sua conta. Só você acessa — nem nossa equipe vê suas finanças.",

      "landing.testimonials.title": "Depoimentos",
      "landing.testimonials.1.q":
        '"O Capital Novo virou meu ritual de domingo.<br />Em 20 minutos sei onde estou e para onde vou."',
      "landing.testimonials.1.a": "— Ricardo A. · assinante",
      "landing.testimonials.2.q":
        '"O simulador me deixa testar cenários com ou sem inflação. Pela primeira vez enxerguei se minha meta de aposentadoria era realista."',
      "landing.testimonials.2.a": "— Marina S. · assinante",
      "landing.testimonials.3.q":
        '"Personalizei tudo do meu jeito — categorias, metas e a composição do patrimônio. Do gasto do dia a dia até cada ativo, ficou realmente meu."',
      "landing.testimonials.3.a": "— Lucas F. · assinante",
      "landing.offer.badge": "7 DIAS PARA TESTAR",
      "landing.offer.price": "R$ 29,90",
      "landing.offer.priceSuffix": "/mês",
      "landing.offer.hint":
        "Acesso ao dashboard financeiro completo. Pagamento processado por provedor de cobrança certificado.",
      "landing.offer.cta": "Assinar agora",

      "landing.faq.title": "Dúvidas Frequentes",
      "landing.faq.1.q": "É seguro?",
      "landing.faq.1.a":
        "Sim. Cada conta é individual — ninguém mais acessa seus números, gastos ou investimentos. Seus dados ficam protegidos com login e senha, e a comunicação com o servidor usa criptografia. O Capital Novo não vende nem compartilha suas informações com terceiros.",
      "landing.faq.2.q": "Como funciona a assistente do WhatsApp? É IA?",
      "landing.faq.2.a":
        'A assistente do WhatsApp é um canal prático para <strong class="font-medium text-zinc-400">lançar gastos e consultar seus números</strong> sem abrir o site. Você manda uma mensagem, confirma com <em>SIM</em> ou <em>NÃO</em>, e o lançamento vai direto para o seu dashboard — sincronizado na nuvem.<br /><br /><strong class="font-medium text-zinc-400">Não é inteligência artificial generativa</strong> (não é um chatbot estilo ChatGPT). Não inventamos categorias nem decidimos gastos por você. O fluxo é guiado: menus para consultas e lançamentos no formato que você informa — uma frase ou um dado por linha.<br /><br />Isso mantém a mesma filosofia do Capital Novo: <strong class="font-medium text-zinc-400">você registra com consciência</strong>. A assistente só organiza o que você enviou e pede confirmação antes de salvar. Áreas mais sensíveis do dashboard — como sua renda ou seu patrimônio — ficam privadas e acessíveis só no site, não pelo WhatsApp.<br /><br />Para ativar, vincule seu número no dashboard (Assistente WhatsApp). Assinantes ativos têm acesso ao bot.',
      "landing.faq.3.q": "Por que não usam IA ou Open Finance?",
      "landing.faq.3.a":
        'Apps com Open Finance ou IA enxergam só o nome da maquininha e a categoria do estabelecimento — não sabem o que você comprou de verdade. Comprou um pneu de moto numa loja cadastrada como petshop? A IA marca como "pets". Para ter precisão, você acaba corrigindo manualmente mesmo.<br /><br />E há um problema maior: quando a IA faz tudo sozinha, o usuário não "sente" o gasto. A automação retira a consciência financeira. A organização vira só mais um extrato que você abre no fim do mês e se assusta com o total — como fatura de cartão que ninguém acompanhou no dia a dia.<br /><br />No Capital Novo, cada lançamento é seu — e esse esforço é proposital. Registrar "R$ 300 — pneu da moto" faz o cérebro registrar o gasto; ajudamos na mudança de comportamento financeiro, não só em tirar um retrato do passado. A IA te dá comodidade com erros; nós te damos disciplina e mentalidade para sua liberdade financeira.',
      "landing.faq.4.q": "Posso cancelar?",
      "landing.faq.4.a":
        'Sim, quando quiser. Não há fidelidade nem multa. Você cancela direto pelo dashboard (botão Assinatura). Se assinou há menos de 7 dias e quer reembolso integral, escreva para <a href="mailto:contato@capitalnovo.com.br" class="text-violet-400 hover:text-violet-300">contato@capitalnovo.com.br</a> com o mesmo e-mail da conta. Depois dos 7 dias, o acesso continua até o fim do período já pago, sem nova cobrança.',
      "landing.faq.5.q": "Funciona no celular?",
      "landing.faq.5.a":
        "Funciona em qualquer dispositivo com navegador — celular, tablet ou computador. Não precisa instalar app: abra o site, faça login e pronto. Tudo fica sincronizado na nuvem, então o que você registra no celular aparece no desktop e vice-versa. Pelo WhatsApp, você também lança e consulta sem abrir o dashboard.",
      "landing.faq.6.q": "É consultoria?",
      "landing.faq.6.a":
        "Não. O Capital Novo é uma ferramenta de organização financeira pessoal — ajuda você a ver gastos, contas, patrimônio e metas em um só lugar. Não recomendamos onde investir, não damos orientação tributária e não substituímos um contador ou planejador financeiro. A decisão é sempre sua.",

      "landing.demo.title": "Ver demonstração",
      "landing.demo.body":
        "Informe seu e-mail para liberar o painel com dados de exemplo. Sem cartão, sem compromisso — só para você conhecer o Capital Novo por dentro.",
      "landing.demo.email": "Seu e-mail",
      "landing.demo.continue": "Entrar na demonstração",
      "landing.demo.cancel": "Cancelar",
      "landing.demo.privacy":
        "Podemos enviar novidades do produto para este e-mail. Você pode pedir para sair da lista quando quiser.",

      "landing.footer.legal":
        "Ferramenta de organização financeira pessoal. Não constitui consultoria ou recomendação de investimentos.",
      "landing.footer.privacy": "Política de Privacidade",
      "landing.footer.terms": "Termos de Uso",
      "landing.footer.contact": "Contato",

      "legal.back": "← Voltar ao início",
      "legal.updated": "Última atualização: junho de 2026",
      "legal.updatedEn": "Last updated: June 2026",

      "dash.authLoading": "Verificando acesso…",
      "dash.tagline": "Seus gastos e investimentos em um só lugar",
      "dash.bg": "Fundo",
      "dash.bg.violet": "Roxo",
      "dash.bg.orange": "Laranja",
      "dash.bg.blue": "Azul",
      "dash.bg.green": "Verde",
      "dash.light": "Iluminação",
      "dash.light.low": "Baixa",
      "dash.light.high": "Alta",
      "dash.theme": "Tema",
      "dash.theme.light": "Claro",
      "dash.theme.dark": "Escuro",
      "dash.how": "Como funciona?",
      "dash.presentation": "Apresentação",
      "dash.backup": "Backup",
      "dash.subscription": "Assinatura",
      "dash.logout": "Sair",
      "dash.export": "Exportar",
      "dash.import": "Importar",
      "dash.cloud": "Nuvem",
      "dash.cloudSave": "Salvar na nuvem",
      "dash.nav": "Seções",
      "dash.tab.dashboard": "Dashboard",
      "dash.tab.lancamentos": "Lançamentos",
      "dash.tab.fixas": "Contas fixas",
      "dash.tab.cartoes": "Cartões",
      "dash.tab.metas": "Metas",
      "dash.tab.juros": "Juros/taxas",
      "dash.tab.invest": "Investimentos",
      "dash.tab.patrimonio": "Patrimônio",
      "dash.tab.ativos": "Meus Ativos",
      "dash.tab.bitcoin": "Bitcoin",
      "dash.tab.dashboardTitle": "Voltar ao início · visão geral",

      "dash.meio.cash": "Dinheiro",
      "dash.meio.pix": "Pix",
      "dash.meio.credit": "Crédito",
      "dash.meio.debit": "Débito",
      "dash.meio.meal": "Vale alimentação",
      "dash.meio.other": "outros",
      "dash.meio.select": "Selecione…",
      "dash.month.prefix": "Mês: ",

      "dash.lanc.new": "Novo lançamento",
      "dash.lanc.edit": "Editar lançamento",
      "dash.lanc.hint":
        "Meio de pagamento é como você pagou; origem é qual cartão (quando couber). Em Crédito, a coluna em Cartões é o mês do vencimento da fatura (ciclo que cruza o mês anterior ao fechamento). Parcelas (opcional) repartem o valor nas colunas dos vencimentos seguintes. A descrição é opcional. Não registre aqui o que já está em Contas fixas no mesmo mês — evita somar em dobro no dashboard.",
      "dash.lanc.date": "Data",
      "dash.lanc.datePh": "dd/mm/aaaa",
      "dash.lanc.value": "Valor (R$)",
      "dash.lanc.valuePh": "0,00",
      "dash.lanc.method": "Meio de pagamento",
      "dash.lanc.installments": "Parcelas",
      "dash.lanc.installmentsHint":
        "Opcional (2 a 24). Divide o valor nas colunas dos meses seguintes em Cartões, pela origem.",
      "dash.lanc.installmentsPh": "À vista",
      "dash.lanc.origin": "Origem",
      "dash.lanc.selected": "Selecionada:",
      "dash.lanc.originList": "Lista de origens",
      "dash.lanc.newOrigin": "Nova origem",
      "dash.lanc.newOriginPh": "Ex.: banco x",
      "dash.lanc.add": "Adicionar",
      "dash.lanc.editOrigin": "Editar nome ou excluir origem",
      "dash.lanc.editOriginHint": "Alterações atualizam lançamentos e vínculos em Cartões.",
      "dash.lanc.category": "Categoria",
      "dash.lanc.categoryList": "Lista de categorias",
      "dash.lanc.newCategory": "Nova categoria",
      "dash.lanc.newCategoryPh": "Ex.: Pet",
      "dash.lanc.editCategory": "Editar nome ou excluir categoria",
      "dash.lanc.editCategoryHint":
        "Alterações atualizam lançamentos, vínculos por categoria e totais do mês.",
      "dash.lanc.dayTotal": "Total gasto no dia",
      "dash.lanc.dayTotalHint": "(data do lançamento)",
      "dash.lanc.desc": "Descrição",
      "dash.lanc.optional": "(opcional)",
      "dash.lanc.descPh": "Ex.: Supermercado, assinatura…",
      "dash.lanc.save": "Salvar lançamento",
      "dash.lanc.saveEdit": "Salvar alterações",
      "dash.lanc.cancelEdit": "Cancelar edição",
      "dash.lanc.listTitle": "Lançamentos registrados",
      "dash.lanc.monthBtn": "Mês exibido",
      "dash.lanc.monthBtnTitle": "Escolher mês da lista e dos totais por categoria",
      "dash.lanc.filterCat": "Filtrar categoria",
      "dash.lanc.filterMethod": "Filtrar meio",
      "dash.lanc.filterOrigin": "Filtrar origem",
      "dash.lanc.filterDate": "Filtrar data",
      "dash.lanc.filterAllCat": "Todas as categorias",
      "dash.lanc.filterAllMethod": "Todos os meios",
      "dash.lanc.filterAllOrigin": "Todas as origens",
      "dash.lanc.th.date": "Data",
      "dash.lanc.th.desc": "Descrição",
      "dash.lanc.th.cat": "Categoria",
      "dash.lanc.th.method": "Meio",
      "dash.lanc.th.origin": "Origem",
      "dash.lanc.th.value": "Valor",
      "dash.lanc.th.dayTotal": "Total no dia",
      "dash.lanc.total": "Total",
      "dash.lanc.empty": "Nenhum lançamento ainda. Adicione o primeiro acima.",
      "dash.lanc.emptyMonth":
        "Nenhum lançamento neste mês de referência. Os demais meses continuam salvos; use o botão «Mês exibido» ou o ícone no cartão do dashboard para alternar.",
      "dash.lanc.emptyFilter":
        "Nenhum lançamento neste mês corresponde aos filtros selecionados. Ajuste categoria, meio ou origem para ver outros registros.",
      "dash.lanc.totalsTitle": "Totais do mês por categoria",
      "dash.lanc.refEmpty": "Nenhum gasto salvo ainda neste navegador.",
      "dash.lanc.refList":
        "Lista filtrada por {month}{current}. {filters}Sem parcelas: só aparecem lançamentos cuja data está neste mês. Com parcelas — indicador (parcela/total), número da parcela em vermelho — o mesmo item aparece em cada mês com o valor daquela parcela; a data da compra continua na primeira coluna.",
      "dash.lanc.refCurrent": " (mês atual)",
      "dash.lanc.refFilters": "Filtros ativos: {list}. ",
      "dash.lanc.refFilterDate": "data",
      "dash.lanc.refFilterCat": "categoria",
      "dash.lanc.refFilterMethod": "meio",
      "dash.lanc.refFilterOrigin": "origem",

      "dash.panel.fixas": "Contas fixas",
      "dash.panel.fixasHint":
        "Despesas que repetem todo mês (aluguel, assinaturas, planos). Assinatura no cartão: meio Crédito + origem do cartão — não precisa lançar de novo em Lançamentos. Compras avulsas no cartão continuam em Lançamentos. Fora do crédito, preencha valor pago quando pagar; em Crédito, o gasto entra pela cobrança do mês.",
      "dash.panel.cartoes": "Cartões",
      "dash.panel.metas": "Metas",
      "dash.panel.metasHint":
        "Defina um teto de gasto por categoria (as mesmas de Lançamentos). A barra enche com o uso do mês (verde → amarelo em 80% → vermelho em 100%). Gastos = lançamentos + contas fixas do mês de referência.",
      "dash.metas.renda": "Renda",
      "dash.metas.gasto": "Gasto",
      "dash.metas.alertas": "Alertas",
      "dash.metas.focus": "Categoria em foco",
      "dash.metas.uso": "Uso da meta",
      "dash.metas.meta": "Meta",
      "dash.metas.resta": "Resta",
      "dash.metas.definir": "Definir teto da meta (R$)",
      "dash.metas.salvar": "Salvar meta",
      "dash.metas.composicao": "Composição do gasto",
      "dash.metas.total": "Total",
      "dash.metas.somaMetas": "Soma das metas",
      "dash.metas.porRisco": "Por risco",
      "dash.metas.alertEstourou": "passou da meta",
      "dash.metas.alertAtencao": "em {pct}% da meta — atenção",
      "dash.metas.tetoMes": "Teto do mês:",
      "dash.metas.semTeto": "Sem teto definido — informe a meta abaixo",
      "dash.metas.definaTeto": "Defina um teto para acompanhar",
      "dash.metas.semGasto": "Sem gasto ainda",
      "dash.metas.pctUsado": "{pct}% da meta usado",
      "dash.metas.statusSemMeta": "Defina uma meta para esta categoria",
      "dash.metas.statusEstourou": "Meta ultrapassada",
      "dash.metas.statusPerto": "Perto do teto — evite novos gastos nesta categoria",
      "dash.metas.statusLivre": "Meta livre — ainda sem gasto",
      "dash.metas.statusOk": "Dentro da meta",
      "dash.metas.pctMetasUsadas": "{pct}% das metas usadas",
      "dash.metas.pesoMetaTitle": "Quanto esta meta representa da soma das metas",
      "dash.panel.juros": "Juros/taxas",
      "dash.panel.invest": "Simulador de Juros compostos",
      "dash.panel.patrimonio": "Patrimônio investido",
      "dash.panel.ativos": "Meus Ativos",
      "dash.panel.bitcoin": "Bitcoin",
      "dash.common.month": "Mês",
      "dash.common.year": "Ano",
      "dash.cloud.savedAuto": "Salvo automaticamente",
      "dash.cloud.saved": "Salvo na nuvem",

      "dash.home.totalGastos": "Total de gastos no mês",
      "dash.home.refPrefix": "Referência: ",
      "dash.home.currentMonth": " (mês atual)",
      "dash.home.note": "Anotação",
      "dash.home.noteTitle": "Bloco de notas deste mês de referência",
      "dash.home.nextDue": "Próximo vencimento",
      "dash.home.nextDueHint":
        "Data do vencimento mais próximo (sem pagamento naquele mês). Ícone: lista completa.",
      "dash.home.nextDueList": "Próximos vencimentos",
      "dash.home.nextDueListHint":
        "Ordenados do mais próximo ao mais distante (contas sem data de pagamento naquele mês).",
      "dash.home.nextDueEmpty": "Nenhum vencimento futuro encontrado.",
      "dash.home.income": "Renda mensal",
      "dash.home.changeMonth": "Mudar mês",
      "dash.home.monthOfYear": "{month} de {year}",
      "dash.home.history": "Histórico",
      "dash.home.historyDesc": "Últimos 12 meses — renda e gastos por mês.",
      "dash.home.historyDescUntil":
        "Últimos 12 meses até {month}. Barras mais claras = mês de referência dos gastos.",
      "dash.home.compare": "Comparar",
      "dash.home.expenses": "Gastos",
      "dash.home.incomeShort": "Renda",
      "dash.home.historyEmpty": "Sem dados de renda ou gastos nos últimos 12 meses.",
      "dash.home.showValue": "Visualizar valor",
      "dash.home.hideValue": "Ocultar valor",
      "dash.home.showExpenses": "Visualizar valor dos gastos",
      "dash.home.hideExpenses": "Ocultar valor dos gastos",
      "dash.home.showIncome": "Visualizar valor da renda",
      "dash.home.hideIncome": "Ocultar valor da renda",
      "dash.home.catPctCurrent":
        "Percentual por categoria no mês atual · Lançamentos do mês + fixas pagas fora do crédito + fixas em crédito",
      "dash.home.catPctMonth":
        "Percentual por categoria em {month} · Lançamentos do mês + fixas pagas fora do crédito + fixas em crédito",
      "dash.home.close": "Fechar",
      "dash.home.cancel": "Cancelar",
      "dash.home.refMonthTitle": "Mês de referência dos gastos",
      "dash.home.goCurrentMonth": "Ir para mês atual",
      "dash.home.gastosExplain":
        "Lançamentos (todos os meios) + fixas pagas fora do crédito + fixas em crédito pela cobrança do mês + juros/taxas. Pagar fatura de cartões não entra aqui, porque o gasto já foi adicionado no lançamento ou na conta fixa em crédito.",
      "dash.home.pieNoCredit": "Gastos fora do crédito",
      "dash.home.pieNoCreditHint":
        "Lançamentos (sem Crédito) e contas fixas fora do crédito com valor pago preenchido, por meio: Débito, Pix, Dinheiro, Vale alimentação e outros.",
      "dash.home.pieNoCreditEmpty":
        "Nenhum gasto fora do crédito neste mês (lançamentos ou contas fixas não-crédito pagas).",
      "dash.home.pieCard": "Gastos no cartão",
      "dash.home.pieCardHint":
        "Lançamentos com meio Crédito e contas fixas em Crédito, por origem (cartão). Pagar a fatura não entra aqui.",
      "dash.home.pieCardEmpty": "Nenhum gasto no crédito neste mês.",
      "dash.home.pieCat": "Gastos por categoria",
      "dash.home.pieCatEmpty": "Nenhum gasto neste mês para este gráfico.",
      "dash.home.incomeDetailTitle": "Renda mensal — detalhe ({month})",
      "dash.home.incomeDetailDesc":
        'Some as subcategorias abaixo; use <strong class="text-zinc-300">{add}</strong> para mais linhas. O total atualiza a renda de <strong class="text-zinc-300">{month}</strong> no cartão do dashboard e no valor do botão «{changeMonth}».',
      "dash.home.addSubcat": "Adicionar subcategoria",
      "dash.home.incomeTotal": "Total ({month}): {amount}",
      "dash.home.saveThisMonth": "Salvar só neste mês",
      "dash.home.saveFollowing": "Salvar neste e nos meses seguintes",
      "dash.home.saveHint":
        "«{saveThis}» grava apenas em {monthYear}, com todas as subcategorias e valores. «{saveFollowing}» copia o mesmo detalhamento (incluindo linhas extras) para {month} até {december} (desativado se o mês exibido for {december}).",
      "dash.home.december": "dezembro",
      "dash.home.saveFollowingDisabled": "Não há meses seguintes após dezembro no mesmo ano.",
      "dash.home.detailIncomeOf": "Detalhar renda de {month} por subcategorias",
    },
    en: {
      "lang.switchTo": "PT",
      "lang.switchTitle": "Mudar para português",
      "lang.aria": "Language",

      "landing.meta.title": "Capital Novo · Organize today. Build tomorrow's capital.",
      "landing.meta.desc":
        "Capital Novo — personal finance dashboard. Expenses, bills, cards, net worth and long-term simulator in one private panel.",
      "landing.eyebrow": "Smart finance dashboard",
      "landing.hero.title":
        'Organize today.<br />Build tomorrow\'s<br /><span class="text-zinc-500">capital.</span>',
      "landing.hero.sub":
        "Capital Novo brings expenses, bills and investments into one elegant panel — so you stay in control with a long-term view of your wealth.",
      "landing.cta.demo": "Try the free demo",
      "landing.cta.start": "Start at $9.90/mo",
      "landing.cta.hint": "Explore the dashboard with sample data — no card, no commitment.",
      "landing.mock.gastos": "Total spending this month",
      "landing.mock.ref": "Reference: June 2026 (current month)",
      "landing.mock.patrimonio": "Net worth",
      "landing.mock.valorGastos": "$3,521.69",
      "landing.mock.valorPatrimonio": "$218k",
      "landing.mock.valorMini": "$5,120",

      "landing.login.title": "Already have a password? Sign in",
      "landing.login.email": "Email",
      "landing.login.password": "Password",
      "landing.login.submit": "Sign in",
      "landing.login.forgot": "Forgot my password",
      "landing.login.create": "Just paid · create my password",
      "landing.login.resetHint": "We'll send a reset link to your account email.",
      "landing.login.resetEmail": "Account email",
      "landing.login.resetSubmit": "Send reset link",
      "landing.login.createTitle": "Payment confirmed",
      "landing.login.createHint":
        'Create your password with the <strong class="text-zinc-300">same email</strong> you used for payment.',
      "landing.login.createSubmit": "Create password and sign in",
      "landing.login.showPassword": "Show password",

      "landing.compare.title": "Out of control vs. With Capital Novo",
      "landing.compare.before": "Before",
      "landing.compare.after": "After",
      "landing.compare.b1": "✗ Spreadsheets and notebooks that create chaos",
      "landing.compare.b2": "✗ Missed a bill and paid a late fee",
      "landing.compare.b3": "✗ Card statement surprises every month",
      "landing.compare.b4": "✗ Net worth only as a rough guess in your head",
      "landing.compare.a1": "✓ Everything in one panel",
      "landing.compare.a2": "✓ Know what to pay and when, in advance",
      "landing.compare.a3": "✓ Balance and categories always visible",
      "landing.compare.a4": "✓ Net worth and goals with real numbers",

      "landing.benefits.title": "Built for people who take money seriously",
      "landing.benefits.sub": "Six pillars only Capital Novo delivers at this depth.",
      "landing.benefits.1.t": "Where every dollar goes",
      "landing.benefits.1.d":
        "Charts by category and source so you know exactly what you spend in each part of life.",
      "landing.benefits.2.t": "Cards under control",
      "landing.benefits.2.d": "Manage all your credit cards in one place and organize your day-to-day.",
      "landing.benefits.3.t": "Project your dream",
      "landing.benefits.3.d":
        "Professional long-term simulator: compound interest, USD and BRL contributions, and real wealth after inflation.",
      "landing.benefits.4.t": "Custom net worth",
      "landing.benefits.4.d": "The only dashboard that lets you fully customize how your net worth is built.",
      "landing.benefits.5.t": "Log via WhatsApp",
      "landing.benefits.5.d":
        "Record an expense with a quick message — one line or one field per line. Check numbers on your phone. Everything syncs to the dashboard.",
      "landing.benefits.6.t": "Security and privacy",
      "landing.benefits.6.d":
        "Your financial data belongs only to your account. Only you can access it — not even our team sees your finances.",

      "landing.testimonials.title": "Testimonials",
      "landing.testimonials.1.q":
        '"Capital Novo became my Sunday ritual.<br />In 20 minutes I know where I stand and where I\'m going."',
      "landing.testimonials.1.a": "— Ricardo A. · subscriber",
      "landing.testimonials.2.q":
        '"The simulator lets me test scenarios with or without inflation. For the first time I could see if my retirement goal was realistic."',
      "landing.testimonials.2.a": "— Marina S. · subscriber",
      "landing.testimonials.3.q":
        '"I customized everything my way — categories, goals and how my net worth is built. From daily spending to every asset, it truly feels mine."',
      "landing.testimonials.3.a": "— Lucas F. · subscriber",
      "landing.offer.badge": "7 DAYS TO TRY",
      "landing.offer.price": "$9.90",
      "landing.offer.priceSuffix": "/mo",
      "landing.offer.hint":
        "Full finance dashboard access. Payment processed by a certified billing provider.",
      "landing.offer.cta": "Subscribe now",

      "landing.faq.title": "FAQ",
      "landing.faq.1.q": "Is it secure?",
      "landing.faq.1.a":
        "Yes. Each account is individual — nobody else can see your numbers, expenses or investments. Data is protected with login and password, and server communication uses encryption. Capital Novo does not sell or share your information with third parties.",
      "landing.faq.2.q": "How does the WhatsApp assistant work? Is it AI?",
      "landing.faq.2.a":
        'The WhatsApp assistant is a practical channel to <strong class="font-medium text-zinc-400">log expenses and check your numbers</strong> without opening the site. You send a message, confirm with <em>YES</em> or <em>NO</em>, and the entry goes straight to your dashboard — synced in the cloud.<br /><br /><strong class="font-medium text-zinc-400">It is not generative AI</strong> (not a ChatGPT-style chatbot). We do not invent categories or decide expenses for you. The flow is guided: menus for lookups and entries in the format you provide — one sentence or one field per line.<br /><br />This keeps Capital Novo\'s philosophy: <strong class="font-medium text-zinc-400">you record with awareness</strong>. The assistant only organizes what you sent and asks for confirmation before saving. More sensitive areas of the dashboard — like income or net worth — stay private on the website, not via WhatsApp.<br /><br />To enable it, link your number in the dashboard (WhatsApp Assistant). Active subscribers have access to the bot.',
      "landing.faq.3.q": "Why not use AI or Open Finance?",
      "landing.faq.3.a":
        'Apps with Open Finance or AI often only see the merchant name and category — not what you actually bought. Bought a motorcycle tire at a store labeled as a pet shop? The AI tags it as "pets". For accuracy, you end up correcting it manually anyway.<br /><br />There is a bigger issue: when AI does everything for you, you stop "feeling" the expense. Automation removes financial awareness. Organization becomes just another statement you open at month-end and get shocked by the total — like a card bill nobody tracked day to day.<br /><br />At Capital Novo, every entry is yours — on purpose. Logging "R$ 300 — motorcycle tire" makes your brain register the spend; we help change financial behavior, not only take a photo of the past. AI gives convenience with mistakes; we give discipline and mindset for financial freedom.',
      "landing.faq.4.q": "Can I cancel?",
      "landing.faq.4.a":
        'Yes, anytime. No lock-in and no penalty. You cancel from the dashboard (Subscription button). If you subscribed less than 7 days ago and want a full refund, email <a href="mailto:contato@capitalnovo.com.br" class="text-violet-400 hover:text-violet-300">contato@capitalnovo.com.br</a> with the same account email. After 7 days, access continues until the end of the period already paid, with no further charge.',
      "landing.faq.5.q": "Does it work on mobile?",
      "landing.faq.5.a":
        "It works on any device with a browser — phone, tablet or computer. No app install needed: open the site, sign in, and you're ready. Everything syncs in the cloud, so what you log on your phone shows up on desktop and vice versa. Via WhatsApp you can also log and check numbers without opening the dashboard.",
      "landing.faq.6.q": "Is this financial advice?",
      "landing.faq.6.a":
        "No. Capital Novo is a personal finance organization tool — it helps you see expenses, bills, net worth and goals in one place. We do not recommend where to invest, give tax advice, or replace an accountant or financial planner. The decision is always yours.",

      "landing.demo.title": "Try the demo",
      "landing.demo.body":
        "Enter your email to unlock the panel with sample data. No card, no commitment — just to explore Capital Novo from the inside.",
      "landing.demo.email": "Your email",
      "landing.demo.continue": "Enter the demo",
      "landing.demo.cancel": "Cancel",
      "landing.demo.privacy":
        "We may send product updates to this email. You can ask to leave the list anytime.",

      "landing.footer.legal":
        "Personal finance organization tool. Not investment advice or consulting.",
      "landing.footer.privacy": "Privacy Policy",
      "landing.footer.terms": "Terms of Use",
      "landing.footer.contact": "Contact",

      "legal.back": "← Back to home",
      "legal.updated": "Last updated: June 2026",
      "legal.updatedEn": "Last updated: June 2026",

      "dash.authLoading": "Checking access…",
      "dash.tagline": "Your expenses and investments in one place",
      "dash.bg": "Background",
      "dash.bg.violet": "Violet",
      "dash.bg.orange": "Orange",
      "dash.bg.blue": "Blue",
      "dash.bg.green": "Green",
      "dash.light": "Glow",
      "dash.light.low": "Low",
      "dash.light.high": "High",
      "dash.theme": "Theme",
      "dash.theme.light": "Light",
      "dash.theme.dark": "Dark",
      "dash.how": "How it works?",
      "dash.presentation": "Presentation",
      "dash.backup": "Backup",
      "dash.subscription": "Subscription",
      "dash.logout": "Log out",
      "dash.export": "Export",
      "dash.import": "Import",
      "dash.cloud": "Cloud",
      "dash.cloudSave": "Save to cloud",
      "dash.nav": "Sections",
      "dash.tab.dashboard": "Dashboard",
      "dash.tab.lancamentos": "Transactions",
      "dash.tab.fixas": "Fixed bills",
      "dash.tab.cartoes": "Cards",
      "dash.tab.metas": "Goals",
      "dash.tab.juros": "Interest/fees",
      "dash.tab.invest": "Investments",
      "dash.tab.patrimonio": "Net worth",
      "dash.tab.ativos": "My Assets",
      "dash.tab.bitcoin": "Bitcoin",
      "dash.tab.dashboardTitle": "Back to home · overview",

      "dash.meio.cash": "Cash",
      "dash.meio.pix": "Pix",
      "dash.meio.credit": "Credit",
      "dash.meio.debit": "Debit",
      "dash.meio.meal": "Meal voucher",
      "dash.meio.other": "other",
      "dash.meio.select": "Select…",
      "dash.month.prefix": "Month: ",

      "dash.lanc.new": "New transaction",
      "dash.lanc.edit": "Edit transaction",
      "dash.lanc.hint":
        "Payment method is how you paid; origin is which card (when applicable). On Credit, the Cards column is the statement due month (cycle that spans the month before closing). Installments (optional) split the amount across the following due-date columns. Description is optional. Do not log here what is already in Fixed bills for the same month — that would double-count on the dashboard.",
      "dash.lanc.date": "Date",
      "dash.lanc.datePh": "mm/dd/yyyy",
      "dash.lanc.value": "Amount ($)",
      "dash.lanc.valuePh": "0.00",
      "dash.lanc.method": "Payment method",
      "dash.lanc.installments": "Installments",
      "dash.lanc.installmentsHint":
        "Optional (2 to 24). Splits the amount across the following months in Cards, by origin.",
      "dash.lanc.installmentsPh": "Pay in full",
      "dash.lanc.origin": "Origin",
      "dash.lanc.selected": "Selected:",
      "dash.lanc.originList": "Origins list",
      "dash.lanc.newOrigin": "New origin",
      "dash.lanc.newOriginPh": "E.g.: bank x",
      "dash.lanc.add": "Add",
      "dash.lanc.editOrigin": "Edit name or delete origin",
      "dash.lanc.editOriginHint": "Changes update transactions and links in Cards.",
      "dash.lanc.category": "Category",
      "dash.lanc.categoryList": "Categories list",
      "dash.lanc.newCategory": "New category",
      "dash.lanc.newCategoryPh": "E.g.: Pet",
      "dash.lanc.editCategory": "Edit name or delete category",
      "dash.lanc.editCategoryHint":
        "Changes update transactions, category links and monthly totals.",
      "dash.lanc.dayTotal": "Total spent that day",
      "dash.lanc.dayTotalHint": "(transaction date)",
      "dash.lanc.desc": "Description",
      "dash.lanc.optional": "(optional)",
      "dash.lanc.descPh": "E.g.: Grocery, subscription…",
      "dash.lanc.save": "Save transaction",
      "dash.lanc.saveEdit": "Save changes",
      "dash.lanc.cancelEdit": "Cancel edit",
      "dash.lanc.listTitle": "Recorded transactions",
      "dash.lanc.monthBtn": "Displayed month",
      "dash.lanc.monthBtnTitle": "Choose month for the list and category totals",
      "dash.lanc.filterCat": "Filter category",
      "dash.lanc.filterMethod": "Filter method",
      "dash.lanc.filterOrigin": "Filter origin",
      "dash.lanc.filterDate": "Filter date",
      "dash.lanc.filterAllCat": "All categories",
      "dash.lanc.filterAllMethod": "All methods",
      "dash.lanc.filterAllOrigin": "All origins",
      "dash.lanc.th.date": "Date",
      "dash.lanc.th.desc": "Description",
      "dash.lanc.th.cat": "Category",
      "dash.lanc.th.method": "Method",
      "dash.lanc.th.origin": "Origin",
      "dash.lanc.th.value": "Amount",
      "dash.lanc.th.dayTotal": "Day total",
      "dash.lanc.total": "Total",
      "dash.lanc.empty": "No transactions yet. Add the first one above.",
      "dash.lanc.emptyMonth":
        "No transactions in this reference month. Other months stay saved; use «Displayed month» or the dashboard card icon to switch.",
      "dash.lanc.emptyFilter":
        "No transactions this month match the selected filters. Adjust category, method or origin to see other records.",
      "dash.lanc.totalsTitle": "Monthly totals by category",
      "dash.lanc.refEmpty": "No expenses saved in this browser yet.",
      "dash.lanc.refList":
        "List filtered by {month}{current}. {filters}Without installments: only transactions dated in this month appear. With installments — badge (installment/total), installment number in red — the same item appears in each month with that installment’s amount; the purchase date stays in the first column.",
      "dash.lanc.refCurrent": " (current month)",
      "dash.lanc.refFilters": "Active filters: {list}. ",
      "dash.lanc.refFilterDate": "date",
      "dash.lanc.refFilterCat": "category",
      "dash.lanc.refFilterMethod": "method",
      "dash.lanc.refFilterOrigin": "origin",

      "dash.panel.fixas": "Fixed bills",
      "dash.panel.fixasHint":
        "Expenses that repeat every month (rent, subscriptions, plans). Card subscription: Credit method + card origin — no need to log again in Transactions. One-off card purchases still go in Transactions. Outside credit, fill paid amount when you pay; on Credit, the expense enters via that month’s charge.",
      "dash.panel.cartoes": "Cards",
      "dash.panel.metas": "Goals",
      "dash.panel.metasHint":
        "Set a spending ceiling per category (same as Transactions). The bar fills as you spend (green → yellow at 80% → red at 100%). Spend = transactions + fixed bills for the reference month.",
      "dash.metas.renda": "Income",
      "dash.metas.gasto": "Spent",
      "dash.metas.alertas": "Alerts",
      "dash.metas.focus": "Category in focus",
      "dash.metas.uso": "Goal usage",
      "dash.metas.meta": "Goal",
      "dash.metas.resta": "Left",
      "dash.metas.definir": "Set goal ceiling",
      "dash.metas.salvar": "Save goal",
      "dash.metas.composicao": "Spend breakdown",
      "dash.metas.total": "Total",
      "dash.metas.somaMetas": "Sum of goals",
      "dash.metas.porRisco": "By risk",
      "dash.metas.alertEstourou": "went over the goal",
      "dash.metas.alertAtencao": "at {pct}% of the goal — watch out",
      "dash.metas.tetoMes": "Monthly ceiling:",
      "dash.metas.semTeto": "No ceiling set — enter a goal below",
      "dash.metas.definaTeto": "Set a ceiling to track",
      "dash.metas.semGasto": "No spend yet",
      "dash.metas.pctUsado": "{pct}% of goal used",
      "dash.metas.statusSemMeta": "Set a goal for this category",
      "dash.metas.statusEstourou": "Goal exceeded",
      "dash.metas.statusPerto": "Near the ceiling — avoid more spend here",
      "dash.metas.statusLivre": "Open goal — no spend yet",
      "dash.metas.statusOk": "Within goal",
      "dash.metas.pctMetasUsadas": "{pct}% of goals used",
      "dash.metas.pesoMetaTitle": "How much this goal is of the total goals",
      "dash.panel.juros": "Interest/fees",
      "dash.panel.invest": "Compound interest simulator",
      "dash.panel.patrimonio": "Invested net worth",
      "dash.panel.ativos": "My Assets",
      "dash.panel.bitcoin": "Bitcoin",
      "dash.common.month": "Month",
      "dash.common.year": "Year",
      "dash.cloud.savedAuto": "Saved automatically",
      "dash.cloud.saved": "Saved to cloud",

      "dash.home.totalGastos": "Total spending this month",
      "dash.home.refPrefix": "Reference: ",
      "dash.home.currentMonth": " (current month)",
      "dash.home.note": "Note",
      "dash.home.noteTitle": "Notes for this expense reference month",
      "dash.home.nextDue": "Next due date",
      "dash.home.nextDueHint":
        "Nearest due date (no payment recorded that month). Icon: full list.",
      "dash.home.nextDueList": "Upcoming due dates",
      "dash.home.nextDueListHint":
        "Sorted nearest to farthest (bills without a payment date that month).",
      "dash.home.nextDueEmpty": "No upcoming due dates found.",
      "dash.home.income": "Monthly income",
      "dash.home.changeMonth": "Change month",
      "dash.home.monthOfYear": "{month} {year}",
      "dash.home.history": "History",
      "dash.home.historyDesc": "Last 12 months — income and expenses by month.",
      "dash.home.historyDescUntil":
        "Last 12 months through {month}. Lighter bars = expense reference month.",
      "dash.home.compare": "Compare",
      "dash.home.expenses": "Expenses",
      "dash.home.incomeShort": "Income",
      "dash.home.historyEmpty": "No income or expense data in the last 12 months.",
      "dash.home.showValue": "Show value",
      "dash.home.hideValue": "Hide value",
      "dash.home.showExpenses": "Show expense amount",
      "dash.home.hideExpenses": "Hide expense amount",
      "dash.home.showIncome": "Show income amount",
      "dash.home.hideIncome": "Hide income amount",
      "dash.home.catPctCurrent":
        "Share by category in the current month · Month transactions + paid fixed bills outside credit + fixed bills on credit",
      "dash.home.catPctMonth":
        "Share by category in {month} · Month transactions + paid fixed bills outside credit + fixed bills on credit",
      "dash.home.close": "Close",
      "dash.home.cancel": "Cancel",
      "dash.home.refMonthTitle": "Spending reference month",
      "dash.home.goCurrentMonth": "Go to current month",
      "dash.home.gastosExplain":
        "Transactions (all methods) + paid fixed bills outside credit + fixed bills on credit for this month’s charge + interest/fees. Paying a card statement is not included here, because the expense was already added in the transaction or the fixed bill on credit.",
      "dash.home.pieNoCredit": "Spending outside credit",
      "dash.home.pieNoCreditHint":
        "Transactions (excluding Credit) and fixed bills outside credit with paid amount filled, by method: Debit, Pix, Cash, Meal voucher and other.",
      "dash.home.pieNoCreditEmpty":
        "No non-credit spending this month (transactions or paid non-credit fixed bills).",
      "dash.home.pieCard": "Card spending",
      "dash.home.pieCardHint":
        "Transactions with Credit method and fixed bills on Credit, by origin (card). Paying the statement is not included here.",
      "dash.home.pieCardEmpty": "No credit spending this month.",
      "dash.home.pieCat": "Spending by category",
      "dash.home.pieCatEmpty": "No spending this month for this chart.",
      "dash.home.incomeDetailTitle": "Monthly income — detail ({month})",
      "dash.home.incomeDetailDesc":
        'Add up the subcategories below; use <strong class="text-zinc-300">{add}</strong> for more lines. The total updates <strong class="text-zinc-300">{month}</strong> income on the dashboard card and the «{changeMonth}» button.',
      "dash.home.addSubcat": "Add subcategory",
      "dash.home.incomeTotal": "Total ({month}): {amount}",
      "dash.home.saveThisMonth": "Save only this month",
      "dash.home.saveFollowing": "Save this and following months",
      "dash.home.saveHint":
        "«{saveThis}» saves only in {monthYear}, with all subcategories and amounts. «{saveFollowing}» copies the same breakdown (including extra lines) from {month} through {december} (disabled if the displayed month is {december}).",
      "dash.home.december": "December",
      "dash.home.saveFollowingDisabled": "There are no following months after December in the same year.",
      "dash.home.detailIncomeOf": "Break down {month} income by subcategories",
    },
  };

  function normalizeLang(raw) {
    if (!raw) return null;
    var s = String(raw).toLowerCase();
    if (s === "en" || s.indexOf("en") === 0) return "en";
    if (s === "pt" || s.indexOf("pt") === 0) return "pt";
    return null;
  }

  function detectLang() {
    try {
      var stored = normalizeLang(localStorage.getItem(STORAGE_KEY));
      if (stored) return stored;
    } catch (e) {}
    try {
      var nav = navigator.language || (navigator.languages && navigator.languages[0]) || "pt";
      return normalizeLang(nav) || "pt";
    } catch (e2) {
      return "pt";
    }
  }

  var current = detectLang();

  function t(key) {
    var pack = dict[current] || dict.pt;
    if (pack[key] != null) return pack[key];
    if (dict.pt[key] != null) return dict.pt[key];
    return key;
  }

  function setHtmlLang() {
    try {
      document.documentElement.lang = current === "en" ? "en" : "pt-BR";
      document.documentElement.setAttribute("data-lang", current);
    } catch (e) {}
  }

  function applyI18n(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(key);
    });
    scope.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (!key) return;
      el.innerHTML = t(key);
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      el.setAttribute("placeholder", t(key));
    });
    scope.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-title");
      if (!key) return;
      el.setAttribute("title", t(key));
    });
    scope.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (!key) return;
      el.setAttribute("aria-label", t(key));
    });

    var titleEl = document.querySelector('meta[name="description"]');
    var pageTitle = document.querySelector("title[data-i18n-doc]");
    if (pageTitle) pageTitle.textContent = t(pageTitle.getAttribute("data-i18n-doc"));
    var metaDesc = document.querySelector('meta[name="description"][data-i18n-doc]');
    if (metaDesc) metaDesc.setAttribute("content", t(metaDesc.getAttribute("data-i18n-doc")));

    document.querySelectorAll("[data-gfp-lang-btn]").forEach(function (btn) {
      btn.textContent = t("lang.switchTo");
      btn.setAttribute("title", t("lang.switchTitle"));
      btn.setAttribute("aria-label", t("lang.aria") + ": " + t("lang.switchTitle"));
    });

    document.querySelectorAll("[data-lang-block]").forEach(function (el) {
      var block = el.getAttribute("data-lang-block");
      if (block === current) {
        el.classList.remove("hidden");
        el.removeAttribute("hidden");
      } else {
        el.classList.add("hidden");
        el.setAttribute("hidden", "");
      }
    });
  }

  function setLang(lang, opts) {
    var next = normalizeLang(lang) || "pt";
    if (next === current && !(opts && opts.force)) {
      applyI18n();
      return;
    }
    current = next;
    try {
      localStorage.setItem(STORAGE_KEY, current);
    } catch (e) {}
    setHtmlLang();
    applyI18n();
    try {
      document.dispatchEvent(
        new CustomEvent("gfp:langchange", { detail: { lang: current } })
      );
    } catch (e2) {}
  }

  function toggleLang() {
    setLang(current === "en" ? "pt" : "en");
  }

  function createLangButton(extraClass) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-gfp-lang-btn", "1");
    btn.className =
      extraClass ||
      "inline-flex shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold tracking-wide text-zinc-200 transition hover:bg-white/10 hover:text-white";
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      toggleLang();
    });
    return btn;
  }

  function mountLangToggle(target, extraClass) {
    if (!target) return null;
    var existing = target.querySelector("[data-gfp-lang-btn]");
    if (existing) {
      applyI18n(target);
      return existing;
    }
    var btn = createLangButton(extraClass);
    target.appendChild(btn);
    applyI18n(btn.parentNode || document);
    return btn;
  }

  setHtmlLang();

  global.GFP = global.GFP || {};
  global.GFP.i18n = {
    t: t,
    getLang: function () {
      return current;
    },
    isEn: function () {
      return current === "en";
    },
    localeTag: function () {
      return current === "en" ? "en-US" : "pt-BR";
    },
    currencyCode: function () {
      return current === "en" ? "USD" : "BRL";
    },
    setLang: setLang,
    toggleLang: toggleLang,
    applyI18n: applyI18n,
    mountLangToggle: mountLangToggle,
    createLangButton: createLangButton,
    dict: dict,
  };
  global.GFP.t = t;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      applyI18n();
    });
  } else {
    applyI18n();
  }
})(typeof window !== "undefined" ? window : this);
