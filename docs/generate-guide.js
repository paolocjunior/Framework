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
    pCenter("Guia Prático para Começar Hoje", 32, { color: C.dark }),
    pCenter("Versão 4+", 28, { color: C.secondary }),
    pCenter("\uD83D\uDCD8 do zero ao primeiro projeto seguro", 24, { italics: true }),
    ...empty(2),
    pCenter("\uD83C\uDFAF   \uD83D\uDD12   \uD83D\uDE80   \u2705   \uD83E\uDDE0   \uD83D\uDD27", 28),
    pCenter("plano \u2022 segurança \u2022 velocidade \u2022 validação \u2022 memória \u2022 automação", 20, { italics: true }),
    ...empty(3),
    pCenter("9 camadas de verificação \u2022 30 commands \u2022 8 agents \u2022 12 hooks", 20, { color: C.secondary }),
    pCenter("4 camadas de defesa \u2022 30+ rules \u2022 16+ artefatos de runtime", 20, { color: C.secondary }),
    ...empty(2),
    pCenter("Abril 2026", 20),
    pb()
  ];
}

function welcome() {
  return [
    h1("\uD83D\uDC4B Bem-vindo(a)!"),
    p("Se você chegou até aqui, provavelmente quer usar o Claude Code para construir software \u2014 e quer fazer isso direito, sem acidentes, sem retrabalho, sem bugs escondidos que aparecem só em produção."),
    p("Este guia foi escrito pensando em você. Não importa se você é desenvolvedor experiente, iniciante curioso ou gerente que só quer entender como funciona \u2014 aqui você encontra o framework completo explicado do jeito mais simples possível."),
    ...empty(),
    h2("\uD83C\uDFAF O que este guia vai te ensinar"),
    p("Como configurar o framework, como usar cada comando no dia a dia, o que acontece automaticamente enquanto você trabalha, e como tudo se conecta para produzir código de qualidade sênior de forma consistente."),
    ...empty(),
    h2("\uD83D\uDCA1 Para quem é este guia"),
    p("Para qualquer pessoa que queira usar o Claude Code com um fluxo de trabalho estruturado. Você não precisa entender os detalhes internos \u2014 basta seguir os passos e o framework faz o trabalho pesado de garantir qualidade."),
    ...empty(),
    h2("\uD83D\uDCDA O que você vai encontrar neste guia"),
    tbl(["#", "Seção", "O que tem lá"], [
      ["1", "\uD83C\uDFC1 O que é o framework", "Visão geral em 2 minutos"],
      ["2", "\u2699\uFE0F Instalação", "Como colocar no seu projeto"],
      ["3", "\uD83D\uDDFA\uFE0F O fluxo completo", "Do zero ao produto entregue"],
      ["4", "\uD83E\uDDED Os 12 passos do dia a dia", "Passo a passo com exemplo real"],
      ["5", "\uD83E\uDD16 O que acontece automaticamente", "Hooks que vigiam tudo por você"],
      ["6", "\uD83D\uDEE1\uFE0F As 4 camadas de defesa", "Como o framework te protege"],
      ["7", "\uD83D\uDD27 Comandos que você usa", "Tabela completa (30 commands)"],
      ["8", "\uD83E\uDDE0 Agentes que te ajudam", "Quem faz o que nos bastidores"],
      ["9", "\uD83D\uDCDC As regras do jogo", "O que o framework impede"],
      ["10", "\uD83D\uDCE1 Camadas avançadas", "Sensores, contratos, behaviours, linters, KB, gaps"],
      ["11", "\uD83D\uDCC1 Runtime e persistência", "Artefatos e onde vivem"],
      ["12", "\uD83C\uDFAC Cenários práticos", "Situações reais e como resolver"],
      ["13", "\u2753 Perguntas frequentes", "Tira-dúvidas rápido"],
      ["14", "\uD83D\uDDC2\uFE0F Cartão de referência", "Para imprimir e deixar ao lado"],
      ["15", "\uD83D\uDCD6 Glossário", "Todos os termos explicados"],
    ], [500, 2600, CW - 3100]),
    pb()
  ];
}

function sec1_whatIs() {
  return [
    h1("1. \uD83C\uDFC1 O que é o framework"),
    p("Imagine um colega sênior experiente sentado ao seu lado enquanto você programa. Ele te lembra de planejar antes de codar, revisa seu trabalho, aponta problemas de segurança, documenta suas decisões e impede que você esqueça de rodar testes."),
    p("Agora imagine que esse colega nunca fica cansado, nunca esquece nada e funciona 24 horas por dia, em qualquer projeto seu. Esse é o framework."),
    ...empty(),
    concept("O framework transforma o Claude Code de um assistente que 'faz código' em um parceiro que 'entrega software com qualidade sênior' \u2014 guiado por regras, verificado por camadas e validado por uma segunda IA independente."),
    ...empty(),
    h2("\uD83E\uDDF1 Os 4 pilares"),
    tbl(["", "Pilar", "O que faz"], [
      ["\uD83D\uDCCB", "Regras", "Dizem ao Claude Code como pensar e agir. Vivem em arquivos .md e são carregadas automaticamente."],
      ["\u26A1", "Hooks", "Scripts que rodam sozinhos antes e depois de cada edição. Bloqueiam erros óbvios."],
      ["\uD83E\uDDE0", "Memória", "Guarda o histórico do projeto entre sessões. Nada se perde quando você fecha o terminal."],
      ["\uD83D\uDD0D", "Cross-review", "Uma segunda IA (Codex) revisa o trabalho do Claude Code de forma independente."],
    ], [500, 1200, CW - 1700]),
    ...empty(),
    h2("\uD83C\uDF81 O que você ganha"),
    tbl(["", "Benefício"], [
      ["\u2705", "Planejamento obrigatório antes de codar"],
      ["\u2705", "Revisão de segurança em cada edição"],
      ["\u2705", "Testes e cobertura verificados automaticamente"],
      ["\u2705", "Decisões documentadas sem esforço"],
      ["\u2705", "Duas IAs checando seu trabalho"],
      ["\u2705", "Memória persistente entre sessões"],
      ["\u2705", "Menos bugs, menos retrabalho, menos surpresas"],
      ["\u2705", "9 camadas de verificação mecânica (sensores, linters, behaviours...)"],
    ], [500, CW - 500])
  ];
}

