const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat
} = require("docx");

// ============================================================
// DESIGN TOKENS
// ============================================================
const C = {
  primary: "1B4F72", secondary: "2E86C1", success: "27AE60", warning: "F39C12",
  dark: "2C3E50", light: "ECF0F1", white: "FFFFFF",
  headerBg: "1B4F72", headerText: "FFFFFF",
  rowAlt: "EBF5FB", rowNormal: "FFFFFF",
  tipBg: "E8F8F5", warnBg: "FEF9E7", noteBg: "EBF5FB", conceptBg: "F4ECF7",
  scenarioBg: "FDEBD0", faqBg: "F2F4F4", cardBg: "D5F5E3",
};
const FONT = "Calibri";
const PW = 12240;
const PM = { top: 1440, right: 1260, bottom: 1440, left: 1260 };
const CW = PW - PM.left - PM.right;

// ============================================================
// HELPERS
// ============================================================
function bdr(color = "CCCCCC") {
  const b = { style: BorderStyle.SINGLE, size: 1, color };
  return { top: b, bottom: b, left: b, right: b };
}

function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 }, children: [new TextRun({ text, font: FONT })] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 160 }, children: [new TextRun({ text, font: FONT })] }); }
function h3(text) { return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 }, children: [new TextRun({ text, font: FONT })] }); }

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, ...(opts.spacing || {}) },
    alignment: opts.align || AlignmentType.LEFT,
    children: [new TextRun({ text, font: FONT, size: opts.size || 22, bold: opts.bold, color: opts.color, italics: opts.italics })]
  });
}

function pCenter(text, size = 22, opts = {}) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: opts.after || 100, before: opts.before || 0 }, children: [new TextRun({ text, font: FONT, size, bold: opts.bold, color: opts.color || C.dark, italics: opts.italics })] });
}

function empty(n = 1) { const r = []; for (let i = 0; i < n; i++) r.push(new Paragraph({ spacing: { after: 60 }, children: [] })); return r; }
function pb() { return new Paragraph({ children: [new PageBreak()] }); }

function box(text, bg, tc = C.dark) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      borders: bdr(bg), width: { size: CW, type: WidthType.DXA },
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 200, right: 200 },
      children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 22, color: tc })] })]
    })] })]
  });
}

function tip(t) { return box("\uD83D\uDCA1 " + t, C.tipBg); }
function warn(t) { return box("\u26A0\uFE0F " + t, C.warnBg); }
function note(t) { return box("\uD83D\uDCDD " + t, C.noteBg); }
function concept(t) { return box("\uD83C\uDFAF " + t, C.conceptBg); }
function scenario(t) { return box("\uD83C\uDFAC " + t, C.scenarioBg); }
function faqBox(t) { return box("\u2753 " + t, C.faqBg); }
function cardBox(t) { return box(t, C.cardBg); }

function tbl(headers, rows, colWidths) {
  const tw = colWidths.reduce((a, b) => a + b, 0);
  const trs = [];
  trs.push(new TableRow({
    children: headers.map((h, i) => new TableCell({
      borders: bdr("1B4F72"), width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: C.headerBg, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: h, font: FONT, size: 20, bold: true, color: C.headerText })] })]
    }))
  }));
  rows.forEach((row, ri) => {
    trs.push(new TableRow({
      children: row.map((cell, ci) => new TableCell({
        borders: bdr("D5D8DC"), width: { size: colWidths[ci], type: WidthType.DXA },
        shading: { fill: ri % 2 === 0 ? C.rowNormal : C.rowAlt, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: String(cell), font: FONT, size: 20 })] })]
      }))
    }));
  });
  return new Table({ width: { size: tw, type: WidthType.DXA }, columnWidths: colWidths, rows: trs });
}

function stepTable(rows3col) {
  // "Quem / O que" tables for the 12-step workflow
  return tbl(["Quem", "O que"], rows3col, [1600, CW - 1600]);
}

function bullet(text) {
  return new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text, font: FONT, size: 22 })] });
}

function numItem(text, ref = "numbers") {
  return new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text, font: FONT, size: 22 })] });
}

function flow(steps) { return box(steps.join("  \u27A1\uFE0F  "), "EBF5FB", C.primary); }

// ============================================================
// CONTENT SECTIONS
// ============================================================

function cover() {
  return [
    ...empty(5),
    pCenter("\uD83D\uDEE1\uFE0F", 80),
    pCenter("Framework de Qualidade", 56, { bold: true, color: C.primary }),
    pCenter("para Claude Code", 48, { bold: true, color: C.secondary }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.secondary, space: 1 } }, children: [] }),
    pCenter("Guia Pratico para Comecar Hoje", 32, { color: C.dark }),
    pCenter("Versao 4+", 28, { color: C.secondary }),
    pCenter("\uD83D\uDCD8 do zero ao primeiro projeto seguro", 24, { italics: true }),
    ...empty(2),
    pCenter("\uD83C\uDFAF   \uD83D\uDD12   \uD83D\uDE80   \u2705   \uD83E\uDDE0   \uD83D\uDD27", 28),
    pCenter("plano \u2022 seguranca \u2022 velocidade \u2022 validacao \u2022 memoria \u2022 automacao", 20, { italics: true }),
    ...empty(3),
    pCenter("9 camadas de verificacao \u2022 30 commands \u2022 8 agents \u2022 12 hooks", 20, { color: C.secondary }),
    pCenter("4 camadas de defesa \u2022 30+ rules \u2022 16+ artefatos de runtime", 20, { color: C.secondary }),
    ...empty(2),
    pCenter("Abril 2026", 20),
    pb()
  ];
}

function welcome() {
  return [
    h1("\uD83D\uDC4B Bem-vindo(a)!"),
    p("Se voce chegou ate aqui, provavelmente quer usar o Claude Code para construir software \u2014 e quer fazer isso direito, sem acidentes, sem retrabalho, sem bugs escondidos que aparecem so em producao."),
    p("Este guia foi escrito pensando em voce. Nao importa se voce e desenvolvedor experiente, iniciante curioso ou gerente que so quer entender como funciona \u2014 aqui voce encontra o framework completo explicado do jeito mais simples possivel."),
    ...empty(),
    h2("\uD83C\uDFAF O que este guia vai te ensinar"),
    p("Como configurar o framework, como usar cada comando no dia a dia, o que acontece automaticamente enquanto voce trabalha, e como tudo se conecta para produzir codigo de qualidade senior de forma consistente."),
    ...empty(),
    h2("\uD83D\uDCA1 Para quem e este guia"),
    p("Para qualquer pessoa que queira usar o Claude Code com um fluxo de trabalho estruturado. Voce nao precisa entender os detalhes internos \u2014 basta seguir os passos e o framework faz o trabalho pesado de garantir qualidade."),
    ...empty(),
    h2("\uD83D\uDCDA O que voce vai encontrar neste guia"),
    tbl(["#", "Secao", "O que tem la"], [
      ["1", "\uD83C\uDFC1 O que e o framework", "Visao geral em 2 minutos"],
      ["2", "\u2699\uFE0F Instalacao", "Como colocar no seu projeto"],
      ["3", "\uD83D\uDDFA\uFE0F O fluxo completo", "Do zero ao produto entregue"],
      ["4", "\uD83E\uDDED Os 12 passos do dia a dia", "Passo a passo com exemplo real"],
      ["5", "\uD83E\uDD16 O que acontece automaticamente", "Hooks que vigiam tudo por voce"],
      ["6", "\uD83D\uDEE1\uFE0F As 4 camadas de defesa", "Como o framework te protege"],
      ["7", "\uD83D\uDD27 Comandos que voce usa", "Tabela completa (30 commands)"],
      ["8", "\uD83E\uDDE0 Agentes que te ajudam", "Quem faz o que nos bastidores"],
      ["9", "\uD83D\uDCDC As regras do jogo", "O que o framework impede"],
      ["10", "\uD83D\uDCE1 Camadas avancadas", "Sensores, contratos, behaviours, linters, KB, gaps"],
      ["11", "\uD83D\uDCC1 Runtime e persistencia", "Artefatos e onde vivem"],
      ["12", "\uD83C\uDFAC Cenarios praticos", "Situacoes reais e como resolver"],
      ["13", "\u2753 Perguntas frequentes", "Tira-duvidas rapido"],
      ["14", "\uD83D\uDDC2\uFE0F Cartao de referencia", "Para imprimir e deixar ao lado"],
      ["15", "\uD83D\uDCD6 Glossario", "Todos os termos explicados"],
    ], [500, 2600, CW - 3100]),
    pb()
  ];
}