function sec2_install() {
  return [
    h1("2. \u2699\uFE0F Instalação"),
    p("A instalação é simples: você copia a pasta do framework para o seu projeto e está pronto. O Claude Code detecta automaticamente os arquivos e passa a seguir as regras."),
    ...empty(),
    h2("\uD83D\uDCE5 Passo a passo"),
    tbl(["Passo", "Ação", "Detalhe"], [
      ["1", "\uD83D\uDCE6 Baixe o framework", "Clone o repositório do framework ou baixe o ZIP. Ele contém a pasta .claude/ completa com tudo que você precisa."],
      ["2", "\uD83D\uDCC2 Copie 3 itens para o seu projeto", "Copie para a raiz do seu projeto: (1) a pasta .claude/ inteira, (2) o arquivo CLAUDE.md e (3) o arquivo AGENTS.md. Esses 3 são obrigatórios."],
      ["3", "\u26A0\uFE0F Limpe arquivos residuais", "Se veio o arquivo .claude/settings.local.json, DELETE-o (contém permissões do projeto anterior). Se veio .claude/runtime/.plan-approved, DELETE-o também. Esses arquivos são gerados em tempo de execução e não devem ser copiados entre projetos."],
      ["4", "\uD83D\uDD11 Dê permissão aos scripts", "No Linux ou Mac, rode chmod +x .claude/hooks/*.sh para que os scripts possam ser executados. No Windows com Git Bash, o framework já cuida disso."],
      ["5", "\uD83D\uDCBB Abra o Claude Code", "Abra o terminal na pasta do projeto e inicie o Claude Code. Ele vai carregar automaticamente as regras e ativar os hooks."],
      ["6", "\u2705 Verifique se está tudo certo", "Na primeira mensagem, digite /status-check. Se aparecer um resumo do estado do projeto, deu certo."],
    ], [700, 2400, CW - 3100]),
    ...empty(),
    h2("\uD83D\uDD27 Dependência importante"),
    warn("O framework usa a ferramenta jq para processar dados dos hooks. A maioria dos sistemas já tem, mas se o framework reclamar, instale com: apt install jq (Linux), brew install jq (Mac) ou baixe do site oficial (Windows)."),
    ...empty(),
    h2("\uD83C\uDF10 Revisor externo (opcional mas recomendado)"),
    p("Para ativar a segunda IA revisora (Codex/GPT-5.4), siga estes passos:"),
    numItem("Instale o Codex CLI: npm install -g @openai/codex"),
    numItem("Faça login: codex login"),
    numItem("Instale o plugin no Claude Code: /install-plugin openai/codex-plugin-cc"),
    numItem("Recarregue: /reload-plugins"),
    numItem("Configure o AGENTS.md na raiz do projeto (template incluído no framework)"),
    ...empty(),
    tip("Sem o Codex você ainda tem o framework completo, mas perde a camada de validação cross-model (Camada 4). O framework preenche o AGENTS.md automaticamente quando o /spec-check dá READY ou READY WITH ASSUMPTIONS."),
    ...empty(),
    h2("\uD83D\uDCE1 Sensores \u2014 Configuração inicial"),
    p("Sensores são verificações mecânicas (testes, lint, build) que o framework executa. Para configurá-los:"),
    numItem("Copie .claude/runtime/sensors.template.json para .claude/runtime/sensors.json", "install"),
    numItem("Edite para refletir a stack real do seu projeto (remova sensores não aplicáveis)", "install"),
    numItem("Rode /sensors-run para estabelecer o baseline", "install"),
    numItem("Comite sensors.json no repositório", "install"),
    ...empty(),
    tip("Projetos sem sensors.json operam em modo degradado \u2014 o framework funciona, mas reporta a ausência como lacuna.")
  ];
}

function sec3_flow() {
  return [
    h1("3. \uD83D\uDDFA\uFE0F O fluxo completo"),
    p("Todo projeto no framework passa por 5 grandes fases. Cada fase tem um comando que você usa para avançar. Entre as fases, existem portões de verificação \u2014 se algo está errado, o framework não deixa você passar."),
    ...empty(),
    h2("\uD83C\uDFAF A jornada em 5 fases"),
    tbl(["Fase", "", "Comandos", "O que acontece"], [
      ["1\uFE0F\u20E3", "Especificar", "/spec-create \u2192 /spec-check", "Você descreve o que quer. O framework transforma em documento rigoroso."],
      ["2\uFE0F\u20E3", "Planejar", "/plan \u2192 /plan-review", "O framework desenha como construir, e outra camada verifica o plano."],
      ["3\uFE0F\u20E3", "Implementar", "código + /review", "Você escreve código. O framework revisa e aponta melhorias."],
      ["4\uFE0F\u20E3", "Auditar", "/audit + variantes", "Análise profunda de segurança, banco, web, kubernetes."],
      ["5\uFE0F\u20E3", "Entregar", "/verify-spec \u2192 /ship-check", "Confirma que o prometido foi entregue e está pronto para sair."],
    ], [600, 1200, 2600, CW - 4400]),
    ...empty(),
    h2("\uD83D\uDEA6 Os portões de verificação"),
    p("Entre as fases existem checkpoints que o framework impõe. Você não pode pular \u2014 eles garantem que o trabalho está consistente antes de avançar."),
    tbl(["Portão", "Quando", "O que checa"], [
      ["\uD83D\uDEAA Portão 1", "Depois do /spec-create", "Spec está clara, completa e sem ambiguidades bloqueantes"],
      ["\uD83D\uDEAA Portão 2", "Depois do /plan", "O /plan-review aprova o plano. Hook BLOQUEIA código sem esse OK"],
      ["\uD83D\uDEAA Portão 3", "Durante implementação", "Cada edição passa por hooks que checam secrets, sintaxe, padrões"],
      ["\uD83D\uDEAA Portão 4", "Antes da entrega", "O /ship-check faz pente fino em build, testes, segurança e riscos"],
    ], [1400, 2400, CW - 3800]),
    ...empty(),
    flow(["spec-create", "spec-check", "plan", "plan-review", "implementar", "review/audit", "verify-spec", "ship-check"])
  ];
}

function sec4_12steps() {
  return [
    h1("4. \uD83E\uDDED Os 12 passos do dia a dia"),
    p("Aqui está o fluxo completo, passo a passo. Siga na ordem e o framework garante o resto."),
    note("Cada passo tem 3 blocos: \uD83D\uDC64 o que VOCÊ faz, \uD83E\uDD16 o que o FRAMEWORK faz, e \u2705 como saber que FUNCIONOU. Se você está começando, só siga a coluna VOCÊ \u2014 o resto acontece sozinho."),
    ...empty(),

    h3("Passo 1 \u2014 \uD83D\uDCDD Criar a especificação"),
    p("Tudo começa descrevendo o que você quer construir. Não precisa ser técnico."),
    stepTable([
      ["\uD83D\uDC64 Você", "Digita /spec-create e responde às perguntas sobre o produto que quer construir."],
      ["\uD83E\uDD16 Framework", "Faz perguntas guiadas sobre objetivo, público, telas, dados, regras de negócio e escopo. No final, gera documento estruturado."],
      ["\u2705 Sinal de OK", "Apareceu especificação completa com requisitos numerados (AUTH-01, TASK-02), telas, modelo de dados e critérios de aceite."],
    ]),
    tip("Você pode começar com algo simples: 'Quero criar um site para controlar finanças pessoais.' O framework faz o resto."),
    ...empty(),

    h3("Passo 2 \u2014 \uD83D\uDD0E Validar a especificação"),
    stepTable([
      ["\uD83D\uDC64 Você", "Digita /spec-check."],
      ["\uD83E\uDD16 Framework", "Lê a spec, procura lacunas, classifica cada problema e dá veredicto: READY, READY WITH ASSUMPTIONS ou BLOCKED."],
      ["\u2705 Sinal de OK", "Veredicto READY ou READY WITH ASSUMPTIONS. Se vier BLOCKED, lista exatamente o que precisa ser resolvido antes de implementar."],
    ]),
    warn("Se der BLOCKED: não tente contornar. Responda às perguntas e rode /spec-check de novo. Cada ambiguidade ignorada vira um bug futuro."),
    ...empty(),

    h3("Passo 3 \u2014 \uD83C\uDFA8 Escolher o visual (se tem UI)"),
    stepTable([
      ["\uD83D\uDC64 Você", "Digita /design-preview e depois /ui-plan."],
      ["\uD83E\uDD16 Framework", "Gera opções de paleta, tipografia, espaçamento, componentes base. Você escolhe e o framework congela o padrão visual."],
      ["\u2705 Sinal de OK", "Design System aprovado. Telas futuras seguem automaticamente essa identidade visual."],
    ]),
    ...empty(),

    h3("Passo 4 \u2014 \uD83D\uDDFA\uFE0F Planejar a implementação"),
    stepTable([
      ["\uD83D\uDC64 Você", "Digita /plan."],
      ["\uD83E\uDD16 Framework", "Desenha plano completo: objetivo, contexto, abordagem, justificativas, riscos. Se envolve migração ou operação irreversível, chama agente de risco automaticamente."],
      ["\u2705 Sinal de OK", "Plano apresentado no chat. Você lê, aprova ou pede ajustes."],
    ]),
    concept("Mesmo para mudanças simples, o plano é obrigatório. Essa disciplina evita os erros mais comuns."),
    ...empty(),

    h3("Passo 5 \u2014 \u2705 Revisar o plano"),
    stepTable([
      ["\uD83D\uDC64 Você", "Digita /plan-review."],
      ["\uD83E\uDD16 Framework", "Chama dois agentes em paralelo: um compara plano com spec, outro checa coerência interna. Devolve APPROVED, APPROVED_WITH_CORRECTIONS, NEEDS_REVISION ou NEEDS_HUMAN_REVIEW, com findings BLOCKING, NON-BLOCKING ou EDITORIAL. Quando aplicável, inclui APPLICABLE_DELTA para orientar correções diretamente aplicáveis."],
      ["\u2705 Sinal de OK", "Plano APPROVED ou APPROVED_WITH_CORRECTIONS. O framework cria marker .plan-approved que libera o próximo passo. NEEDS_REVISION ou NEEDS_HUMAN_REVIEW não liberam implementação."],
    ]),
    box("\uD83D\uDCA1 Quando o plano envolve integração frontend/backend, APIs ou fluxos de mutação, o /plan também antecipa riscos cross-cutting: matriz de erros, classificação Security Regression Matrix e testes dedicados para middleware, handlers globais e controles de segurança.", C.noteBg),
    warn("Portão mecânico: um hook BLOQUEIA criação de código enquanto o plano não for aprovado pelo /plan-review. Não é sugestão \u2014 é impedimento real."),
    ...empty(),

    h3("Passo 6 \u2014 \u2328\uFE0F Implementar o código"),
    stepTable([
      ["\uD83D\uDC64 Você", "Pede 'implemente a Fase 1 do plano' ou equivalente."],
      ["\uD83E\uDD16 Framework", "Escreve código arquivo por arquivo. A cada edição, hooks rodam automaticamente checando sintaxe, secrets, padrões, design tokens, qualidade."],
      ["\u2705 Sinal de OK", "Arquivos criados sem alertas dos hooks. Código sintaticamente válido e sem problemas óbvios."],
    ]),
    ...empty(),

    h3("Passo 7 \u2014 \uD83D\uDD0D Revisar o código"),
    stepTable([
      ["\uD83D\uDC64 Você", "Digita /review."],
      ["\uD83E\uDD16 Framework", "Chama em paralelo: revisor de código (qualidade sênior), auditor de segurança (vulnerabilidades) e auditor de QA (cobertura de testes)."],
      ["\u2705 Sinal de OK", "Review publicado com findings classificados por gravidade (CRÍTICO, ALTO, MÉDIO, BAIXO)."],
    ]),
    ...empty(),

    h3("Passo 8 \u2014 \uD83D\uDEE1\uFE0F Auditoria profunda (quando aplicável)"),
    tbl(["Comando", "Foco"], [
      ["/audit", "Auditoria geral de segurança e qualidade"],
      ["/db-audit", "Foco em banco de dados: queries, índices, segurança, integridade"],
      ["/web-audit", "Foco em APIs web: autenticação, autorização, XSS, CSRF, CORS"],
      ["/k8s-audit", "Foco em Kubernetes: privilégios, network policies, secrets, RBAC"],
    ], [1600, CW - 1600]),
    tip("Não precisa rodar todas. Use /audit como padrão. Adicione as variantes conforme o projeto."),
    ...empty(),

    h3("Passo 9 \u2014 \uD83E\uDE79 Corrigir o que apareceu"),
    stepTable([
      ["\uD83D\uDC64 Você", "Pede ao Claude Code para corrigir os findings, começando pelos mais graves."],
      ["\uD83E\uDD16 Framework", "Aplica os fixes. Cada correção passa pelos hooks novamente. Depois do fix, busca o mesmo padrão em TODO o projeto para evitar fix parcial."],
      ["\u2705 Sinal de OK", "Todos os CRÍTICOS e ALTOS corrigidos. Re-rodar /review confirma que os findings foram resolvidos."],
    ]),
    ...empty(),

    h3("Passo 10 \u2014 \uD83D\uDCDD Documentar as decisões"),
    stepTable([
      ["\uD83D\uDC64 Você", "Digita /justify."],
      ["\uD83E\uDD16 Framework", "Gera bloco formatado com as justificativas técnicas: decisão, alternativas rejeitadas, motivo."],
      ["\u2705 Sinal de OK", "Decisões importantes viraram patrimônio do projeto."],
    ]),
    ...empty(),

    h3("Passo 11 \u2014 \uD83C\uDFAF Verificar contra a especificação"),
    stepTable([
      ["\uD83D\uDC64 Você", "Digita /verify-spec."],
      ["\uD83E\uDD16 Framework", "Compara cada requisito da spec com o código. Marca MATCH, PARCIAL ou MISS. Usa sensores, behaviours e contratos como evidência mecânica. Para tokens marcados como [literal], grep é apenas sinal inicial: a conformidade exige binding rastreável ao comportamento verificado."],
      ["\u2705 Sinal de OK", "Todos os requisitos v1 marcados como MATCH."],
    ]),
    ...empty(),

    h3("Passo 12 \u2014 \uD83D\uDE80 Checagem final de entrega"),
    stepTable([
      ["\uD83D\uDC64 Você", "Digita /ship-check."],
      ["\uD83E\uDD16 Framework", "Checa: build, testes, lint, secrets, config, dependências, observabilidade, performance. Valida sensores, contratos, behaviours, linters, KB e gaps. Chama risco final."],
      ["\u2705 Sinal de OK", "Veredicto PRONTO. Se PRONTO COM RESSALVAS, você decide. Se NÃO PRONTO, corrige antes."],
    ]),
    ...empty(),
    cardBox("\uD83C\uDF89 Chegou no veredicto PRONTO? Está pronto para distribuir! O framework garantiu que o projeto passou por todas as camadas de qualidade.")
  ];
}