function sec1_whatIs() {
  return [
    h1("1. \uD83C\uDFC1 O que e o framework"),
    p("Imagine um colega senior experiente sentado ao seu lado enquanto voce programa. Ele te lembra de planejar antes de codar, revisa seu trabalho, aponta problemas de seguranca, documenta suas decisoes e impede que voce esqueca de rodar testes."),
    p("Agora imagine que esse colega nunca fica cansado, nunca esquece nada e funciona 24 horas por dia, em qualquer projeto seu. Esse e o framework."),
    ...empty(),
    concept("O framework transforma o Claude Code de um assistente que 'faz codigo' em um parceiro que 'entrega software com qualidade senior' \u2014 guiado por regras, verificado por camadas e validado por uma segunda IA independente."),
    ...empty(),
    h2("\uD83E\uDDF1 Os 4 pilares"),
    tbl(["", "Pilar", "O que faz"], [
      ["\uD83D\uDCCB", "Regras", "Dizem ao Claude Code como pensar e agir. Vivem em arquivos .md e sao carregadas automaticamente."],
      ["\u26A1", "Hooks", "Scripts que rodam sozinhos antes e depois de cada edicao. Bloqueiam erros obvios."],
      ["\uD83E\uDDE0", "Memoria", "Guarda o historico do projeto entre sessoes. Nada se perde quando voce fecha o terminal."],
      ["\uD83D\uDD0D", "Cross-review", "Uma segunda IA (Codex) revisa o trabalho do Claude Code de forma independente."],
    ], [500, 1200, CW - 1700]),
    ...empty(),
    h2("\uD83C\uDF81 O que voce ganha"),
    tbl(["", "Beneficio"], [
      ["\u2705", "Planejamento obrigatorio antes de codar"],
      ["\u2705", "Revisao de seguranca em cada edicao"],
      ["\u2705", "Testes e cobertura verificados automaticamente"],
      ["\u2705", "Decisoes documentadas sem esforco"],
      ["\u2705", "Duas IAs checando seu trabalho"],
      ["\u2705", "Memoria persistente entre sessoes"],
      ["\u2705", "Menos bugs, menos retrabalho, menos surpresas"],
      ["\u2705", "9 camadas de verificacao mecanica (sensores, linters, behaviours...)"],
    ], [500, CW - 500]),
    pb()
  ];
}

function sec2_install() {
  return [
    h1("2. \u2699\uFE0F Instalacao"),
    p("A instalacao e simples: voce copia a pasta do framework para o seu projeto e esta pronto. O Claude Code detecta automaticamente os arquivos e passa a seguir as regras."),
    ...empty(),
    h2("\uD83D\uDCE5 Passo a passo"),
    tbl(["Passo", "Acao", "Detalhe"], [
      ["1", "\uD83D\uDCE6 Baixe o framework", "Clone o repositorio do framework ou baixe o ZIP. Ele contem a pasta .claude/ completa com tudo que voce precisa."],
      ["2", "\uD83D\uDCC2 Copie 3 itens para o seu projeto", "Copie para a raiz do seu projeto: (1) a pasta .claude/ inteira, (2) o arquivo CLAUDE.md e (3) o arquivo AGENTS.md. Esses 3 sao obrigatorios."],
      ["3", "\u26A0\uFE0F Limpe arquivos residuais", "Se veio o arquivo .claude/settings.local.json, DELETE-o (contem permissoes do projeto anterior). Se veio .claude/runtime/.plan-approved, DELETE-o tambem. Esses arquivos sao gerados em tempo de execucao e nao devem ser copiados entre projetos."],
      ["4", "\uD83D\uDD11 De permissao aos scripts", "No Linux ou Mac, rode chmod +x .claude/hooks/*.sh para que os scripts possam ser executados. No Windows com Git Bash, o framework ja cuida disso."],
      ["5", "\uD83D\uDCBB Abra o Claude Code", "Abra o terminal na pasta do projeto e inicie o Claude Code. Ele vai carregar automaticamente as regras e ativar os hooks."],
      ["6", "\u2705 Verifique se esta tudo certo", "Na primeira mensagem, digite /status-check. Se aparecer um resumo do estado do projeto, deu certo."],
    ], [700, 2400, CW - 3100]),
    ...empty(),
    h2("\uD83D\uDD27 Dependencia importante"),
    warn("O framework usa a ferramenta jq para processar dados dos hooks. A maioria dos sistemas ja tem, mas se o framework reclamar, instale com: apt install jq (Linux), brew install jq (Mac) ou baixe do site oficial (Windows)."),
    ...empty(),
    h2("\uD83C\uDF10 Revisor externo (opcional mas recomendado)"),
    p("Para ativar a segunda IA revisora (Codex/GPT-5.4), siga estes passos:"),
    numItem("Instale o Codex CLI: npm install -g @openai/codex"),
    numItem("Faca login: codex login"),
    numItem("Instale o plugin no Claude Code: /install-plugin openai/codex-plugin-cc"),
    numItem("Recarregue: /reload-plugins"),
    numItem("Configure o AGENTS.md na raiz do projeto (template incluido no framework)"),
    ...empty(),
    tip("Sem o Codex voce ainda tem o framework completo, mas perde a camada de validacao cross-model (Camada 4). O framework preenche o AGENTS.md automaticamente quando o /spec-check da READY ou READY WITH ASSUMPTIONS."),
    ...empty(),
    h2("\uD83D\uDCE1 Sensores \u2014 Configuracao inicial"),
    p("Sensores sao verificacoes mecanicas (testes, lint, build) que o framework executa. Para configura-los:"),
    numItem("Copie .claude/runtime/sensors.template.json para .claude/runtime/sensors.json", "install"),
    numItem("Edite para refletir a stack real do seu projeto (remova sensores nao aplicaveis)", "install"),
    numItem("Rode /sensors-run para estabelecer o baseline", "install"),
    numItem("Comite sensors.json no repositorio", "install"),
    ...empty(),
    tip("Projetos sem sensors.json operam em modo degradado \u2014 o framework funciona, mas reporta a ausencia como lacuna."),
    pb()
  ];
}

function sec3_flow() {
  return [
    h1("3. \uD83D\uDDFA\uFE0F O fluxo completo"),
    p("Todo projeto no framework passa por 5 grandes fases. Cada fase tem um comando que voce usa para avancar. Entre as fases, existem portoes de verificacao \u2014 se algo esta errado, o framework nao deixa voce passar."),
    ...empty(),
    h2("\uD83C\uDFAF A jornada em 5 fases"),
    tbl(["Fase", "", "Comandos", "O que acontece"], [
      ["1\uFE0F\u20E3", "Especificar", "/spec-create \u2192 /spec-check", "Voce descreve o que quer. O framework transforma em documento rigoroso."],
      ["2\uFE0F\u20E3", "Planejar", "/plan \u2192 /plan-review", "O framework desenha como construir, e outra camada verifica o plano."],
      ["3\uFE0F\u20E3", "Implementar", "codigo + /review", "Voce escreve codigo. O framework revisa e aponta melhorias."],
      ["4\uFE0F\u20E3", "Auditar", "/audit + variantes", "Analise profunda de seguranca, banco, web, kubernetes."],
      ["5\uFE0F\u20E3", "Entregar", "/verify-spec \u2192 /ship-check", "Confirma que o prometido foi entregue e esta pronto para sair."],
    ], [600, 1200, 2600, CW - 4400]),
    ...empty(),
    h2("\uD83D\uDEA6 Os portoes de verificacao"),
    p("Entre as fases existem checkpoints que o framework impoe. Voce nao pode pular \u2014 eles garantem que o trabalho esta consistente antes de avancar."),
    tbl(["Portao", "Quando", "O que checa"], [
      ["\uD83D\uDEAA Portao 1", "Depois do /spec-create", "Spec esta clara, completa e sem ambiguidades bloqueantes"],
      ["\uD83D\uDEAA Portao 2", "Depois do /plan", "O /plan-review aprova o plano. Hook BLOQUEIA codigo sem esse OK"],
      ["\uD83D\uDEAA Portao 3", "Durante implementacao", "Cada edicao passa por hooks que checam secrets, sintaxe, padroes"],
      ["\uD83D\uDEAA Portao 4", "Antes da entrega", "O /ship-check faz pente fino em build, testes, seguranca e riscos"],
    ], [1400, 2400, CW - 3800]),
    ...empty(),
    flow(["spec-create", "spec-check", "plan", "plan-review", "implementar", "review/audit", "verify-spec", "ship-check"]),
    pb()
  ];
}