function sec5_hooks() {
  return [
    h1("5. \uD83E\uDD16 O que acontece automaticamente"),
    p("Enquanto você trabalha, o framework tem 12 scripts rodando automaticamente. Você não precisa chamar nenhum deles \u2014 eles se ativam sozinhos no momento certo."),
    ...empty(),
    h2("\u23F0 Quando cada um dispara"),
    tbl(["Momento", "Quando dispara", "O que acontece"], [
      ["\uD83D\uDE80 Início da sessão", "Quando abre ou retoma o Claude Code", "Health check valida que tudo está instalado; gitignore-guard alerta se o .gitignore não cobre os mínimos da stack detectada"],
      ["\uD83D\uDEE1\uFE0F Antes de cada edição", "Quando o Claude vai modificar arquivo", "Protect-files bloqueia arquivos sensíveis e pre-implementation-gate exige plan-review"],
      ["\u2705 Depois de cada edição", "Assim que o arquivo é salvo", "Checks rodam: sintaxe, secrets, qualidade, design, determinismo, loop-detection e gitignore-guard"],
      ["\uD83D\uDCDD Quando você fecha", "Ao finalizar a conversa", "Session-summary grava handoff operacional de 6 seções"],
      ["\uD83E\uDDF9 Ao sair", "No encerramento da sessão", "Session-cleanup limpa temporários (timeout 1.5s)"],
    ], [2000, 2600, CW - 4600]),
    ...empty(),
    h2("\uD83D\uDD0D O que eles protegem contra"),
    tbl(["", "Problema", "O que acontece"], [
      ["\uD83D\uDD11", "Secrets hardcoded", "API keys, senhas, tokens colados direto no código"],
      ["\uD83D\uDC80", "Código perigoso", "eval(), exec(), Function() e execuções dinâmicas"],
      ["\uD83C\uDFA8", "Cores soltas", "Hex codes misturados no lugar do design system"],
      ["\uD83C\uDFB2", "Não-determinismo", "Math.random() e new Date() onde deveria ser fixo"],
      ["\uD83D\uDD12", "Arquivos sensíveis", "Edições em .git/, lockfiles, arquivos de build"],
      ["\uD83D\uDCCB", "Pulos de portão", "Código criado sem plan-review aprovado"],
      ["\u267B\uFE0F", "Loops de edição", "Mesmo arquivo editado em círculo sem progresso (3ª alerta, 5ª bloqueio)"],
      ["\uD83D\uDEA7", "Sintaxe quebrada", "Python que não compila, erros óbvios"],
      ["\uD83D\uDEAB", ".gitignore incompleto", "Caches, builds, ambientes virtuais e artefatos de stack que poderiam ser commitados por engano"],
    ], [500, 2200, CW - 2700]),
    ...empty(),
    tip("Você não precisa lembrar de nada. Todos esses checks são automáticos. Você só vai perceber quando algo der problema \u2014 e aí o framework mostra exatamente o que, onde e como resolver.")
  ];
}

function sec6_layers() {
  return [
    h1("6. \uD83D\uDEE1\uFE0F As 4 camadas de defesa"),
    p("O framework opera em 4 camadas complementares. Nenhuma substitui as outras:"),
    ...empty(),
    tbl(["Camada", "Tipo", "Quando ativa", "O que pega", "Exemplo"], [
      ["1 \u2014 Regras", "Declarativa", "Sempre", "Direção e padrões", "'Validar entrada'"],
      ["2 \u2014 Hooks", "Mecânica auto", "Em evento", "Erros objetivos", "Secrets, syntax, loop"],
      ["3 \u2014 Memória", "Comportamental", "Entre sessões", "Erros de julgamento", "'Grep != prova de uso'"],
      ["4 \u2014 Cross-model", "Validação indep.", "Após command", "Blind spots", "Codex questiona Claude"],
    ], [1200, 1400, 1400, 2000, CW - 6000]),
    ...empty(),
    h2("\u2699\uFE0F Camada 1 \u2014 Regras (30+ rules)"),
    tbl(["Grupo", "Regras principais", "O que garantem"], [
      ["\uD83D\uDD10 Segurança", "security, web-api-security, database-security, kubernetes-security", "Checklist de segurança por área"],
      ["\u2705 Qualidade", "code-review, structural-quality, testing, implementation-quality, integration-checklist", "Critérios sênior, testes, padrões recorrentes e contratos de integração"],
      ["\uD83D\uDCCB Spec e plano", "spec-quality, spec-creation-guide, plan-construction", "O que spec/plano pronto precisa ter"],
      ["\uD83C\uDFD7\uFE0F Estado", "state-management, state-sync, execution-tracking, context-loading", "Como rastrear fases e memória"],
      ["\uD83E\uDD16 Agentes", "agent-contracts, review-quality", "Como agentes se comunicam"],
      ["\uD83D\uDCE1 Harness", "sensors, execution-contracts, sprint-contracts, behaviour-harness, architecture-linters", "Verificação mecânica declarativa"],
      ["\uD83D\uDCDA Gestão", "knowledge-base, capability-gaps, recommended-skills", "Conhecimento e lacunas"],
    ], [1400, 3400, CW - 4800]),
    ...empty(),
    h2("\uD83C\uDF10 Camada 4 \u2014 Cross-Model (Codex)"),
    p("O Codex (GPT-5.4) é revisor adversarial. Claude implementa, Codex questiona \u2014 duas IAs de empresas diferentes. O Codex é chamado AUTOMATICAMENTE após cada command do framework."),
    tbl(["Checkpoint", "O que o Codex valida"], [
      ["Após /spec-create", "Completude, ambiguidades, viabilidade"],
      ["Após /plan", "Plano vs spec, viabilidade técnica"],
      ["Após implementação", "Implementação completa e correta"],
      ["Após /review e /audit", "Rigor da revisão, vulnerabilidades não detectadas"],
      ["Antes de /ship-check", "Revisão final de segurança e qualidade"],
    ], [2400, CW - 2400]),
    ...empty(),
    note("Aplicação automática: você nunca precisa abrir uma regra manualmente. Quando um comando roda, ele já sabe quais regras consultar.")
  ];
}

function sec7_commands() {
  return [
    h1("7. \uD83D\uDD27 Comandos que você usa"),
    p("Referência completa dos 30 commands. Use como consulta rápida no dia a dia."),
    ...empty(),
    h2("\uD83C\uDFD7\uFE0F Especificação e planejamento"),
    tbl(["Comando", "O que faz"], [
      ["/spec-create", "Cria a especificação do projeto em modo conversa guiada"],
      ["/spec-check", "Valida se a especificação está pronta para implementar"],
      ["/plan", "Cria o plano de implementação antes de codar"],
      ["/plan-review", "Revisa o plano (portão obrigatório antes de implementar)"],
      ["/ui-plan", "Planejamento de interface com checkpoint visual"],
      ["/design-preview", "Gera opções de Design System para aprovação"],
    ], [2000, CW - 2000]),
    ...empty(),
    h2("\uD83D\uDD0D Revisão e auditoria"),
    tbl(["Comando", "O que faz"], [
      ["/review", "Revisão de código em múltiplas dimensões (qualidade, segurança, QA)"],
      ["/audit", "Auditoria completa de segurança e qualidade"],
      ["/db-audit", "Auditoria focada em banco de dados"],
      ["/web-audit", "Auditoria focada em APIs e aplicações web"],
      ["/k8s-audit", "Auditoria focada em Kubernetes"],
    ], [2000, CW - 2000]),
    ...empty(),
    h2("\uD83C\uDFAF Verificação e entrega"),
    tbl(["Comando", "O que faz"], [
      ["/verify-spec", "Verifica se cada requisito da spec foi implementado"],
      ["/ship-check", "Checagem final antes de entregar ou fazer deploy"],
      ["/justify", "Documenta as justificativas técnicas das decisões"],
    ], [2000, CW - 2000]),
    ...empty(),
    h2("\uD83E\uDDED Estado e manutenção"),
    tbl(["Comando", "O que faz"], [
      ["/status-check", "Mostra estado atual do projeto, pendências e bloqueios"],
      ["/memory-consolidate", "Reorganiza a memória do projeto"],
      ["/skills-gap", "Identifica lacunas e sugere skills externas"],
    ], [2000, CW - 2000]),
    ...empty(),
    h2("\uD83D\uDCE1 Camadas avançadas"),
    tbl(["Comando", "O que faz"], [
      ["/sensors-run", "Executa sensores mecânicos e produz veredicto por exit code"],
      ["/contract-create", "Cria contrato de execução da fase (upstream)"],
      ["/contract-check", "Verifica estado do projeto contra contrato ativo"],
      ["/sprint-create", "Cria sprint contract (entrega atômica 1-2h)"],
      ["/sprint-evaluate", "Executa evaluator do sprint e registra verdict"],
      ["/sprint-close", "Fecha sprint com confirmação humana"],
      ["/behaviour-run", "Executa behaviours runtime (expected vs actual)"],
      ["/lint-architecture", "Executa linters de invariantes estruturais"],
      ["/kb-update", "Atualiza knowledge base do projeto"],
      ["/kb-status", "Verifica estado da knowledge base"],
      ["/gaps-scan", "Detecta capability gaps (lacunas de verificação)"],
      ["/gaps-status", "Verifica estado dos gaps"],
    ], [2000, CW - 2000])
  ];
}