function sec4_12steps() {
  return [
    h1("4. \uD83E\uDDED Os 12 passos do dia a dia"),
    p("Aqui esta o fluxo completo, passo a passo. Siga na ordem e o framework garante o resto."),
    note("Cada passo tem 3 blocos: \uD83D\uDC64 o que VOCE faz, \uD83E\uDD16 o que o FRAMEWORK faz, e \u2705 como saber que FUNCIONOU. Se voce esta comecando, so siga a coluna VOCE \u2014 o resto acontece sozinho."),
    ...empty(),

    h3("Passo 1 \u2014 \uD83D\uDCDD Criar a especificacao"),
    p("Tudo comeca descrevendo o que voce quer construir. Nao precisa ser tecnico."),
    stepTable([
      ["\uD83D\uDC64 Voce", "Digita /spec-create e responde as perguntas sobre o produto que quer construir."],
      ["\uD83E\uDD16 Framework", "Faz perguntas guiadas sobre objetivo, publico, telas, dados, regras de negocio e escopo. No final, gera documento estruturado."],
      ["\u2705 Sinal de OK", "Apareceu especificacao completa com requisitos numerados (AUTH-01, TASK-02), telas, modelo de dados e criterios de aceite."],
    ]),
    tip("Voce pode comecar com algo simples: 'Quero criar um site para controlar financas pessoais.' O framework faz o resto."),
    ...empty(),

    h3("Passo 2 \u2014 \uD83D\uDD0E Validar a especificacao"),
    stepTable([
      ["\uD83D\uDC64 Voce", "Digita /spec-check."],
      ["\uD83E\uDD16 Framework", "Le a spec, procura lacunas, classifica cada problema e da veredicto: READY, READY WITH ASSUMPTIONS ou BLOCKED."],
      ["\u2705 Sinal de OK", "Veredicto READY ou READY WITH ASSUMPTIONS. Se vier BLOCKED, lista exatamente o que precisa ser resolvido antes de implementar."],
    ]),
    warn("Se der BLOCKED: nao tente contornar. Responda as perguntas e rode /spec-check de novo. Cada ambiguidade ignorada vira um bug futuro."),
    ...empty(),

    h3("Passo 3 \u2014 \uD83C\uDFA8 Escolher o visual (se tem UI)"),
    stepTable([
      ["\uD83D\uDC64 Voce", "Digita /design-preview e depois /ui-plan."],
      ["\uD83E\uDD16 Framework", "Gera opcoes de paleta, tipografia, espacamento, componentes base. Voce escolhe e o framework congela o padrao visual."],
      ["\u2705 Sinal de OK", "Design System aprovado. Telas futuras seguem automaticamente essa identidade visual."],
    ]),
    ...empty(),

    h3("Passo 4 \u2014 \uD83D\uDDFA\uFE0F Planejar a implementacao"),
    stepTable([
      ["\uD83D\uDC64 Voce", "Digita /plan."],
      ["\uD83E\uDD16 Framework", "Desenha plano completo: objetivo, contexto, abordagem, justificativas, riscos. Se envolve migracao ou operacao irreversivel, chama agente de risco automaticamente."],
      ["\u2705 Sinal de OK", "Plano apresentado no chat. Voce le, aprova ou pede ajustes."],
    ]),
    concept("Mesmo para mudancas simples, o plano e obrigatorio. Essa disciplina evita os erros mais comuns."),
    ...empty(),

    h3("Passo 5 \u2014 \u2705 Revisar o plano"),
    stepTable([
      ["\uD83D\uDC64 Voce", "Digita /plan-review."],
      ["\uD83E\uDD16 Framework", "Chama dois agentes em paralelo: um compara plano com spec, outro checa coerencia interna. Devolve APPROVED, APPROVED_WITH_CORRECTIONS, NEEDS_REVISION ou NEEDS_HUMAN_REVIEW, com findings BLOCKING, NON-BLOCKING ou EDITORIAL. Quando aplicavel, inclui APPLICABLE_DELTA para orientar correcoes diretamente aplicaveis."],
      ["\u2705 Sinal de OK", "Plano APPROVED ou APPROVED_WITH_CORRECTIONS. O framework cria marker .plan-approved que libera o proximo passo. NEEDS_REVISION ou NEEDS_HUMAN_REVIEW nao liberam implementacao."],
    ]),
    warn("Portao mecanico: um hook BLOQUEIA criacao de codigo enquanto o plano nao for aprovado pelo /plan-review. Nao e sugestao \u2014 e impedimento real."),
    ...empty(),

    h3("Passo 6 \u2014 \u2328\uFE0F Implementar o codigo"),
    stepTable([
      ["\uD83D\uDC64 Voce", "Pede 'implemente a Fase 1 do plano' ou equivalente."],
      ["\uD83E\uDD16 Framework", "Escreve codigo arquivo por arquivo. A cada edicao, hooks rodam automaticamente checando sintaxe, secrets, padroes, design tokens, qualidade."],
      ["\u2705 Sinal de OK", "Arquivos criados sem alertas dos hooks. Codigo sintaticamente valido e sem problemas obvios."],
    ]),
    ...empty(),

    h3("Passo 7 \u2014 \uD83D\uDD0D Revisar o codigo"),
    stepTable([
      ["\uD83D\uDC64 Voce", "Digita /review."],
      ["\uD83E\uDD16 Framework", "Chama em paralelo: revisor de codigo (qualidade senior), auditor de seguranca (vulnerabilidades) e auditor de QA (cobertura de testes)."],
      ["\u2705 Sinal de OK", "Review publicado com findings classificados por gravidade (CRITICO, ALTO, MEDIO, BAIXO)."],
    ]),
    ...empty(),

    h3("Passo 8 \u2014 \uD83D\uDEE1\uFE0F Auditoria profunda (quando aplicavel)"),
    tbl(["Comando", "Foco"], [
      ["/audit", "Auditoria geral de seguranca e qualidade"],
      ["/db-audit", "Foco em banco de dados: queries, indices, seguranca, integridade"],
      ["/web-audit", "Foco em APIs web: autenticacao, autorizacao, XSS, CSRF, CORS"],
      ["/k8s-audit", "Foco em Kubernetes: privilegios, network policies, secrets, RBAC"],
    ], [1600, CW - 1600]),
    tip("Nao precisa rodar todas. Use /audit como padrao. Adicione as variantes conforme o projeto."),
    ...empty(),

    h3("Passo 9 \u2014 \uD83E\uDE79 Corrigir o que apareceu"),
    stepTable([
      ["\uD83D\uDC64 Voce", "Pede ao Claude Code para corrigir os findings, comecando pelos mais graves."],
      ["\uD83E\uDD16 Framework", "Aplica os fixes. Cada correcao passa pelos hooks novamente. Depois do fix, busca o mesmo padrao em TODO o projeto para evitar fix parcial."],
      ["\u2705 Sinal de OK", "Todos os CRITICOS e ALTOS corrigidos. Re-rodar /review confirma que os findings foram resolvidos."],
    ]),
    ...empty(),

    h3("Passo 10 \u2014 \uD83D\uDCDD Documentar as decisoes"),
    stepTable([
      ["\uD83D\uDC64 Voce", "Digita /justify."],
      ["\uD83E\uDD16 Framework", "Gera bloco formatado com as justificativas tecnicas: decisao, alternativas rejeitadas, motivo."],
      ["\u2705 Sinal de OK", "Decisoes importantes viraram patrimonio do projeto."],
    ]),
    ...empty(),

    h3("Passo 11 \u2014 \uD83C\uDFAF Verificar contra a especificacao"),
    stepTable([
      ["\uD83D\uDC64 Voce", "Digita /verify-spec."],
      ["\uD83E\uDD16 Framework", "Compara cada requisito da spec com o codigo. Marca MATCH, PARCIAL ou MISS. Usa sensores, behaviours e contratos como evidencia mecanica. Para tokens marcados como [literal], grep e apenas sinal inicial: a conformidade exige binding rastreavel ao comportamento verificado."],
      ["\u2705 Sinal de OK", "Todos os requisitos v1 marcados como MATCH."],
    ]),
    ...empty(),

    h3("Passo 12 \u2014 \uD83D\uDE80 Checagem final de entrega"),
    stepTable([
      ["\uD83D\uDC64 Voce", "Digita /ship-check."],
      ["\uD83E\uDD16 Framework", "Checa: build, testes, lint, secrets, config, dependencias, observabilidade, performance. Valida sensores, contratos, behaviours, linters, KB e gaps. Chama risco final."],
      ["\u2705 Sinal de OK", "Veredicto PRONTO. Se PRONTO COM RESSALVAS, voce decide. Se NAO PRONTO, corrige antes."],
    ]),
    ...empty(),
    cardBox("\uD83C\uDF89 Chegou no veredicto PRONTO? Esta pronto para distribuir! O framework garantiu que o projeto passou por todas as camadas de qualidade."),
    pb()
  ];
}

function sec5_hooks() {
  return [
    h1("5. \uD83E\uDD16 O que acontece automaticamente"),
    p("Enquanto voce trabalha, o framework tem 12 scripts rodando automaticamente. Voce nao precisa chamar nenhum deles \u2014 eles se ativam sozinhos no momento certo."),
    ...empty(),
    h2("\u23F0 Quando cada um dispara"),
    tbl(["Momento", "Quando dispara", "O que acontece"], [
      ["\uD83D\uDE80 Inicio da sessao", "Quando abre ou retoma o Claude Code", "Health check valida que tudo esta instalado; gitignore-guard alerta se o .gitignore nao cobre os minimos da stack detectada"],
      ["\uD83D\uDEE1\uFE0F Antes de cada edicao", "Quando o Claude vai modificar arquivo", "Protect-files bloqueia arquivos sensiveis e pre-implementation-gate exige plan-review"],
      ["\u2705 Depois de cada edicao", "Assim que o arquivo e salvo", "Checks rodam: sintaxe, secrets, qualidade, design, determinismo, loop-detection e gitignore-guard"],
      ["\uD83D\uDCDD Quando voce fecha", "Ao finalizar a conversa", "Session-summary grava handoff operacional de 6 secoes"],
      ["\uD83E\uDDF9 Ao sair", "No encerramento da sessao", "Session-cleanup limpa temporarios (timeout 1.5s)"],
    ], [2000, 2600, CW - 4600]),
    ...empty(),
    h2("\uD83D\uDD0D O que eles protegem contra"),
    tbl(["", "Problema", "O que acontece"], [
      ["\uD83D\uDD11", "Secrets hardcoded", "API keys, senhas, tokens colados direto no codigo"],
      ["\uD83D\uDC80", "Codigo perigoso", "eval(), exec(), Function() e execucoes dinamicas"],
      ["\uD83C\uDFA8", "Cores soltas", "Hex codes misturados no lugar do design system"],
      ["\uD83C\uDFB2", "Nao-determinismo", "Math.random() e new Date() onde deveria ser fixo"],
      ["\uD83D\uDD12", "Arquivos sensiveis", "Edicoes em .git/, lockfiles, arquivos de build"],
      ["\uD83D\uDCCB", "Pulos de portao", "Codigo criado sem plan-review aprovado"],
      ["\u267B\uFE0F", "Loops de edicao", "Mesmo arquivo editado em circulo sem progresso (3a alerta, 5a bloqueio)"],
      ["\uD83D\uDEA7", "Sintaxe quebrada", "Python que nao compila, erros obvios"],
      ["\uD83D\uDEAB", ".gitignore incompleto", "Caches, builds, ambientes virtuais e artefatos de stack que poderiam ser commitados por engano"],
    ], [500, 2200, CW - 2700]),
    ...empty(),
    tip("Voce nao precisa lembrar de nada. Todos esses checks sao automaticos. Voce so vai perceber quando algo der problema \u2014 e ai o framework mostra exatamente o que, onde e como resolver."),
    pb()
  ];
}

function sec6_layers() {
  return [
    h1("6. \uD83D\uDEE1\uFE0F As 4 camadas de defesa"),
    p("O framework opera em 4 camadas complementares. Nenhuma substitui as outras:"),
    ...empty(),
    tbl(["Camada", "Tipo", "Quando ativa", "O que pega", "Exemplo"], [
      ["1 \u2014 Regras", "Declarativa", "Sempre", "Direcao e padroes", "'Validar entrada'"],
      ["2 \u2014 Hooks", "Mecanica auto", "Em evento", "Erros objetivos", "Secrets, syntax, loop"],
      ["3 \u2014 Memoria", "Comportamental", "Entre sessoes", "Erros de julgamento", "'Grep != prova de uso'"],
      ["4 \u2014 Cross-model", "Validacao indep.", "Apos command", "Blind spots", "Codex questiona Claude"],
    ], [1200, 1400, 1400, 2000, CW - 6000]),
    ...empty(),
    h2("\u2699\uFE0F Camada 1 \u2014 Regras (30+ rules)"),
    tbl(["Grupo", "Regras principais", "O que garantem"], [
      ["\uD83D\uDD10 Seguranca", "security, web-api-security, database-security, kubernetes-security", "Checklist de seguranca por area"],
      ["\u2705 Qualidade", "code-review, structural-quality, testing, implementation-quality", "Criterios senior aplicados em revisao"],
      ["\uD83D\uDCCB Spec e plano", "spec-quality, spec-creation-guide, plan-construction", "O que spec/plano pronto precisa ter"],
      ["\uD83C\uDFD7\uFE0F Estado", "state-management, state-sync, execution-tracking, context-loading", "Como rastrear fases e memoria"],
      ["\uD83E\uDD16 Agentes", "agent-contracts, review-quality", "Como agentes se comunicam"],
      ["\uD83D\uDCE1 Harness", "sensors, execution-contracts, sprint-contracts, behaviour-harness, architecture-linters", "Verificacao mecanica declarativa"],
      ["\uD83D\uDCDA Gestao", "knowledge-base, capability-gaps, recommended-skills", "Conhecimento e lacunas"],
    ], [1400, 3400, CW - 4800]),
    ...empty(),
    h2("\uD83C\uDF10 Camada 4 \u2014 Cross-Model (Codex)"),
    p("O Codex (GPT-5.4) e revisor adversarial. Claude implementa, Codex questiona \u2014 duas IAs de empresas diferentes. O Codex e chamado AUTOMATICAMENTE apos cada command do framework."),
    tbl(["Checkpoint", "O que o Codex valida"], [
      ["Apos /spec-create", "Completude, ambiguidades, viabilidade"],
      ["Apos /plan", "Plano vs spec, viabilidade tecnica"],
      ["Apos implementacao", "Implementacao completa e correta"],
      ["Apos /review e /audit", "Rigor da revisao, vulnerabilidades nao detectadas"],
      ["Antes de /ship-check", "Revisao final de seguranca e qualidade"],
    ], [2400, CW - 2400]),
    ...empty(),
    note("Aplicacao automatica: voce nunca precisa abrir uma regra manualmente. Quando um comando roda, ele ja sabe quais regras consultar."),
    pb()
  ];
}