function sec8_agents() {
  return [
    h1("8. \uD83E\uDDE0 Agentes que te ajudam"),
    p("Agentes são 'especialistas virtuais' que o framework chama quando precisa de análise específica. Você não chama agentes diretamente \u2014 os comandos fazem isso por você."),
    ...empty(),
    h2("\uD83C\uDFAD Quem faz o que"),
    tbl(["Agente", "Especialidade", "Chamado por", "O que entrega"], [
      ["spec-creator", "Criar especificação", "/spec-create", "Conduz discovery e estrutura a spec"],
      ["planner", "Planejar implementação", "/plan", "Desenha plano técnico completo"],
      ["spec-plan-validator", "Comparar plano x spec", "/plan-review", "Verifica se plano é fiel à spec"],
      ["consistency-checker", "Coerência do plano", "/plan-review", "Checa contagens, dependências, refs cruzadas"],
      ["code-reviewer", "Revisão de código", "/review", "Aplica critérios de dev sênior"],
      ["security-auditor", "Auditoria de segurança", "/audit e variantes", "Busca vulnerabilidades e blind spots"],
      ["qa-auditor", "Cobertura de testes", "/review", "Detecta código sem testes, classifica por risco"],
      ["risk-assessment", "Análise de risco", "/plan e /ship-check", "Avalia irreversibilidade, incógnitas, débito"],
    ], [1600, 1800, 1800, CW - 5200]),
    ...empty(),
    h2("\uD83C\uDFAF Dois tipos de agente"),
    tbl(["Tipo", "Característica", "Exemplo"], [
      ["\uD83D\uDD04 Transversal", "Aparece em vários comandos não relacionados", "risk-assessment é chamado por /plan e /ship-check"],
      ["\uD83C\uDFAF Especializado", "Aparece em um comando ou família coesa", "security-auditor é chamado por /audit, /web-audit, /db-audit, /k8s-audit"],
    ], [1400, 3600, CW - 5000]),
    ...empty(),
    tip("Você não precisa saber nada disso para usar o framework. Mas quando vir mensagens tipo 'invocando risk-assessment', vai entender do que se trata.")
  ];
}

function sec9_rules() {
  return [
    h1("9. \uD83D\uDCDC As regras do jogo"),
    p("O framework tem 30+ regras em arquivos .md dentro da pasta .claude/rules/. Elas não são documentação \u2014 são ativamente aplicadas em cada comando."),
    ...empty(),
    tbl(["Grupo", "Regras principais", "O que garantem"], [
      ["\uD83D\uDD10 Segurança", "security, web-api-security, database-security, kubernetes-security", "Checklists de segurança por área"],
      ["\u2705 Qualidade de código", "code-review, structural-quality, testing, implementation-quality, integration-checklist", "Critérios sênior, testes, padrões recorrentes e contratos de integração"],
      ["\uD83D\uDCCB Spec e plano", "spec-quality, spec-creation-guide, plan-construction", "O que uma spec/plano pronto precisa ter"],
      ["\uD83C\uDFD7\uFE0F Estado e observabilidade", "state-management, observability, performance", "Como lidar com estado, logs, performance"],
      ["\uD83C\uDFA8 Design e UI", "design-system-quality", "O que um bom Design System entrega"],
      ["\uD83D\uDD04 Execução e memória", "execution-tracking, state-sync, context-loading", "Como rastrear fases e memória persistente"],
      ["\uD83E\uDD16 Agentes e review", "agent-contracts, review-quality", "Como agentes se comunicam e quando review é válido"],
      ["\uD83D\uDCCA Evidência", "self-verification, evidence-tracing", "Todo achado precisa de prova rastreável"],
      ["\uD83D\uDCE1 Harness mecânico", "sensors, execution-contracts, sprint-contracts, behaviour-harness, architecture-linters", "Verificação mecânica declarativa"],
      ["\uD83D\uDCDA Gestão de conhecimento", "knowledge-base, capability-gaps, recommended-skills", "Conhecimento, lacunas e skills"],
    ], [1400, 3800, CW - 5200]),
    ...empty(),
    note("Você nunca precisa abrir uma regra manualmente. Quando um comando roda, ele já sabe quais regras consultar. Se quiser entender o porquê de alguma coisa, pode abrir a regra."),
    box("\uD83D\uDCDA A rule implementation-quality.md cataloga 25 padrões recorrentes. Os mais recentes reforçam handlers terminais com diagnóstico interno e validação de shape para dados externos como JSON, cache, filas e APIs.", C.noteBg),
    box("\uD83E\uDDEA Componentes cross-cutting, como middleware de segurança, rate limiter, auth middleware e error handlers globais, precisam de teste dedicado do efeito observável. Chamar um endpoint e receber 200 não prova que o controle funcionou.", C.noteBg)
  ];
}