function sec7_commands() {
  return [
    h1("7. \uD83D\uDD27 Comandos que voce usa"),
    p("Referencia completa dos 30 commands. Use como consulta rapida no dia a dia."),
    ...empty(),
    h2("\uD83C\uDFD7\uFE0F Especificacao e planejamento"),
    tbl(["Comando", "O que faz"], [
      ["/spec-create", "Cria a especificacao do projeto em modo conversa guiada"],
      ["/spec-check", "Valida se a especificacao esta pronta para implementar"],
      ["/plan", "Cria o plano de implementacao antes de codar"],
      ["/plan-review", "Revisa o plano (portao obrigatorio antes de implementar)"],
      ["/ui-plan", "Planejamento de interface com checkpoint visual"],
      ["/design-preview", "Gera opcoes de Design System para aprovacao"],
    ], [2000, CW - 2000]),
    ...empty(),
    h2("\uD83D\uDD0D Revisao e auditoria"),
    tbl(["Comando", "O que faz"], [
      ["/review", "Revisao de codigo em multiplas dimensoes (qualidade, seguranca, QA)"],
      ["/audit", "Auditoria completa de seguranca e qualidade"],
      ["/db-audit", "Auditoria focada em banco de dados"],
      ["/web-audit", "Auditoria focada em APIs e aplicacoes web"],
      ["/k8s-audit", "Auditoria focada em Kubernetes"],
    ], [2000, CW - 2000]),
    ...empty(),
    h2("\uD83C\uDFAF Verificacao e entrega"),
    tbl(["Comando", "O que faz"], [
      ["/verify-spec", "Verifica se cada requisito da spec foi implementado"],
      ["/ship-check", "Checagem final antes de entregar ou fazer deploy"],
      ["/justify", "Documenta as justificativas tecnicas das decisoes"],
    ], [2000, CW - 2000]),
    ...empty(),
    h2("\uD83E\uDDED Estado e manutencao"),
    tbl(["Comando", "O que faz"], [
      ["/status-check", "Mostra estado atual do projeto, pendencias e bloqueios"],
      ["/memory-consolidate", "Reorganiza a memoria do projeto"],
      ["/skills-gap", "Identifica lacunas e sugere skills externas"],
    ], [2000, CW - 2000]),
    ...empty(),
    h2("\uD83D\uDCE1 Camadas avancadas"),
    tbl(["Comando", "O que faz"], [
      ["/sensors-run", "Executa sensores mecanicos e produz veredicto por exit code"],
      ["/contract-create", "Cria contrato de execucao da fase (upstream)"],
      ["/contract-check", "Verifica estado do projeto contra contrato ativo"],
      ["/sprint-create", "Cria sprint contract (entrega atomica 1-2h)"],
      ["/sprint-evaluate", "Executa evaluator do sprint e registra verdict"],
      ["/sprint-close", "Fecha sprint com confirmacao humana"],
      ["/behaviour-run", "Executa behaviours runtime (expected vs actual)"],
      ["/lint-architecture", "Executa linters de invariantes estruturais"],
      ["/kb-update", "Atualiza knowledge base do projeto"],
      ["/kb-status", "Verifica estado da knowledge base"],
      ["/gaps-scan", "Detecta capability gaps (lacunas de verificacao)"],
      ["/gaps-status", "Verifica estado dos gaps"],
    ], [2000, CW - 2000]),
    pb()
  ];
}

function sec8_agents() {
  return [
    h1("8. \uD83E\uDDE0 Agentes que te ajudam"),
    p("Agentes sao 'especialistas virtuais' que o framework chama quando precisa de analise especifica. Voce nao chama agentes diretamente \u2014 os comandos fazem isso por voce."),
    ...empty(),
    h2("\uD83C\uDFAD Quem faz o que"),
    tbl(["Agente", "Especialidade", "Chamado por", "O que entrega"], [
      ["spec-creator", "Criar especificacao", "/spec-create", "Conduz discovery e estrutura a spec"],
      ["planner", "Planejar implementacao", "/plan", "Desenha plano tecnico completo"],
      ["spec-plan-validator", "Comparar plano x spec", "/plan-review", "Verifica se plano e fiel a spec"],
      ["consistency-checker", "Coerencia do plano", "/plan-review", "Checa contagens, dependencias, refs cruzadas"],
      ["code-reviewer", "Revisao de codigo", "/review", "Aplica criterios de dev senior"],
      ["security-auditor", "Auditoria de seguranca", "/audit e variantes", "Busca vulnerabilidades e blind spots"],
      ["qa-auditor", "Cobertura de testes", "/review", "Detecta codigo sem testes, classifica por risco"],
      ["risk-assessment", "Analise de risco", "/plan e /ship-check", "Avalia irreversibilidade, incognitas, debito"],
    ], [1600, 1800, 1800, CW - 5200]),
    ...empty(),
    h2("\uD83C\uDFAF Dois tipos de agente"),
    tbl(["Tipo", "Caracteristica", "Exemplo"], [
      ["\uD83D\uDD04 Transversal", "Aparece em varios comandos nao relacionados", "risk-assessment e chamado por /plan e /ship-check"],
      ["\uD83C\uDFAF Especializado", "Aparece em um comando ou familia coesa", "security-auditor e chamado por /audit, /web-audit, /db-audit, /k8s-audit"],
    ], [1400, 3600, CW - 5000]),
    ...empty(),
    tip("Voce nao precisa saber nada disso para usar o framework. Mas quando vir mensagens tipo 'invocando risk-assessment', vai entender do que se trata."),
    pb()
  ];
}

function sec9_rules() {
  return [
    h1("9. \uD83D\uDCDC As regras do jogo"),
    p("O framework tem 30+ regras em arquivos .md dentro da pasta .claude/rules/. Elas nao sao documentacao \u2014 sao ativamente aplicadas em cada comando."),
    ...empty(),
    tbl(["Grupo", "Regras principais", "O que garantem"], [
      ["\uD83D\uDD10 Seguranca", "security, web-api-security, database-security, kubernetes-security", "Checklists de seguranca por area"],
      ["\u2705 Qualidade de codigo", "code-review, structural-quality, testing, implementation-quality", "Criterios senior aplicados em revisao"],
      ["\uD83D\uDCCB Spec e plano", "spec-quality, spec-creation-guide, plan-construction", "O que uma spec/plano pronto precisa ter"],
      ["\uD83C\uDFD7\uFE0F Estado e observabilidade", "state-management, observability, performance", "Como lidar com estado, logs, performance"],
      ["\uD83C\uDFA8 Design e UI", "design-system-quality", "O que um bom Design System entrega"],
      ["\uD83D\uDD04 Execucao e memoria", "execution-tracking, state-sync, context-loading", "Como rastrear fases e memoria persistente"],
      ["\uD83E\uDD16 Agentes e review", "agent-contracts, review-quality", "Como agentes se comunicam e quando review e valido"],
      ["\uD83D\uDCCA Evidencia", "self-verification, evidence-tracing", "Todo achado precisa de prova rastreavel"],
      ["\uD83D\uDCE1 Harness mecanico", "sensors, execution-contracts, sprint-contracts, behaviour-harness, architecture-linters", "Verificacao mecanica declarativa"],
      ["\uD83D\uDCDA Gestao de conhecimento", "knowledge-base, capability-gaps, recommended-skills", "Conhecimento, lacunas e skills"],
    ], [1400, 3800, CW - 5200]),
    ...empty(),
    note("Voce nunca precisa abrir uma regra manualmente. Quando um comando roda, ele ja sabe quais regras consultar. Se quiser entender o porque de alguma coisa, pode abrir a regra."),
    pb()
  ];
}