function sec10_advanced() {
  return [
    h1("10. \uD83D\uDCE1 Camadas avançadas"),
    p("Além do workflow básico (spec \u2192 plan \u2192 implement \u2192 review \u2192 ship), o framework oferece 7 camadas avançadas OPT-IN que adicionam verificação mecânica profunda."),
    ...empty(),

    h2("\uD83D\uDCE1 Sensores Mecânicos"),
    concept("Verificações onde o EXIT CODE do comando é a verdade \u2014 não a narrativa da IA. Se retorna 0, passou. Se retorna outro valor, FALHOU."),
    tbl(["Tipo", "O que verifica", "Exemplo"], [
      ["test", "Testes passam", "npm test, pytest"],
      ["lint", "Sem violações", "npm run lint, ruff"],
      ["type-check", "Tipos válidos", "tsc --noEmit, mypy"],
      ["build", "Compila limpo", "npm run build"],
      ["security-scan", "Sem vulnerabilidades", "npm audit"],
      ["custom", "Qualquer verificação", "Scripts shell"],
    ], [1600, 2800, CW - 4400]),
    flow(["sensors.json", "/sensors-run", "sensors-last-run.json", "/ship-check lê"]),
    ...empty(),

    h2("\uD83D\uDCDC Execution Contracts"),
    concept("Declaração UPSTREAM do que a fase promete. Plano = COMO. Contrato = O QUE. Ledger = O QUE ACONTECEU."),
    flow(["draft", "approved", "in_progress", "done / failed / deferred"]),
    tbl(["Campo chave", "O que declara"], [
      ["deliverables[]", "Arquivos/artefatos que devem existir"],
      ["acceptance_criteria[]", "Comportamentos observáveis (sensor/behaviour/manual)"],
      ["sensors_required[]", "Sensores que devem estar verdes"],
      ["architecture_linters_required[]", "Linters que devem passar"],
      ["out_of_scope[]", "O que NÃO está no escopo"],
    ], [3000, CW - 3000]),
    ...empty(),

    h2("\uD83C\uDFC3 Sprint Contracts"),
    concept("Unidades ATÔMICAS de entrega (1-2h) com evaluator determinístico. Phase = dias/semanas. Sprint = horas."),
    warn("Invariante central: phase contract NUNCA é mutado por sprint. Vínculo é via filesystem."),
    tbl(["Check do Evaluator", "Verdict vem de"], [
      ["file_exists", "path existe no filesystem"],
      ["grep_pattern", "matches de regex em arquivo"],
      ["sensor_subset", "sensors-last-run.json"],
      ["custom_command", "exit code (timeout obrigatório)"],
    ], [2000, CW - 2000]),
    ...empty(),

    h2("\uD83E\uDDEA Behaviour Harness"),
    concept("Behaviours DISPARAM ação real e COMPARAM resultado vs expectativa. Sensores = 'compila?'. Behaviours = 'quando executo X, FAZ Y?'"),
    tbl(["Tipo de Expectation", "O que compara"], [
      ["exit_code", "Exit code do comando bate com esperado"],
      ["stdout_contains", "stdout contém pattern esperado"],
      ["stdout_json_path", "filtro jq no stdout JSON bate"],
      ["file_content", "arquivo contém pattern esperado"],
      ["file_exists_after", "arquivo existe após execução"],
      ["not_contains", "stdout NÃO contém pattern (negativa)"],
    ], [2000, CW - 2000]),
    note("Binding bidirecional: behaviour declara contract_ref e phase contract declara behaviour_id. Ambas as pontas devem existir."),
    ...empty(),

    h2("\uD83C\uDFD7\uFE0F Architecture Linters"),
    concept("Verificam INVARIANTES ESTRUTURAIS cross-file. Hooks = por arquivo. Sensores = build/test. Linters = estrutura."),
    tbl(["Categoria", "Exemplo"], [
      ["layering", "Screens não importam de infra"],
      ["circular-deps", "A importa B importa A"],
      ["cross-file", "Rotas do router existem como arquivos"],
      ["naming", "PascalCase, hooks com use"],
      ["type-schema-match", "Frontend bate com backend"],
    ], [1800, CW - 1800]),
    ...empty(),

    h2("\uD83D\uDCDA Knowledge Base"),
    concept("VIEW CONSOLIDADA do conhecimento \u2014 mapa, não atlas. 4 documentos concisos (50-150 linhas cada)."),
    tbl(["Documento", "Pergunta que responde"], [
      ["architecture.md", "Qual é a arquitetura deste projeto?"],
      ["quality-posture.md", "Qual a postura de qualidade agora?"],
      ["security-posture.md", "Qual a postura de segurança agora?"],
      ["decisions-log.md", "Quais decisões foram tomadas e por quê?"],
    ], [2400, CW - 2400]),
    ...empty(),

    h2("\uD83D\uDD0D Capability Gap Tracking"),
    concept("Transforma observações TRANSITÓRIAS (NO_SENSORS, NEVER_RUN, STALE) em registro PERSISTENTE."),
    tbl(["Tipo de Gap", "Significado"], [
      ["declaration_absent", "Camada não declarada (ex: sensors.json ausente)"],
      ["never_run", "Declarada mas nunca executada"],
      ["stale", "Resultado desatualizado"],
      ["binding_gap", "Referência quebrada entre artefatos"],
      ["native_uncovered", "Categoria não coberta (pen test, E2E)"],
    ], [2000, CW - 2000]),
    warn("Gaps NUNCA são gate \u2014 são visibilidade, não enforcement. Scanner NUNCA sobrescreve decisão humana."),
    ...empty(),

    h2("\uD83D\uDCDD Handoff Operacional"),
    concept("Resumo automático de 6 seções no fim de cada sessão, para retomar sem perder contexto."),
    tbl(["#", "Pergunta", "Fonte"], [
      ["1", "Onde estamos agora?", "ledger (Current Status)"],
      ["2", "O que está ativo?", "active.json + active-sprint.json"],
      ["3", "O que acabou de acontecer?", "Última linha com data ISO-8601"],
      ["4", "O que falta fazer?", "Open Items (máx 3)"],
      ["5", "O que está bloqueando?", "Blockers (máx 3)"],
      ["6", "Fonte de verdade?", "Trio: ledger > snapshot > MEMORY"],
    ], [400, 3000, CW - 3400]),
    ...empty(),
    tip("Todas as camadas avançadas são OPT-IN. O framework funciona com sensores + workflow padrão. As demais adicionam profundidade conforme o projeto cresce.")
  ];
}

function sec11_runtime() {
  return [
    h1("11. \uD83D\uDCC1 Runtime e persistência"),
    p("Todos os artefatos que o framework cria e consome, onde vivem e quem escreve neles:"),
    ...empty(),
    tbl(["Artefato", "Quem escreve", "Git?", "Propósito"], [
      ["execution-ledger.md", "Commands", "\u2714\uFE0F", "Estado oficial completo"],
      ["pattern-registry.md", "Manual/justify", "\u2714\uFE0F", "Padrões aprovados"],
      ["session-summaries/latest.md", "Hook Stop", "\u2714\uFE0F", "Handoff operacional 6 seções"],
      ["sensors.json", "Manual", "\u2714\uFE0F", "Declaração de sensores"],
      ["sensors-last-run.json", "/sensors-run", "Efêmero", "Veredicto sensores"],
      ["contracts/phase-<id>.json", "/contract-create", "\u2714\uFE0F", "Contrato de fase"],
      ["contracts/active.json", "/contract-create", "\u2714\uFE0F", "Ponteiro fase ativa"],
      ["contracts/active-sprint.json", "/sprint-create", "\u2714\uFE0F", "Ponteiro sprint ativo"],
      ["sprints/<id>/<sid>.json", "/sprint-create", "\u2714\uFE0F", "Sprint contract"],
      ["behaviours.json", "Manual", "\u2714\uFE0F", "Declaração behaviours"],
      ["behaviours-last-run.json", "/behaviour-run", "Efêmero", "Expected vs actual"],
      ["architecture-linters.json", "Manual", "\u2714\uFE0F", "Declaração linters"],
      ["arch-linters-last-run.json", "/lint-architecture", "Efêmero", "Veredicto linters"],
      ["knowledge-index.json", "/kb-update", "\u2714\uFE0F", "Índice da KB"],
      ["knowledge/*.md", "/kb-update", "\u2714\uFE0F", "Documentos da KB"],
      ["capability-gaps.json", "/gaps-scan", "\u2714\uFE0F", "Registro de gaps"],
      ["project_spec-status.md", "Commands", "Local", "Snapshot resumido"],
      ["MEMORY.md", "Commands", "Local", "Índice de ponteiros"],
    ], [2600, 1600, 1000, CW - 5200]),
    ...empty(),
    h2("Trio de Sincronização"),
    concept("3 arquivos sincronizados: ledger (fonte de verdade) > snapshot (resumo) > MEMORY.md (índice). Se divergirem, o ledger prevalece.")
  ];
}