function sec10_advanced() {
  return [
    h1("10. \uD83D\uDCE1 Camadas avancadas"),
    p("Alem do workflow basico (spec \u2192 plan \u2192 implement \u2192 review \u2192 ship), o framework oferece 7 camadas avancadas OPT-IN que adicionam verificacao mecanica profunda."),
    ...empty(),

    h2("\uD83D\uDCE1 Sensores Mecanicos"),
    concept("Verificacoes onde o EXIT CODE do comando e a verdade \u2014 nao a narrativa da IA. Se retorna 0, passou. Se retorna outro valor, FALHOU."),
    tbl(["Tipo", "O que verifica", "Exemplo"], [
      ["test", "Testes passam", "npm test, pytest"],
      ["lint", "Sem violacoes", "npm run lint, ruff"],
      ["type-check", "Tipos validos", "tsc --noEmit, mypy"],
      ["build", "Compila limpo", "npm run build"],
      ["security-scan", "Sem vulnerabilidades", "npm audit"],
      ["custom", "Qualquer verificacao", "Scripts shell"],
    ], [1600, 2800, CW - 4400]),
    flow(["sensors.json", "/sensors-run", "sensors-last-run.json", "/ship-check le"]),
    ...empty(),

    h2("\uD83D\uDCDC Execution Contracts"),
    concept("Declaracao UPSTREAM do que a fase promete. Plano = COMO. Contrato = O QUE. Ledger = O QUE ACONTECEU."),
    flow(["draft", "approved", "in_progress", "done / failed / deferred"]),
    tbl(["Campo chave", "O que declara"], [
      ["deliverables[]", "Arquivos/artefatos que devem existir"],
      ["acceptance_criteria[]", "Comportamentos observaveis (sensor/behaviour/manual)"],
      ["sensors_required[]", "Sensores que devem estar verdes"],
      ["architecture_linters_required[]", "Linters que devem passar"],
      ["out_of_scope[]", "O que NAO esta no escopo"],
    ], [3000, CW - 3000]),
    ...empty(),

    h2("\uD83C\uDFC3 Sprint Contracts"),
    concept("Unidades ATOMICAS de entrega (1-2h) com evaluator deterministico. Phase = dias/semanas. Sprint = horas."),
    warn("Invariante central: phase contract NUNCA e mutado por sprint. Vinculo e via filesystem."),
    tbl(["Check do Evaluator", "Verdict vem de"], [
      ["file_exists", "path existe no filesystem"],
      ["grep_pattern", "matches de regex em arquivo"],
      ["sensor_subset", "sensors-last-run.json"],
      ["custom_command", "exit code (timeout obrigatorio)"],
    ], [2000, CW - 2000]),
    ...empty(),

    h2("\uD83E\uDDEA Behaviour Harness"),
    concept("Behaviours DISPARAM acao real e COMPARAM resultado vs expectativa. Sensores = 'compila?'. Behaviours = 'quando executo X, FAZ Y?'"),
    tbl(["Tipo de Expectation", "O que compara"], [
      ["exit_code", "Exit code do comando bate com esperado"],
      ["stdout_contains", "stdout contem pattern esperado"],
      ["stdout_json_path", "filtro jq no stdout JSON bate"],
      ["file_content", "arquivo contem pattern esperado"],
      ["file_exists_after", "arquivo existe apos execucao"],
      ["not_contains", "stdout NAO contem pattern (negativa)"],
    ], [2000, CW - 2000]),
    note("Binding bidirecional: behaviour declara contract_ref e phase contract declara behaviour_id. Ambas as pontas devem existir."),
    ...empty(),

    h2("\uD83C\uDFD7\uFE0F Architecture Linters"),
    concept("Verificam INVARIANTES ESTRUTURAIS cross-file. Hooks = por arquivo. Sensores = build/test. Linters = estrutura."),
    tbl(["Categoria", "Exemplo"], [
      ["layering", "Screens nao importam de infra"],
      ["circular-deps", "A importa B importa A"],
      ["cross-file", "Rotas do router existem como arquivos"],
      ["naming", "PascalCase, hooks com use"],
      ["type-schema-match", "Frontend bate com backend"],
    ], [1800, CW - 1800]),
    ...empty(),

    h2("\uD83D\uDCDA Knowledge Base"),
    concept("VIEW CONSOLIDADA do conhecimento \u2014 mapa, nao atlas. 4 documentos concisos (50-150 linhas cada)."),
    tbl(["Documento", "Pergunta que responde"], [
      ["architecture.md", "Qual e a arquitetura deste projeto?"],
      ["quality-posture.md", "Qual a postura de qualidade agora?"],
      ["security-posture.md", "Qual a postura de seguranca agora?"],
      ["decisions-log.md", "Quais decisoes foram tomadas e por que?"],
    ], [2400, CW - 2400]),
    ...empty(),

    h2("\uD83D\uDD0D Capability Gap Tracking"),
    concept("Transforma observacoes TRANSITORIAS (NO_SENSORS, NEVER_RUN, STALE) em registro PERSISTENTE."),
    tbl(["Tipo de Gap", "Significado"], [
      ["declaration_absent", "Camada nao declarada (ex: sensors.json ausente)"],
      ["never_run", "Declarada mas nunca executada"],
      ["stale", "Resultado desatualizado"],
      ["binding_gap", "Referencia quebrada entre artefatos"],
      ["native_uncovered", "Categoria nao coberta (pen test, E2E)"],
    ], [2000, CW - 2000]),
    warn("Gaps NUNCA sao gate \u2014 sao visibilidade, nao enforcement. Scanner NUNCA sobrescreve decisao humana."),
    ...empty(),

    h2("\uD83D\uDCDD Handoff Operacional"),
    concept("Resumo automatico de 6 secoes no fim de cada sessao, para retomar sem perder contexto."),
    tbl(["#", "Pergunta", "Fonte"], [
      ["1", "Onde estamos agora?", "ledger (Current Status)"],
      ["2", "O que esta ativo?", "active.json + active-sprint.json"],
      ["3", "O que acabou de acontecer?", "Ultima linha com data ISO-8601"],
      ["4", "O que falta fazer?", "Open Items (max 3)"],
      ["5", "O que esta bloqueando?", "Blockers (max 3)"],
      ["6", "Fonte de verdade?", "Trio: ledger > snapshot > MEMORY"],
    ], [400, 3000, CW - 3400]),
    ...empty(),
    tip("Todas as camadas avancadas sao OPT-IN. O framework funciona com sensores + workflow padrao. As demais adicionam profundidade conforme o projeto cresce."),
    pb()
  ];
}

function sec11_runtime() {
  return [
    h1("11. \uD83D\uDCC1 Runtime e persistencia"),
    p("Todos os artefatos que o framework cria e consome, onde vivem e quem escreve neles:"),
    ...empty(),
    tbl(["Artefato", "Quem escreve", "Git?", "Proposito"], [
      ["execution-ledger.md", "Commands", "\u2714\uFE0F", "Estado oficial completo"],
      ["pattern-registry.md", "Manual/justify", "\u2714\uFE0F", "Padroes aprovados"],
      ["session-summaries/latest.md", "Hook Stop", "\u2714\uFE0F", "Handoff operacional 6 secoes"],
      ["sensors.json", "Manual", "\u2714\uFE0F", "Declaracao de sensores"],
      ["sensors-last-run.json", "/sensors-run", "Efemero", "Veredicto sensores"],
      ["contracts/phase-<id>.json", "/contract-create", "\u2714\uFE0F", "Contrato de fase"],
      ["contracts/active.json", "/contract-create", "\u2714\uFE0F", "Ponteiro fase ativa"],
      ["contracts/active-sprint.json", "/sprint-create", "\u2714\uFE0F", "Ponteiro sprint ativo"],
      ["sprints/<id>/<sid>.json", "/sprint-create", "\u2714\uFE0F", "Sprint contract"],
      ["behaviours.json", "Manual", "\u2714\uFE0F", "Declaracao behaviours"],
      ["behaviours-last-run.json", "/behaviour-run", "Efemero", "Expected vs actual"],
      ["architecture-linters.json", "Manual", "\u2714\uFE0F", "Declaracao linters"],
      ["arch-linters-last-run.json", "/lint-architecture", "Efemero", "Veredicto linters"],
      ["knowledge-index.json", "/kb-update", "\u2714\uFE0F", "Indice da KB"],
      ["knowledge/*.md", "/kb-update", "\u2714\uFE0F", "Documentos da KB"],
      ["capability-gaps.json", "/gaps-scan", "\u2714\uFE0F", "Registro de gaps"],
      ["project_spec-status.md", "Commands", "Local", "Snapshot resumido"],
      ["MEMORY.md", "Commands", "Local", "Indice de ponteiros"],
    ], [2600, 1600, 1000, CW - 5200]),
    ...empty(),
    h2("Trio de Sincronizacao"),
    concept("3 arquivos sincronizados: ledger (fonte de verdade) > snapshot (resumo) > MEMORY.md (indice). Se divergirem, o ledger prevalece."),
    pb()
  ];
}