function sec12_scenarios() {
  return [
    h1("12. \uD83C\uDFAC Cenários práticos"),
    p("Situações reais que você vai encontrar no dia a dia e como o framework te ajuda."),
    ...empty(),

    h2("\uD83C\uDFAF Cenário 1 \u2014 'Quero começar um projeto novo'"),
    scenario("Você tem uma ideia e quer começar do zero."),
    numItem("Rode /spec-create e converse com o framework sobre o produto.", "scenario1"),
    numItem("Quando terminar, rode /spec-check. Se der BLOCKED, resolva e tente de novo.", "scenario1"),
    numItem("Com READY, rode /design-preview se tem interface. Escolha uma opção.", "scenario1"),
    numItem("Rode /plan para gerar o plano de implementação.", "scenario1"),
    numItem("Rode /plan-review. Se vier APPROVED ou APPROVED_WITH_CORRECTIONS, está liberado para implementar.", "scenario1"),
    numItem("Peça ao Claude Code para implementar a Fase 1. Ele escreve; os hooks vigiam.", "scenario1"),
    numItem("Ao final da fase, rode /review para revisão.", "scenario1"),
    numItem("Corrija findings, documente com /justify, e prossiga para a próxima fase.", "scenario1"),
    tip("Uma spec completa de projeto pequeno leva 20-40 minutos de conversa. O plano, 5-10 minutos."),
    ...empty(),

    h2("\uD83D\uDD27 Cenário 2 \u2014 'Preciso corrigir um bug'"),
    scenario("Alguém reportou que a função X está errada."),
    numItem("Rode /status-check para confirmar o estado atual.", "scenario2"),
    numItem("Rode /plan descrevendo o bug e o fix pretendido.", "scenario2"),
    numItem("Rode /plan-review.", "scenario2"),
    numItem("Com APPROVED ou APPROVED_WITH_CORRECTIONS, peça a correção ao Claude Code.", "scenario2"),
    numItem("O framework aplica o fix e busca o mesmo padrão em TODO o projeto.", "scenario2"),
    numItem("Rode /review para confirmar e /verify-spec se o bug afetava requisito da spec.", "scenario2"),
    concept("Nenhum fix é 'pequeno demais'. Mesmo para um typo, o framework pede o fluxo completo."),
    ...empty(),

    h2("\uD83D\uDE80 Cenário 3 \u2014 'Quero fazer o primeiro deploy'"),
    scenario("O projeto está implementado e você vai colocar no ar."),
    numItem("Rode /verify-spec para confirmar que todos os requisitos foram entregues.", "scenario3"),
    numItem("Rode /audit (e as variantes que fazem sentido).", "scenario3"),
    numItem("Corrija tudo que for CRÍTICO e ALTO.", "scenario3"),
    numItem("Rode /ship-check. Esse é o último portão.", "scenario3"),
    numItem("Se PRONTO, pode entregar. Se COM RESSALVAS, decida. Se NÃO PRONTO, resolva.", "scenario3"),
    ...empty(),

    h2("\uD83D\uDD04 Cenário 4 \u2014 'Voltei depois de 2 semanas sem mexer'"),
    scenario("Você abandonou o projeto. Como retomar sem perder contexto?"),
    numItem("Abra o Claude Code na pasta do projeto.", "scenario4"),
    numItem("O framework carrega automaticamente a memória: estado, pendências, decisões.", "scenario4"),
    numItem("Rode /status-check para ver o resumo.", "scenario4"),
    numItem("Se tiver muita coisa acumulada, rode /memory-consolidate.", "scenario4"),
    numItem("Continue de onde parou.", "scenario4"),
    tip("A memória do projeto (estado, decisões, findings, pendências) não depende da sessão. Quando você volta, o framework reconstrói o contexto a partir dos arquivos \u2014 não importa quanto tempo passou.")
  ];
}

function sec13_faq() {
  return [
    h1("13. \u2753 Perguntas frequentes"),
    ...empty(),

    faqBox("Preciso saber programar para usar o framework?"),
    p("Para tirar proveito completo, sim. Mas para acompanhar e entender o que está acontecendo, não. O framework explica cada passo, e você pode pedir ao Claude Code para explicar qualquer coisa."),
    ...empty(),

    faqBox("Posso usar em qualquer linguagem de programação?"),
    p("Sim. O framework é genérico. Alguns hooks têm checks específicos por stack, e o gitignore-guard detecta stacks comuns como Node, Python, Rust, Go e Java. A camada de regras, comandos e agentes continua genérica e funciona em qualquer stack."),
    ...empty(),

    faqBox("E se eu pular um passo?"),
    p("Alguns passos têm portões mecânicos (como o /plan-review antes de implementar). Esses não dá para pular \u2014 o framework bloqueia. Outros são disciplinares: tecnicamente dá, mas você perde as garantias de qualidade."),
    ...empty(),

    faqBox("O framework funciona offline?"),
    p("Os hooks e comandos sim. A parte de cross-review com Codex precisa de conexão. O Claude Code em si também precisa de conexão (chama a API da Anthropic)."),
    ...empty(),

    faqBox("Posso customizar as regras?"),
    p("Pode. As regras vivem em arquivos .md dentro de .claude/rules/. Você pode editar, adicionar novas, remover as que não fazem sentido. O framework é seu \u2014 adapte como precisar."),
    ...empty(),

    faqBox("Como o framework se compara a rodar o Claude Code sem ele?"),
    p("Sem framework: você depende da memória do assistente e da disciplina de pedir revisão. Com framework: tudo é estruturado, automatizado, verificado em múltiplas camadas e guardado entre sessões. A diferença aparece em projetos médios para grandes."),
    ...empty(),

    faqBox("Quanto o framework adiciona de tempo ao trabalho?"),
    p("No começo, parece adicionar. Depois do segundo ou terceiro projeto, você percebe que economiza tempo \u2014 porque os bugs que você teria não acontecem, e as decisões que você teria esquecido estão documentadas."),
    ...empty(),

    faqBox("Posso usar em projetos profissionais?"),
    p("O framework foi desenhado exatamente para projetos profissionais. Use em projetos pessoais para aprender o fluxo, depois leve para o trabalho."),
    ...empty(),

    faqBox("Preciso atualizar o framework com frequência?"),
    p("Não. O framework é estável. Quando sair versão nova com melhorias (como V4+), basta copiar os arquivos atualizados para o seu projeto."),
    ...empty(),

    faqBox("E se o framework reclamar de algo que eu sei que está certo?"),
    p("Leia a justificativa que o framework apresenta. Às vezes ele está certo e você não percebeu. Se depois de ler você ainda achar que ele está errado, pode discordar e seguir \u2014 o framework avisa, não obriga (exceto nos portões mecânicos)."),
    ...empty(),

    faqBox("O que são as 'camadas avançadas' (sensores, contratos, behaviours...)?"),
    p("São ferramentas OPT-IN para projetos que querem verificação profunda. O framework básico funciona sem elas. Conforme o projeto cresce, você pode adotar sensores (verificação mecânica), contratos (compromisso formal por fase), behaviours (teste de comportamento real), linters (invariantes estruturais), knowledge base (documentação sintetizada) e gaps (rastreamento de lacunas).")
  ];
}