function sec12_scenarios() {
  return [
    h1("12. \uD83C\uDFAC Cenarios praticos"),
    p("Situacoes reais que voce vai encontrar no dia a dia e como o framework te ajuda."),
    ...empty(),

    h2("\uD83C\uDFAF Cenario 1 \u2014 'Quero comecar um projeto novo'"),
    scenario("Voce tem uma ideia e quer comecar do zero."),
    numItem("Rode /spec-create e converse com o framework sobre o produto.", "scenario1"),
    numItem("Quando terminar, rode /spec-check. Se der BLOCKED, resolva e tente de novo.", "scenario1"),
    numItem("Com READY, rode /design-preview se tem interface. Escolha uma opcao.", "scenario1"),
    numItem("Rode /plan para gerar o plano de implementacao.", "scenario1"),
    numItem("Rode /plan-review. Se vier APPROVED ou APPROVED_WITH_CORRECTIONS, esta liberado para implementar.", "scenario1"),
    numItem("Peca ao Claude Code para implementar a Fase 1. Ele escreve; os hooks vigiam.", "scenario1"),
    numItem("Ao final da fase, rode /review para revisao.", "scenario1"),
    numItem("Corrija findings, documente com /justify, e prossiga para a proxima fase.", "scenario1"),
    tip("Uma spec completa de projeto pequeno leva 20-40 minutos de conversa. O plano, 5-10 minutos."),
    ...empty(),

    h2("\uD83D\uDD27 Cenario 2 \u2014 'Preciso corrigir um bug'"),
    scenario("Alguem reportou que a funcao X esta errada."),
    numItem("Rode /status-check para confirmar o estado atual.", "scenario2"),
    numItem("Rode /plan descrevendo o bug e o fix pretendido.", "scenario2"),
    numItem("Rode /plan-review.", "scenario2"),
    numItem("Com APPROVED ou APPROVED_WITH_CORRECTIONS, peca a correcao ao Claude Code.", "scenario2"),
    numItem("O framework aplica o fix e busca o mesmo padrao em TODO o projeto.", "scenario2"),
    numItem("Rode /review para confirmar e /verify-spec se o bug afetava requisito da spec.", "scenario2"),
    concept("Nenhum fix e 'pequeno demais'. Mesmo para um typo, o framework pede o fluxo completo."),
    ...empty(),

    h2("\uD83D\uDE80 Cenario 3 \u2014 'Quero fazer o primeiro deploy'"),
    scenario("O projeto esta implementado e voce vai colocar no ar."),
    numItem("Rode /verify-spec para confirmar que todos os requisitos foram entregues.", "scenario3"),
    numItem("Rode /audit (e as variantes que fazem sentido).", "scenario3"),
    numItem("Corrija tudo que for CRITICO e ALTO.", "scenario3"),
    numItem("Rode /ship-check. Esse e o ultimo portao.", "scenario3"),
    numItem("Se PRONTO, pode entregar. Se COM RESSALVAS, decida. Se NAO PRONTO, resolva.", "scenario3"),
    ...empty(),

    h2("\uD83D\uDD04 Cenario 4 \u2014 'Voltei depois de 2 semanas sem mexer'"),
    scenario("Voce abandonou o projeto. Como retomar sem perder contexto?"),
    numItem("Abra o Claude Code na pasta do projeto.", "scenario4"),
    numItem("O framework carrega automaticamente a memoria: estado, pendencias, decisoes.", "scenario4"),
    numItem("Rode /status-check para ver o resumo.", "scenario4"),
    numItem("Se tiver muita coisa acumulada, rode /memory-consolidate.", "scenario4"),
    numItem("Continue de onde parou.", "scenario4"),
    tip("A memoria do projeto (estado, decisoes, findings, pendencias) nao depende da sessao. Quando voce volta, o framework reconstroi o contexto a partir dos arquivos \u2014 nao importa quanto tempo passou."),
    pb()
  ];
}

function sec13_faq() {
  return [
    h1("13. \u2753 Perguntas frequentes"),
    ...empty(),

    faqBox("Preciso saber programar para usar o framework?"),
    p("Para tirar proveito completo, sim. Mas para acompanhar e entender o que esta acontecendo, nao. O framework explica cada passo, e voce pode pedir ao Claude Code para explicar qualquer coisa."),
    ...empty(),

    faqBox("Posso usar em qualquer linguagem de programacao?"),
    p("Sim. O framework e generico. Alguns hooks tem checks especificos por stack, e o gitignore-guard detecta stacks comuns como Node, Python, Rust, Go e Java. A camada de regras, comandos e agentes continua generica e funciona em qualquer stack."),
    ...empty(),

    faqBox("E se eu pular um passo?"),
    p("Alguns passos tem portoes mecanicos (como o /plan-review antes de implementar). Esses nao da para pular \u2014 o framework bloqueia. Outros sao disciplinares: tecnicamente da, mas voce perde as garantias de qualidade."),
    ...empty(),

    faqBox("O framework funciona offline?"),
    p("Os hooks e comandos sim. A parte de cross-review com Codex precisa de conexao. O Claude Code em si tambem precisa de conexao (chama a API da Anthropic)."),
    ...empty(),

    faqBox("Posso customizar as regras?"),
    p("Pode. As regras vivem em arquivos .md dentro de .claude/rules/. Voce pode editar, adicionar novas, remover as que nao fazem sentido. O framework e seu \u2014 adapte como precisar."),
    ...empty(),

    faqBox("Como o framework se compara a rodar o Claude Code sem ele?"),
    p("Sem framework: voce depende da memoria do assistente e da disciplina de pedir revisao. Com framework: tudo e estruturado, automatizado, verificado em multiplas camadas e guardado entre sessoes. A diferenca aparece em projetos medios para grandes."),
    ...empty(),

    faqBox("Quanto o framework adiciona de tempo ao trabalho?"),
    p("No comeco, parece adicionar. Depois do segundo ou terceiro projeto, voce percebe que economiza tempo \u2014 porque os bugs que voce teria nao acontecem, e as decisoes que voce teria esquecido estao documentadas."),
    ...empty(),

    faqBox("Posso usar em projetos profissionais?"),
    p("O framework foi desenhado exatamente para projetos profissionais. Use em projetos pessoais para aprender o fluxo, depois leve para o trabalho."),
    ...empty(),

    faqBox("Preciso atualizar o framework com frequencia?"),
    p("Nao. O framework e estavel. Quando sair versao nova com melhorias (como V4+), basta copiar os arquivos atualizados para o seu projeto."),
    ...empty(),

    faqBox("E se o framework reclamar de algo que eu sei que esta certo?"),
    p("Leia a justificativa que o framework apresenta. As vezes ele esta certo e voce nao percebeu. Se depois de ler voce ainda achar que ele esta errado, pode discordar e seguir \u2014 o framework avisa, nao obriga (exceto nos portoes mecanicos)."),
    ...empty(),

    faqBox("O que sao as 'camadas avancadas' (sensores, contratos, behaviours...)?"),
    p("Sao ferramentas OPT-IN para projetos que querem verificacao profunda. O framework basico funciona sem elas. Conforme o projeto cresce, voce pode adotar sensores (verificacao mecanica), contratos (compromisso formal por fase), behaviours (teste de comportamento real), linters (invariantes estruturais), knowledge base (documentacao sintetizada) e gaps (rastreamento de lacunas)."),
    pb()
  ];
}