function sec14_card() {
  return [
    h1("14. \uD83D\uDDC2\uFE0F Cartão de referência rápida"),
    note("Para imprimir e deixar ao lado"),
    ...empty(),

    h2("\uD83C\uDFAF Fluxo em 12 passos"),
    tbl(["#", "", "Comando", "Objetivo"], [
      ["1", "\uD83D\uDCDD", "/spec-create", "Criar a especificação"],
      ["2", "\uD83D\uDD0E", "/spec-check", "Validar que está pronta"],
      ["3", "\uD83C\uDFA8", "/design-preview + /ui-plan", "Escolher visual (se tem UI)"],
      ["4", "\uD83D\uDDFA\uFE0F", "/plan", "Planejar implementação"],
      ["5", "\u2705", "/plan-review", "Revisar plano (portão)"],
      ["6", "\u2328\uFE0F", "implementar", "Escrever código"],
      ["7", "\uD83D\uDD0D", "/review", "Revisar o código"],
      ["8", "\uD83D\uDEE1\uFE0F", "/audit + variantes", "Auditoria profunda"],
      ["9", "\uD83E\uDE79", "corrigir", "Resolver findings"],
      ["10", "\uD83D\uDCDD", "/justify", "Documentar decisões"],
      ["11", "\uD83C\uDFAF", "/verify-spec", "Verificar aderência"],
      ["12", "\uD83D\uDE80", "/ship-check", "Checagem final"],
    ], [500, 500, 2600, CW - 3600]),
    ...empty(),

    h2("\uD83D\uDEA6 Sinais que você vai ver"),
    tbl(["", "Veredicto", "Ação"], [
      ["\uD83D\uDFE2", "READY / APPROVED / PRONTO / MATCH", "Pode avançar"],
      ["\uD83D\uDFE1", "READY WITH ASSUMPTIONS / APPROVED_WITH_CORRECTIONS / PARCIAL / PRONTO COM RESSALVAS", "Pode avançar com consciência dos pontos abertos"],
      ["\uD83D\uDD34", "BLOCKED / NEEDS_REVISION / NEEDS_HUMAN_REVIEW / NÃO PRONTO / MISS", "Não avance \u2014 resolva antes"],
    ], [500, 3600, CW - 4100]),
    ...empty(),

    h2("\uD83C\uDD98 Se algo der errado"),
    tbl(["Situação", "O que fazer"], [
      ["Hook bloqueou edição", "Leia a mensagem do hook \u2014 ele explica exatamente o problema"],
      ["/plan-review retornou NEEDS_REVISION", "Corrija o plano conforme os findings BLOCKING e rode de novo"],
      ["Findings de segurança", "Comece pelos CRÍTICO e ALTO; os demais são débito técnico"],
      ["Perdi o contexto do projeto", "Rode /status-check \u2014 a memória recupera tudo"],
      ["Não sei em que fase estou", "Rode /status-check \u2014 mostra o estado atual"],
      ["Framework parece travado", "Veja se o Codex está em background \u2014 pode estar analisando"],
      ["Sensor falhou mas código parece ok", "Rode /sensors-run para ver o exit code real. Exit code é autoridade"],
      ["Contrato com veredicto FAILED", "Rode /contract-check para ver qual deliverable ou sensor falhou"],
    ], [3000, CW - 3000]),
    ...empty(),

    h2("\uD83D\uDCE1 Camadas avançadas \u2014 referência rápida"),
    tbl(["Camada", "Adotar quando", "Command principal"], [
      ["Sensores", "Qualquer projeto (recomendado)", "/sensors-run"],
      ["Contracts", "Fases com mais de 1 dia", "/contract-create"],
      ["Sprints", "Fases longas que precisam de feedback curto", "/sprint-create"],
      ["Behaviours", "Projeto com endpoints/CLI/estado observável", "/behaviour-run"],
      ["Linters", "Projeto com invariantes cross-file", "/lint-architecture"],
      ["Knowledge Base", "Projeto com muitas decisões e camadas", "/kb-update"],
      ["Gaps", "Projeto maduro que quer rastrear lacunas", "/gaps-scan"],
    ], [1600, 3400, CW - 5000])
  ];
}

function sec15_glossary() {
  return [
    h1("15. \uD83D\uDCD6 Glossário"),
    tbl(["Termo", "Definição simples"], [
      ["\uD83D\uDCD2 Ledger", "Registro oficial e completo do histórico do projeto"],
      ["\uD83D\uDCF8 Snapshot", "Resumo compacto do estado atual (na memória)"],
      ["\uD83D\uDD04 Trio", "3 arquivos sincronizados: ledger + snapshot + MEMORY.md"],
      ["\uD83D\uDEA7 Gate", "Checkpoint obrigatório que BLOQUEIA se não passar"],
      ["\uD83D\uDCE1 Sensor", "Verificação mecânica por exit code"],
      ["\uD83E\uDDEA Behaviour", "Ação real + comparação expected vs actual"],
      ["\uD83C\uDFD7\uFE0F Linter", "Verificação de invariante estrutural cross-file"],
      ["\uD83D\uDCDC Contract", "Declaração formal do que a fase promete"],
      ["\uD83C\uDFC3 Sprint", "Unidade atômica de entrega (1-2h) com evaluator"],
      ["\uD83D\uDD0D Gap", "Lacuna de verificação registrada persistentemente"],
      ["\u23F3 Staleness", "Resultado desatualizado (código mudou após run)"],
      ["\uD83D\uDD17 Binding", "Vínculo bidirecional behaviour <-> acceptance criterion"],
      ["\u2699\uFE0F Harness", "Conjunto de ferramentas de verificação"],
      ["\uD83E\uDDEE Evaluator", "Bateria de checks atômicos com verdict mecânico"],
      ["\u2696\uFE0F Verdict", "Resultado final (PASS/FAIL/PARTIAL)"],
      ["\uD83D\uDD11 identity_key", "Chave determinística de merge do scanner de gaps"],
      ["\uD83D\uDEE1\uFE0F Hook", "Script automático que roda em evento (edit, session-start)"],
      ["\uD83E\uDD16 Agent", "Especialista virtual chamado por commands"],
      ["\uD83D\uDCCB Rule", "Regra .md ativamente aplicada pelo framework"],
      ["\uD83D\uDCDA Knowledge Base", "View consolidada do conhecimento do projeto"],
    ], [2000, CW - 2000]),
    ...empty(), ...empty(),
    pCenter("\uD83C\uDF89", 48),
    pCenter("Pronto para começar!", 32, { bold: true, color: C.primary }),
    pCenter("Abra o Claude Code, rode /spec-create e deixe o framework te guiar.", 24, { italics: true }),
    ...empty(),
    pCenter("\u2014 Fim do Guia \u2014", 28, { color: C.secondary, italics: true }),
    pCenter("Claude Code Quality Framework V4+ \u2014 Guia Prático Didático", 20),
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
              new TextRun({ text: "Página ", font: FONT, size: 16, color: C.dark }),
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