function sec14_card() {
  return [
    h1("14. \uD83D\uDDC2\uFE0F Cartao de referencia rapida"),
    note("Para imprimir e deixar ao lado"),
    ...empty(),

    h2("\uD83C\uDFAF Fluxo em 12 passos"),
    tbl(["#", "", "Comando", "Objetivo"], [
      ["1", "\uD83D\uDCDD", "/spec-create", "Criar a especificacao"],
      ["2", "\uD83D\uDD0E", "/spec-check", "Validar que esta pronta"],
      ["3", "\uD83C\uDFA8", "/design-preview + /ui-plan", "Escolher visual (se tem UI)"],
      ["4", "\uD83D\uDDFA\uFE0F", "/plan", "Planejar implementacao"],
      ["5", "\u2705", "/plan-review", "Revisar plano (portao)"],
      ["6", "\u2328\uFE0F", "implementar", "Escrever codigo"],
      ["7", "\uD83D\uDD0D", "/review", "Revisar o codigo"],
      ["8", "\uD83D\uDEE1\uFE0F", "/audit + variantes", "Auditoria profunda"],
      ["9", "\uD83E\uDE79", "corrigir", "Resolver findings"],
      ["10", "\uD83D\uDCDD", "/justify", "Documentar decisoes"],
      ["11", "\uD83C\uDFAF", "/verify-spec", "Verificar aderencia"],
      ["12", "\uD83D\uDE80", "/ship-check", "Checagem final"],
    ], [500, 500, 2600, CW - 3600]),
    ...empty(),

    h2("\uD83D\uDEA6 Sinais que voce vai ver"),
    tbl(["", "Veredicto", "Acao"], [
      ["\uD83D\uDFE2", "READY / APPROVED / PRONTO / MATCH", "Pode avancar"],
      ["\uD83D\uDFE1", "READY WITH ASSUMPTIONS / APPROVED_WITH_CORRECTIONS / PARCIAL / PRONTO COM RESSALVAS", "Pode avancar com consciencia dos pontos abertos"],
      ["\uD83D\uDD34", "BLOCKED / NEEDS_REVISION / NEEDS_HUMAN_REVIEW / NAO PRONTO / MISS", "Nao avance \u2014 resolva antes"],
    ], [500, 3600, CW - 4100]),
    ...empty(),

    h2("\uD83C\uDD98 Se algo der errado"),
    tbl(["Situacao", "O que fazer"], [
      ["Hook bloqueou edicao", "Leia a mensagem do hook \u2014 ele explica exatamente o problema"],
      ["/plan-review retornou NEEDS_REVISION", "Corrija o plano conforme os findings BLOCKING e rode de novo"],
      ["Findings de seguranca", "Comece pelos CRITICO e ALTO; os demais sao debito tecnico"],
      ["Perdi o contexto do projeto", "Rode /status-check \u2014 a memoria recupera tudo"],
      ["Nao sei em que fase estou", "Rode /status-check \u2014 mostra o estado atual"],
      ["Framework parece travado", "Veja se o Codex esta em background \u2014 pode estar analisando"],
      ["Sensor falhou mas codigo parece ok", "Rode /sensors-run para ver o exit code real. Exit code e autoridade"],
      ["Contrato com veredicto FAILED", "Rode /contract-check para ver qual deliverable ou sensor falhou"],
    ], [3000, CW - 3000]),
    ...empty(),

    h2("\uD83D\uDCE1 Camadas avancadas \u2014 referencia rapida"),
    tbl(["Camada", "Adotar quando", "Command principal"], [
      ["Sensores", "Qualquer projeto (recomendado)", "/sensors-run"],
      ["Contracts", "Fases com mais de 1 dia", "/contract-create"],
      ["Sprints", "Fases longas que precisam de feedback curto", "/sprint-create"],
      ["Behaviours", "Projeto com endpoints/CLI/estado observavel", "/behaviour-run"],
      ["Linters", "Projeto com invariantes cross-file", "/lint-architecture"],
      ["Knowledge Base", "Projeto com muitas decisoes e camadas", "/kb-update"],
      ["Gaps", "Projeto maduro que quer rastrear lacunas", "/gaps-scan"],
    ], [1600, 3400, CW - 5000]),
    pb()
  ];
}

function sec15_glossary() {
  return [
    h1("15. \uD83D\uDCD6 Glossario"),
    tbl(["Termo", "Definicao simples"], [
      ["\uD83D\uDCD2 Ledger", "Registro oficial e completo do historico do projeto"],
      ["\uD83D\uDCF8 Snapshot", "Resumo compacto do estado atual (na memoria)"],
      ["\uD83D\uDD04 Trio", "3 arquivos sincronizados: ledger + snapshot + MEMORY.md"],
      ["\uD83D\uDEA7 Gate", "Checkpoint obrigatorio que BLOQUEIA se nao passar"],
      ["\uD83D\uDCE1 Sensor", "Verificacao mecanica por exit code"],
      ["\uD83E\uDDEA Behaviour", "Acao real + comparacao expected vs actual"],
      ["\uD83C\uDFD7\uFE0F Linter", "Verificacao de invariante estrutural cross-file"],
      ["\uD83D\uDCDC Contract", "Declaracao formal do que a fase promete"],
      ["\uD83C\uDFC3 Sprint", "Unidade atomica de entrega (1-2h) com evaluator"],
      ["\uD83D\uDD0D Gap", "Lacuna de verificacao registrada persistentemente"],
      ["\u23F3 Staleness", "Resultado desatualizado (codigo mudou apos run)"],
      ["\uD83D\uDD17 Binding", "Vinculo bidirecional behaviour <-> acceptance criterion"],
      ["\u2699\uFE0F Harness", "Conjunto de ferramentas de verificacao"],
      ["\uD83E\uDDEE Evaluator", "Bateria de checks atomicos com verdict mecanico"],
      ["\u2696\uFE0F Verdict", "Resultado final (PASS/FAIL/PARTIAL)"],
      ["\uD83D\uDD11 identity_key", "Chave deterministica de merge do scanner de gaps"],
      ["\uD83D\uDEE1\uFE0F Hook", "Script automatico que roda em evento (edit, session-start)"],
      ["\uD83E\uDD16 Agent", "Especialista virtual chamado por commands"],
      ["\uD83D\uDCCB Rule", "Regra .md ativamente aplicada pelo framework"],
      ["\uD83D\uDCDA Knowledge Base", "View consolidada do conhecimento do projeto"],
    ], [2000, CW - 2000]),
    ...empty(), ...empty(),
    pCenter("\uD83C\uDF89", 48),
    pCenter("Pronto para comecar!", 32, { bold: true, color: C.primary }),
    pCenter("Abra o Claude Code, rode /spec-create e deixe o framework te guiar.", 24, { italics: true }),
    ...empty(),
    pCenter("\u2014 Fim do Guia \u2014", 28, { color: C.secondary, italics: true }),
    pCenter("Claude Code Quality Framework V4+ \u2014 Guia Pratico Didatico", 20),
    pCenter("\uD83D\uDEE1\uFE0F  \uD83D\uDCCB  \u26A1  \uD83E\uDDE0  \uD83D\uDD0D  \uD83D\uDE80", 24),
  ];
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const children = [
    ...cover(),
    ...welcome(),
    ...sec1_whatIs(),
    ...sec2_install(),
    ...sec3_flow(),
    ...sec4_12steps(),
    ...sec5_hooks(),
    ...sec6_layers(),
    ...sec7_commands(),
    ...sec8_agents(),
    ...sec9_rules(),
    ...sec10_advanced(),
    ...sec11_runtime(),
    ...sec12_scenarios(),
    ...sec13_faq(),
    ...sec14_card(),
    ...sec15_glossary(),
  ];

  const doc = new Document({
    numbering: {
      config: [
        { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "install", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "scenario1", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "scenario2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "scenario3", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        { reference: "scenario4", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      ]
    },
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, font: FONT, color: C.primary }, paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 30, bold: true, font: FONT, color: C.secondary }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: FONT, color: C.dark }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
      ]
    },
    sections: [{
      properties: {
        page: { size: { width: PW, height: 15840 }, margin: PM }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.secondary, space: 4 } },
            children: [new TextRun({ text: "\uD83D\uDEE1\uFE0F Claude Code Quality Framework V4+", font: FONT, size: 16, color: C.secondary, italics: true })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.light, space: 4 } },
            children: [
              new TextRun({ text: "Pagina ", font: FONT, size: 16, color: C.dark }),
              new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: C.dark }),
            ]
          })]
        })
      },
      children
    }]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("C:/Github/Framework/docs/Framework-Guide-V4-Complete.docx", buffer);
  console.log("OK: Framework-Guide-V4-Complete.docx gerado com sucesso!");
}

main().catch(err => { console.error("ERRO:", err); process.exit(1); });
