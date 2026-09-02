// Gera o PPTX de evidências da Sprint 2 (19 slides) a partir deste script:
//   cd apresentacao && npm install && node build_pptx.js
// O arquivo é escrito na raiz do repositório, sobrescrevendo a versão anterior.
const path = require("path");
const pptxgen = require("pptxgenjs");

// ─── Palette ────────────────────────────────────────────────────────────────
const NAVY = "0B1B40";
const NAVY2 = "0F2A4A";
const INK = "091832";
const TEAL = "14B8A6";
const TEALDARK = "0D9488";
const GOLD = "F59E0B";
const RED = "EF4444";
const WHITE = "FFFFFF";
const MUTED = "94A3B8";
const LIGHT = "EAF6F3";

const RAIZ = path.join(__dirname, "..");
const OUT = path.join(RAIZ, "EC_Sprint_2_1TSCOA_EvidenciasConstrucao_LEITO360_GRUPO61.pptx");

// Capturas reais do dashboard publicado, versionadas em docs/evidencias/prints/.
const PRINT_EXECUTIVO = path.join(RAIZ, "docs", "evidencias", "prints", "dashboard_visao_executiva.png");
const PRINT_ANALITICO = path.join(RAIZ, "docs", "evidencias", "prints", "dashboard_explorador_analitico.png");
// Silhueta do Brasil da capa, gerada a partir da mesma malha do IBGE (ver assets/mapa_marca.html).
const MARCA_MAPA = path.join(__dirname, "assets", "mapa_marca.png");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5 in
const W = 13.333, H = 7.5;

pres.defineSlideMaster({
  title: "DARK",
  background: { color: NAVY },
});

function baseSlide() {
  const s = pres.addSlide({ masterName: "DARK" });
  return s;
}

function footer(s, num) {
  s.addText("LEITO360 — Challenge FIAP + Oracle 2026 — Grupo 61 — 1TSCOA", {
    x: 0.5, y: H - 0.42, w: 9, h: 0.3, fontSize: 9, color: MUTED, fontFace: "Calibri",
  });
  s.addText(String(num), {
    x: W - 1, y: H - 0.42, w: 0.6, h: 0.3, fontSize: 9, color: MUTED, align: "right", fontFace: "Calibri",
  });
}

// filete que separa o cabeçalho do conteúdo, igual em todos os slides
function headerRule(s) {
  s.addShape(pres.ShapeType.rect, {
    x: 0.5, y: 2.12, w: W - 1, h: 0.02, fill: { color: "1E3A5F" }, line: { type: "none" },
  });
}

function sectionTag(s, tag) {
  s.addShape(pres.ShapeType.roundRect, {
    x: 0.5, y: 0.4, w: 3.6, h: 0.4, rectRadius: 0.08,
    fill: { color: TEALDARK }, line: { type: "none" },
  });
  s.addText(tag, {
    x: 0.5, y: 0.4, w: 3.6, h: 0.4, fontSize: 12, bold: true, color: WHITE,
    align: "center", valign: "middle", fontFace: "Calibri", margin: 0,
  });
  headerRule(s);
}

function title(s, text, y = 0.95) {
  s.addText(text, {
    x: 0.5, y, w: W - 1, h: 0.7, fontSize: 28, bold: true, color: WHITE,
    fontFace: "Cambria", margin: 0,
  });
}

function subtitle(s, text, y = 1.55) {
  s.addText(text, {
    x: 0.5, y, w: W - 1, h: 0.5, fontSize: 14, color: MUTED, fontFace: "Calibri", margin: 0,
  });
}

function statusPill(s, x, y, label, color) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w: 1.9, h: 0.35, rectRadius: 0.17, fill: { color: "1E3A5F", transparency: 20 }, line: { color, width: 1 },
  });
  s.addText(label, {
    x, y, w: 1.9, h: 0.35, fontSize: 10, bold: true, color, align: "center", valign: "middle", margin: 0, fontFace: "Calibri",
  });
}

function card(s, x, y, w, h, opts = {}) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: opts.fill || NAVY2 }, line: { color: "1E3A5F", width: 1 },
    shadow: { type: "outer", color: "000000", opacity: 0.35, blur: 8, offset: 3, angle: 90 },
  });
}

function iconCircle(s, x, y, d, color, glyph) {
  s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: "1E3A5F", transparency: 20 }, line: { color, width: 1.5 } });
  s.addText(glyph, { x, y, w: d, h: d, fontSize: d * 22, align: "center", valign: "middle", color, bold: true, margin: 0 });
}

// captura real do dashboard + coluna de leitura da tela
function screenshotSlide(s, imagem, destaques, rodape) {
  const IX = 0.5, IY = 2.3, IW = 7.73, IH = 4.35; // 16:9, mesma proporção do PNG
  s.addShape(pres.ShapeType.roundRect, {
    x: IX - 0.06, y: IY - 0.06, w: IW + 0.12, h: IH + 0.12, rectRadius: 0.05,
    fill: { color: "060D1E" }, line: { color: "1E3A5F", width: 1 },
    shadow: { type: "outer", color: "000000", opacity: 0.45, blur: 10, offset: 3, angle: 90 },
  });
  s.addImage({ path: imagem, x: IX, y: IY, w: IW, h: IH });

  const CX = 8.5, CW = 4.33;
  card(s, CX, IY, CW, IH);
  s.addText("O que a tela mostra", {
    x: CX + 0.22, y: IY + 0.18, w: CW - 0.44, h: 0.35, fontSize: 13, bold: true, color: TEAL,
    fontFace: "Calibri", margin: 0,
  });
  let cy = IY + 0.6;
  for (const [titulo, texto] of destaques) {
    s.addText(titulo, {
      x: CX + 0.22, y: cy, w: CW - 0.44, h: 0.26, fontSize: 11, bold: true, color: WHITE,
      fontFace: "Calibri", margin: 0,
    });
    s.addText(texto, {
      x: CX + 0.22, y: cy + 0.25, w: CW - 0.44, h: 0.68, fontSize: 10, color: LIGHT,
      fontFace: "Calibri", margin: 0, lineSpacingMultiple: 1.12,
    });
    cy += 0.93;
  }
  s.addText(rodape, {
    x: IX, y: IY + IH + 0.14, w: IW, h: 0.3, fontSize: 9.5, italic: true, color: MUTED,
    fontFace: "Calibri", margin: 0,
  });
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 1 — Capa
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  s.addImage({ path: MARCA_MAPA, x: 8.6, y: 0.35, w: 4.1, h: 4.1 });
  s.addShape(pres.ShapeType.rect, {
    x: 0.9, y: 1.55, w: 1.5, h: 0.06, fill: { color: TEAL }, line: { type: "none" },
  });
  s.addText([
    { text: "LEITO", options: { color: WHITE } },
    { text: "360", options: { color: TEAL } },
  ], { x: 0.9, y: 2.0, w: 10, h: 1.3, fontSize: 60, bold: true, fontFace: "Cambria", margin: 0 });
  s.addText("Sprint 2 — Construção da Solução & Pitch", {
    x: 0.9, y: 3.15, w: 10, h: 0.5, fontSize: 20, color: LIGHT, fontFace: "Calibri", margin: 0,
  });
  s.addText("Plataforma analítica que integra SIH/SUS, CNES e IBGE no Oracle AI Database para comparar internações, permanência, mortalidade e leitos SUS cadastrados entre UFs.", {
    x: 0.9, y: 3.7, w: 8.8, h: 0.7, fontSize: 12.5, color: MUTED, fontFace: "Calibri", margin: 0,
  });

  card(s, 0.9, 4.6, 11.5, 2.2);
  s.addText("Challenge FIAP + Oracle 2026 · Turma 1TSCOA · Grupo 61 · Ciências de Dados · FIAP Paulista", {
    x: 1.2, y: 4.75, w: 11, h: 0.35, fontSize: 12, bold: true, color: TEAL, fontFace: "Calibri", margin: 0,
  });
  const integrantes = [
    ["569250", "Gabriel Silva de Jesus", "Dados, fontes, arquitetura — Representante"],
    ["573021", "João Gabriel Bernardes", "ETL e indicadores"],
    ["570993", "Natália Naomi Nakamura", "Gestão, negócio e documentação"],
    ["568816", "Pedro Henrique Wei Chern", "IA e Select AI"],
    ["570130", "Vitória Cristina da Silva Coutinho", "UX/UI, protótipo e front-end"],
  ];
  let iy = 5.25;
  for (const [rm, nome, papel] of integrantes) {
    s.addText([
      { text: `RM ${rm}  `, options: { color: GOLD, bold: true } },
      { text: nome + "  ", options: { color: WHITE, bold: true } },
      { text: "— " + papel, options: { color: MUTED } },
    ], { x: 1.2, y: iy, w: 11, h: 0.3, fontSize: 11, fontFace: "Calibri", margin: 0 });
    iy += 0.31;
  }
  footer(s, 1);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 2 — Contexto / problema / objetivo (recap)
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "CONTEXTO");
  title(s, "O problema: dados do SUS fragmentados e tardios");
  subtitle(s, "Gestores de saúde cruzam manualmente SIH/SUS, CNES e IBGE para comparar internações, permanência, mortalidade e leitos SUS — sem visão única, comparável e auditável.");

  const cards = [
    ["Público-alvo", "Gestores públicos de saúde, pesquisadores e analistas que precisam de uma visão comparativa nacional/regional/estadual baseada em dados oficiais abertos."],
    ["Objetivo", "Consolidar as três fontes públicas em uma plataforma reprodutível e transparente, com indicadores documentados e consulta em linguagem natural via Oracle Select AI."],
    ["Escopo do MVP", "Seis competências (Nov/2025–Abr/2026), 27 UFs, indicadores de pressão assistencial, leitos SUS/10k hab. e permanência ponderada — sem prometer tempo real."],
  ];
  let cx = 0.5;
  const cw = 4.05;
  for (const [h, body] of cards) {
    card(s, cx, 2.3, cw, 3.9);
    s.addText(h, { x: cx + 0.25, y: 2.5, w: cw - 0.5, h: 0.4, fontSize: 15, bold: true, color: TEAL, fontFace: "Calibri", margin: 0 });
    s.addText(body, { x: cx + 0.25, y: 2.95, w: cw - 0.5, h: 3.0, fontSize: 12, color: LIGHT, fontFace: "Calibri", margin: 0, lineSpacingMultiple: 1.25 });
    cx += cw + 0.17;
  }
  footer(s, 2);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 3 — 1ª Entrega: Sprint 1 atualizada
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "1ª ENTREGA");
  title(s, "Sprint 1 atualizada — planejado x entregue");
  subtitle(s, "Comparativo entre o que foi proposto na Sprint 1 (protótipo Figma + apresentação) e o que foi realmente implementado nesta Sprint 2.");

  const cabecalho = ["Item", "Sprint 1 (planejado)", "Sprint 2 (entregue)", "Status"].map((t) => ({
    text: t, options: { bold: true, color: WHITE, fill: { color: INK }, fontSize: 10.5, valign: "middle" },
  }));

  const corpo = [
    ["Dados", "Números fixos no código (ocupação, ranking, internações)", "Pipeline real SIH/SUS + CNES + IBGE, 162 registros reconciliados", "Implementado"],
    ["Oracle", "Citado na UI, sem execução real", "Relacional + JSON nativo + external table + view, executados no Oracle", "Implementado"],
    ["Select AI", "SQL estático simulando resposta da IA", "Perfil real respondendo (provider Cohere): NL2SQL sobre a view analítica", "Implementado"],
    ["Dashboard", "2 telas mockadas, \"Ao vivo\", ocupação fake", "Filtros reais, mapa com malha oficial do IBGE, export CSV, sem mocks", "Implementado"],
    ["Publicação", "Não publicado", "Repositório público no GitHub + dashboard no ar via GitHub Pages", "Implementado"],
  ];

  const corStatus = { "Implementado": TEAL, "Parcial*": GOLD, "Planejado": MUTED };
  const rows = [
    cabecalho,
    ...corpo.map((linha) => linha.map((texto, i) => ({
      text: texto,
      options: {
        color: i === 3 ? (corStatus[texto] || LIGHT) : LIGHT,
        bold: i === 3,
        fontSize: 10.5,
        valign: "middle",
      },
    }))),
  ];

  s.addTable(rows, {
    x: 0.5, y: 2.35, w: 12.3, h: 4.3,
    fontFace: "Calibri", fontSize: 10.5, color: LIGHT, border: { type: "solid", color: "1E3A5F", pt: 0.5 },
    fill: { color: NAVY2 }, autoPage: false,
    colW: [1.9, 4.0, 4.6, 1.8],
  });
  s.addText("Oracle, Select AI e dashboard executados de verdade (evidências nos slides 6, 7, 8, 14 e 15). O Select AI só funcionou depois de trocar o provider de OCI Generative AI para Cohere — o percurso do diagnóstico está no slide 15.", {
    x: 0.5, y: 6.75, w: 12.3, h: 0.35, fontSize: 9.5, italic: true, color: MUTED, fontFace: "Calibri", margin: 0,
  });
  footer(s, 3);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 4 — 2ª Entrega: fontes de dados
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "2ª ENTREGA");
  title(s, "MVP implementado — fontes de dados oficiais");
  subtitle(s, "Três fontes públicas, consultadas de verdade (não simuladas), com respostas originais preservadas em data/raw/.");

  const fontes = [
    ["SIH/SUS", "Morbidade Hospitalar", "Internações, permanência média, óbitos, taxa de mortalidade — por UF/competência", "tabnet.datasus.gov.br (sih/cnv/niuf.def)"],
    ["CNES", "Leitos de Internação", "Leitos de internação cadastrados e destinados ao SUS — por UF/competência", "tabnet.datasus.gov.br (cnes/cnv/leiintbr.def)"],
    ["IBGE", "População + Malha Territorial", "População estimada 2026 por UF (SIDRA, tabela 6579) e malha oficial das UFs usada no mapa", "apisidra.ibge.gov.br · servicodados.ibge.gov.br"],
  ];
  let fy = 2.3;
  for (const [nome, sub, desc, url] of fontes) {
    card(s, 0.5, fy, 12.3, 1.3);
    iconCircle(s, 0.75, fy + 0.28, 0.8, TEAL, "◆");
    s.addText(nome, { x: 1.75, y: fy + 0.12, w: 3, h: 0.35, fontSize: 15, bold: true, color: WHITE, fontFace: "Calibri", margin: 0 });
    s.addText(sub, { x: 1.75, y: fy + 0.48, w: 3, h: 0.3, fontSize: 10.5, color: TEAL, fontFace: "Calibri", margin: 0 });
    s.addText(desc, { x: 5.1, y: fy + 0.18, w: 5.0, h: 0.9, fontSize: 10.5, color: LIGHT, fontFace: "Calibri", margin: 0, valign: "middle" });
    s.addText(url, { x: 10.2, y: fy + 0.4, w: 2.4, h: 0.5, fontSize: 9, color: MUTED, fontFace: "Courier New", margin: 0, valign: "middle" });
    fy += 1.45;
  }
  s.addText("Recorte: 6 competências (Nov/2025 a Abr/2026) · 27 UFs · 162 registros consolidados, sem duplicatas nem nulos, 100% reconciliados com os totais de controle do TabNet.", {
    x: 0.5, y: fy + 0.08, w: 12.3, h: 0.4, fontSize: 11.5, bold: true, color: GOLD, fontFace: "Calibri", margin: 0,
  });
  footer(s, 4);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 5 — algoritmos/ETL + indicadores
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "2ª ENTREGA");
  title(s, "Algoritmos, métodos e transformações do ETL");
  subtitle(s, "Pipeline Python (biblioteca padrão) reprodutível: fetch → parse → padronização → validação → indicadores → export.");

  const steps = ["1. Fetch\n(HTTP real)", "2. Parse\n(HTML/JSON)", "3. Padroniza\n(UF/região)", "4. Valida\n(cobertura/nulos)", "5. Indicadores\n(fórmulas)", "6. Export\n(CSV/JSON)"];
  let sx = 0.5;
  const sw = 1.95;
  for (let i = 0; i < steps.length; i++) {
    card(s, sx, 2.3, sw, 1.1);
    s.addText(steps[i], { x: sx, y: 2.3, w: sw, h: 1.1, fontSize: 11, bold: true, color: WHITE, align: "center", valign: "middle", fontFace: "Calibri", margin: 0 });
    sx += sw + 0.17;
  }
  // setas depois dos cards, senão o card seguinte as cobre
  for (let i = 0; i < steps.length - 1; i++) {
    s.addText("→", {
      x: 0.5 + (i + 1) * (sw + 0.17) - 0.26, y: 2.55, w: 0.35, h: 0.6,
      fontSize: 16, color: TEAL, align: "center", valign: "middle", margin: 0,
    });
  }

  const formulas = [
    "Internações /100k hab. = internações ÷ população × 100.000",
    "Leitos SUS /10k hab. = leitos SUS cadastrados ÷ população × 10.000",
    "Permanência média ponderada = Σ(permanência UF × internações UF) ÷ Σ(internações)",
    "Variação mensal = (internações mês atual ÷ internações mês anterior − 1) × 100",
    "Internações por leito = internações ÷ leitos SUS cadastrados",
    "Tercil de pressão assistencial comparativa (classificação por competência)",
  ];
  card(s, 0.5, 3.7, 12.3, 3.05);
  s.addText("Indicadores e fórmulas (implementados em etl/parse_validate_build.py)", {
    x: 0.75, y: 3.85, w: 11.8, h: 0.35, fontSize: 13, bold: true, color: TEAL, fontFace: "Calibri", margin: 0,
  });
  let fy2 = 4.25;
  for (const f of formulas) {
    s.addText([{ text: "▸ ", options: { color: GOLD } }, { text: f, options: { color: LIGHT } }], {
      x: 0.75, y: fy2, w: 11.8, h: 0.4, fontSize: 12, fontFace: "Courier New", margin: 0,
    });
    fy2 += 0.4;
  }
  footer(s, 5);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 6 — Evidência real da execução do ETL (dados reais, não print)
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "2ª/5ª ENTREGA");
  title(s, "Evidência da execução real do pipeline");
  subtitle(s, "Saída real de data/processed/validacao_pipeline.json — todos os 6 totais mensais batem exatamente com os totais de controle do TabNet.");

  const rows = [
    [{ text: "Competência", options: { bold: true, fill: { color: INK }, color: WHITE } },
     { text: "Internações (execução)", options: { bold: true, fill: { color: INK }, color: WHITE } },
     { text: "Internações (controle)", options: { bold: true, fill: { color: INK }, color: WHITE } },
     { text: "Diferença", options: { bold: true, fill: { color: INK }, color: WHITE } },
     { text: "Leitos SUS (execução)", options: { bold: true, fill: { color: INK }, color: WHITE } },
     { text: "Diferença", options: { bold: true, fill: { color: INK }, color: WHITE } }],
    ["2025-11", "1.193.539", "1.193.539", "0", "315.733", "0"],
    ["2025-12", "1.162.871", "1.162.871", "0", "316.529", "0"],
    ["2026-01", "1.178.308", "1.178.308", "0", "316.339", "0"],
    ["2026-02", "1.143.546", "1.143.546", "0", "316.227", "0"],
    ["2026-03", "1.256.010", "1.256.010", "0", "316.454", "0"],
    ["2026-04", "1.218.903", "1.218.903", "0", "316.235", "0"],
  ].map((r, ri) => r.map((t, i) => typeof t === "string" ? { text: t, options: { color: ri === 0 ? LIGHT : (i >= 3 ? TEAL : LIGHT), fontSize: 11, valign: "middle", bold: i === 3 || i === 5 } } : t));

  s.addTable(rows, {
    x: 0.5, y: 2.3, w: 12.3, h: 3.0, fontFace: "Courier New", fontSize: 11, border: { type: "solid", color: "1E3A5F", pt: 0.5 },
    fill: { color: NAVY2 },
  });

  card(s, 0.5, 5.5, 12.3, 1.3);
  s.addText([
    { text: "162 registros ", options: { bold: true, color: TEAL } },
    { text: "consolidados (27 UFs × 6 competências) · 0 duplicatas · 0 nulos em campos críticos · pipeline com código de saída ≠ 0 em caso de falha de qualidade.", options: { color: LIGHT } },
  ], { x: 0.8, y: 5.7, w: 11.7, h: 0.9, fontSize: 13, fontFace: "Calibri", margin: 0, valign: "middle" });
  footer(s, 6);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 7/8 — MVP: capturas reais das duas telas
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "2ª ENTREGA");
  title(s, "MVP — dashboard (Visão Executiva)");
  subtitle(s, "Captura real da aplicação publicada, com dados de Abr/2026 vindos de public/data/leito360.json — nenhum número digitado à mão.");
  screenshotSlide(s, PRINT_EXECUTIVO, [
    ["4 KPIs recalculados a cada recorte", "Internações do período, média por dia, permanência ponderada e leitos SUS cadastrados, com a variação sobre o mês anterior."],
    ["Mapa com a malha oficial do IBGE", "UFs coloridas pelos tercis de pressão assistencial da competência — os cortes aparecem na própria legenda."],
    ["Clicar numa UF recorta a tela inteira", "Paraná na captura: KPIs, subtítulo, ranking e série de internações passam a responder só por aquela UF."],
    ["Ranking e série de seis competências", "As 5 UFs sob maior pressão e a evolução das internações do recorte, com os valores rotulados."],
  ], "Captura em gabriellive1817-stack.github.io/Leito_360 · competência Abr/2026 · Brasil · UF selecionada: Paraná.");
  footer(s, 7);
}
{
  const s = baseSlide();
  sectionTag(s, "2ª ENTREGA");
  title(s, "MVP — Explorador Analítico");
  subtitle(s, "Quatro consultas guiadas sobre os mesmos dados, com SQL equivalente, cobertura do pipeline e exportação em CSV.");
  screenshotSlide(s, PRINT_ANALITICO, [
    ["Quatro perguntas de negócio", "Maior pressão, menor oferta de leitos, maior permanência e maior mortalidade — resultados reproduzíveis."],
    ["SQL equivalente sempre visível", "A consulta correspondente sobre VW_LEITO360_ANALITICO, identificada como não gerada por IA."],
    ["Qualidade e cobertura declaradas", "27 UFs, 6 períodos, 162 registros e reconciliação OK, direto do relatório de validação do ETL."],
    ["Fontes e limitações na própria tela", "Links oficiais do SIH/SUS, CNES e IBGE e as limitações metodológicas ao lado dos números."],
  ], "Captura em gabriellive1817-stack.github.io/Leito_360 · competência Abr/2026 · consulta de maior pressão assistencial.");
  footer(s, 8);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 9 — Arquitetura final implementada (diagrama)
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "3ª ENTREGA");
  title(s, "Arquitetura final implementada");
  subtitle(s, "Fluxo ponta a ponta: fontes oficiais → ETL Python → Oracle (3 formatos) → JSON sanitizado → dashboard estático.");

  const boxes = [
    ["Fontes oficiais", "TabNet SIH/CNES\nIBGE SIDRA + Malhas", TEAL],
    ["ETL Python", "fetch → parse\nvalida → indicadores", GOLD],
    ["Oracle AI DB", "Relacional + JSON\n+ External Table", "3B82F6"],
    ["Select AI", "Perfil LEITO360_AI\nSHOWSQL/RUNSQL", "8B5CF6"],
    ["Dashboard", "React/Vite estático\nGitHub Pages", TEAL],
  ];
  let bx = 0.5;
  const bw = 2.28;
  for (let i = 0; i < boxes.length; i++) {
    const [h, sub, color] = boxes[i];
    card(s, bx, 2.9, bw, 1.7, { fill: NAVY2 });
    s.addShape(pres.ShapeType.roundRect, { x: bx, y: 2.9, w: bw, h: 0.08, fill: { color }, line: { type: "none" } });
    s.addText(h, { x: bx + 0.12, y: 3.1, w: bw - 0.24, h: 0.4, fontSize: 12.5, bold: true, color: WHITE, fontFace: "Calibri", margin: 0 });
    s.addText(sub, { x: bx + 0.12, y: 3.55, w: bw - 0.24, h: 0.9, fontSize: 10, color: MUTED, fontFace: "Calibri", margin: 0 });
    bx += bw + 0.17;
  }
  for (let i = 0; i < boxes.length - 1; i++) {
    s.addText("→", {
      x: 0.5 + (i + 1) * (bw + 0.17) - 0.26, y: 3.5, w: 0.35, h: 0.6,
      fontSize: 16, color: TEAL, align: "center", valign: "middle", margin: 0,
    });
  }

  s.addText([
    { text: "O front-end não se conecta ao Oracle nem contém credenciais: ", options: { bold: true, color: LIGHT } },
    { text: "lê um JSON estático publicado pelo ETL local. O Select AI roda no Database Actions do Oracle e é demonstrado ao vivo no pitch.", options: { color: MUTED } },
  ], { x: 0.5, y: 5.0, w: 12.3, h: 0.6, fontSize: 12, fontFace: "Calibri", margin: 0 });

  const layers = [
    ["Origem dos dados", "SIH/SUS, CNES, IBGE (SIDRA + malha das UFs) — HTTP real", TEAL],
    ["Processamento", "Python stdlib — fetch_raw.py + parse_validate_build.py + build_malha_uf.py", TEAL],
    ["Armazenamento/modelagem", "Oracle: LEITO360_SIH, LEITO360_CNES_JSON, LEITO360_POPULACAO_EXT, VW_LEITO360_ANALITICO", GOLD],
    ["Visualização/consumo", "public/data/leito360.json → dashboard React/Vite estático", TEAL],
  ];
  let ly = 5.75;
  for (const [h, d, c] of layers) {
    s.addText([{ text: h + ":  ", options: { bold: true, color: c } }, { text: d, options: { color: LIGHT } }], {
      x: 0.5, y: ly, w: 12.3, h: 0.3, fontSize: 10.5, fontFace: "Calibri", margin: 0,
    });
    ly += 0.31;
  }
  footer(s, 9);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 10 — % implementado por camada
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "3ª ENTREGA");
  title(s, "O que foi realmente implementado (x planejado)");
  subtitle(s, "Sem tratar Oracle/Select AI como \"evolução futura\" — status real de cada camada nesta sprint.");

  const items = [
    ["ETL (3 fontes reais, validado, reconciliado)", 100, TEAL, "Implementado"],
    ["Execução Oracle (3 formatos + view, 162 registros confirmados no LiveLabs)", 100, TEAL, "Implementado"],
    ["Select AI (perfil real, NL2SQL confirmado, provider Cohere)", 100, TEAL, "Implementado"],
    ["Dashboard sem mocks (filtros, mapa, export CSV)", 100, TEAL, "Implementado"],
    ["Publicação (GitHub público + GitHub Pages ao vivo)", 100, TEAL, "Implementado"],
    ["Vídeo pitch (gravado, com demonstração ao vivo do Oracle e do dashboard)", 100, TEAL, "Implementado"],
  ];
  let iy2 = 2.45;
  for (const [label, pct, color, status] of items) {
    s.addText(label, { x: 0.5, y: iy2, w: 6.9, h: 0.4, fontSize: 12, color: LIGHT, fontFace: "Calibri", margin: 0, valign: "middle" });
    s.addShape(pres.ShapeType.roundRect, { x: 7.55, y: iy2 + 0.08, w: 2.6, h: 0.24, rectRadius: 0.05, fill: { color: "1E3A5F" }, line: { type: "none" } });
    s.addShape(pres.ShapeType.roundRect, { x: 7.55, y: iy2 + 0.08, w: Math.max(2.6 * pct / 100, 0.05), h: 0.24, rectRadius: 0.05, fill: { color }, line: { type: "none" } });
    s.addText(pct + "%", { x: 10.25, y: iy2, w: 0.65, h: 0.4, fontSize: 11, bold: true, color, fontFace: "Calibri", margin: 0, valign: "middle" });
    statusPill(s, 11.0, iy2 + 0.03, status, color);
    iy2 += 0.78;
  }
  footer(s, 10);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 11 — 4ª Entrega: modelos analíticos e técnicas
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "4ª ENTREGA");
  title(s, "Modelos analíticos e técnicas utilizadas");
  subtitle(s, "Análise exploratória de dados (EDA), padronização, reconciliação e classificação comparativa aplicadas ao conjunto consolidado.");

  const techs = [
    ["Limpeza e padronização", "Decodificação de entidades HTML/Latin-1, parsing do formato \"prn\" do TabNet, normalização de UF/região/competência."],
    ["Validação de qualidade", "Cobertura das 27 UFs por competência, checagem de duplicatas na chave (competência, UF), nulos em campos críticos."],
    ["Reconciliação estatística", "Soma por UF comparada à linha \"Total\" do próprio TabNet e aos totais de controle originais — divergências reportadas, nunca escondidas."],
    ["Classificação por tercis", "internacoes_por_100k_hab dividido em 3 grupos (baixo/médio/alto) por competência — indicador usado para colorir o mapa."],
    ["Indicadores derivados", "Taxas per capita, médias ponderadas por internações, variação mês a mês, razão internações/leito."],
    ["Consulta em linguagem natural", "Oracle Select AI (DBMS_CLOUD_AI) traduz pergunta em português para SQL sobre a view analítica."],
  ];
  let tx = 0.5, ty = 2.3;
  const tw = 4.03, th = 1.6;
  for (let i = 0; i < techs.length; i++) {
    const [h, d] = techs[i];
    card(s, tx, ty, tw, th);
    s.addText(h, { x: tx + 0.2, y: ty + 0.15, w: tw - 0.4, h: 0.4, fontSize: 12, bold: true, color: TEAL, fontFace: "Calibri", margin: 0 });
    s.addText(d, { x: tx + 0.2, y: ty + 0.55, w: tw - 0.4, h: 1.0, fontSize: 10, color: LIGHT, fontFace: "Calibri", margin: 0 });
    tx += tw + 0.1;
    if ((i + 1) % 3 === 0) { tx = 0.5; ty += th + 0.15; }
  }
  footer(s, 11);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 12 — Oracle: 3 formatos + Select AI
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "4ª ENTREGA");
  title(s, "Oracle AI Database — relacional, JSON e CSV/External Table");
  subtitle(s, "Os três formatos exigidos pelo Challenge, implementados em objetos separados e integrados por uma view analítica.");

  const objs = [
    ["LEITO360_SIH", "Tabela relacional", "internações, permanência média, taxa de mortalidade — PK (competência, UF)"],
    ["LEITO360_CNES_JSON", "Coleção/documento JSON nativo (23ai)", "leitos SUS cadastrados + metadados da fonte, colunas virtuais para join"],
    ["LEITO360_POPULACAO_EXT", "External table sobre CSV (Object Storage)", "DBMS_CLOUD.CREATE_EXTERNAL_TABLE, população por UF"],
    ["VW_LEITO360_ANALITICO", "View analítica", "integra as três fontes + indicadores derivados, base do Select AI"],
  ];
  let oy = 2.3;
  for (const [name, kind, desc] of objs) {
    card(s, 0.5, oy, 12.3, 0.95);
    s.addText(name, { x: 0.75, y: oy + 0.1, w: 3.3, h: 0.35, fontSize: 13, bold: true, color: WHITE, fontFace: "Courier New", margin: 0 });
    s.addText(kind, { x: 0.75, y: oy + 0.45, w: 3.3, h: 0.35, fontSize: 10, color: GOLD, fontFace: "Calibri", margin: 0 });
    s.addText(desc, { x: 4.2, y: oy, w: 8.4, h: 0.95, fontSize: 11, color: LIGHT, fontFace: "Calibri", margin: 0, valign: "middle" });
    oy += 1.05;
  }
  s.addText("Fonte de sintaxe: documentação oficial Oracle Autonomous AI Database 23ai (DDL/JSON/external table). O LiveLabs 4222 foi seguido literalmente apenas para o perfil do Select AI (DBMS_CLOUD_AI.CREATE_PROFILE, provider OCI, DBMS_CLOUD_AI.GENERATE) — ele não cobre criação de tabelas customizadas. Decisão documentada em docs/arquitetura/decisao_livelabs_4222.md.", {
    x: 0.5, y: oy + 0.05, w: 12.3, h: 0.7, fontSize: 9.5, italic: true, color: MUTED, fontFace: "Calibri", margin: 0,
  });
  footer(s, 12);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 13 — Select AI perguntas
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "4ª/5ª ENTREGA");
  title(s, "Select AI — perguntas de negócio");
  subtitle(s, "Perfil LEITO360_AI restrito aos objetos do projeto. Cada pergunta roda com SHOWSQL (mostra o SQL gerado) e RUNSQL (executa e traz o resultado).");

  const perguntas = [
    "Quais UFs tiveram mais internações por 100 mil habitantes em abril de 2026?",
    "Quais regiões possuem menor oferta de leitos SUS por 10 mil habitantes?",
    "Quais UFs possuem permanência média acima da média nacional?",
    "Quais UFs apresentaram maior aumento de internações entre março e abril de 2026?",
    "Compare internações e leitos SUS cadastrados por região em abril de 2026.",
  ];
  let py = 2.35;
  for (let i = 0; i < perguntas.length; i++) {
    card(s, 0.5, py, 12.3, 0.62);
    s.addText(String(i + 1), { x: 0.65, y: py, w: 0.5, h: 0.62, fontSize: 16, bold: true, color: TEAL, align: "center", valign: "middle", margin: 0 });
    s.addText(perguntas[i], { x: 1.3, y: py, w: 11.3, h: 0.62, fontSize: 12.5, color: LIGHT, fontFace: "Calibri", margin: 0, valign: "middle" });
    py += 0.7;
  }
  s.addText("Executadas de verdade no Database Actions com o perfil LEITO360_AI (provider Cohere). O SQL gerado, o resultado e as limitações observadas estão em docs/evidencias/select_ai_perguntas.md — nada aqui foi escrito à mão e apresentado como saída da IA.", {
    x: 0.5, y: py + 0.05, w: 12.3, h: 0.4, fontSize: 10, italic: true, color: MUTED, fontFace: "Calibri", margin: 0,
  });
  footer(s, 13);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 14 — Evidências Oracle (execução real, LiveLabs sandbox)
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "5ª ENTREGA");
  title(s, "Evidências — execução real no Oracle");
  subtitle(s, "Rodado em dois sandboxes independentes do LiveLabs (#229599 e MovieStreamWorkshop229748), 31/08–01/09/2026. O schema foi recriado do zero no segundo e devolveu exatamente os mesmos números.");

  const rows2 = [
    [{ text: "Verificação", options: { bold: true, fill: { color: INK }, color: WHITE } },
     { text: "Resultado real (Oracle)", options: { bold: true, fill: { color: INK }, color: WHITE } }],
    ["SELECT COUNT(*) FROM VW_LEITO360_ANALITICO", "162 (27 UFs × 6 competências)"],
    ["Documentos JSON válidos (doc IS JSON)", "162 / 162"],
    ["Soma internações por competência (Oracle x controle)", "1.193.539 / 1.162.871 / 1.178.308 / 1.143.546 / 1.256.010 / 1.218.903 — 0 de diferença em todas"],
    ["Soma leitos SUS por competência (Oracle x controle)", "315.733 / 316.529 / 316.339 / 316.227 / 316.454 / 316.235 — 0 de diferença em todas"],
    ["Ranking abr/2026 no Oracle x ETL local (internações/100 mil hab)", "PR 703,74 · SC 702,27 · RO 701,17 · AP 686,83 · RS 664,58 — idêntico ao data/processed/"],
    ["Documento JSON de exemplo (SP, abr/2026)", '{"competencia":"2026-04","codigo_uf":"35","sigla_uf":"SP","estado":"São Paulo","regiao":"Sudeste","leitos_sus_cadastrados":54722}'],
  ].map((r, ri) => r.map((t, i) => typeof t === "string" ? { text: t, options: { color: LIGHT, fontSize: ri === 6 ? 9 : 10.5, valign: "middle", fontFace: ri === 6 ? "Courier New" : "Calibri" } } : t));

  s.addTable(rows2, {
    x: 0.5, y: 2.3, w: 12.3, h: 4.3, fontFace: "Calibri", fontSize: 10.5, border: { type: "solid", color: "1E3A5F", pt: 0.5 },
    fill: { color: NAVY2 }, colW: [5.5, 6.8],
  });
  s.addText("Executado no SQL Worksheet do Database Actions. Ambientes temporários do LiveLabs (expiram após a reserva) — usados para gerar estas evidências, não são a infraestrutura definitiva. Os scripts de oracle/sql/consolidado_recriacao/ recriam o schema inteiro em qualquer instância nova.", {
    x: 0.5, y: 6.75, w: 12.3, h: 0.35, fontSize: 9, italic: true, color: MUTED, fontFace: "Calibri", margin: 0,
  });
  footer(s, 14);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 15 — Select AI: diagnóstico honesto do bloqueio
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "5ª ENTREGA");
  title(s, "Select AI — NL2SQL real, e conferido contra a fonte");
  subtitle(s, "Pergunta em português → SQL gerado pelo modelo → resultado. Transcrito da tela, sem edição. Provider Cohere (as opções OCI GenAI falharam em 2 sandboxes, 3 regiões e 2 credenciais — percurso em docs/evidencias/).");

  card(s, 0.5, 2.2, 12.3, 1.85);
  s.addText("Pergunta 1 — SHOWSQL (2,87 s): o SQL que o modelo gerou sozinho", { x: 0.75, y: 2.28, w: 11.8, h: 0.28, fontSize: 11.5, bold: true, color: TEAL, fontFace: "Calibri", margin: 0 });
  s.addText("\"Quais Unidades da Federação tiveram mais internações por 100 mil habitantes em abril de 2026?\"", {
    x: 0.75, y: 2.56, w: 11.8, h: 0.25, fontSize: 10, italic: true, color: MUTED, fontFace: "Calibri", margin: 0,
  });
  s.addText('SELECT vw."ESTADO", vw."SIGLA_UF" FROM "ADMIN"."VW_LEITO360_ANALITICO" vw\nWHERE vw."COMPETENCIA" = \'2026-04\' ORDER BY vw."INTERNACOES_POR_100K_HAB" DESC', {
    x: 0.75, y: 2.86, w: 11.8, h: 0.5, fontSize: 9.5, color: "7DD3C0", fontFace: "Courier New", margin: 0,
  });
  s.addText("Escolheu a view analítica, a competência e o indicador corretos sem dica no prompt — o atributo \"comments\": \"true\" envia os COMMENT ON TABLE/COLUMN dos scripts 01, 02 e 05 como contexto semântico.", {
    x: 0.75, y: 3.43, w: 11.8, h: 0.5, fontSize: 10, color: LIGHT, fontFace: "Calibri", margin: 0,
  });

  s.addText("Conferimos as 5 respostas contra o pipeline validado (data/processed/) — o resultado honesto:", {
    x: 0.5, y: 4.2, w: 12.3, h: 0.3, fontSize: 11.5, bold: true, color: WHITE, fontFace: "Calibri", margin: 0,
  });

  const placar = [
    [{ text: "Pergunta de negócio", options: { bold: true, fill: { color: INK }, color: WHITE } },
     { text: "Resposta do Select AI", options: { bold: true, fill: { color: INK }, color: WHITE } },
     { text: "Conferência", options: { bold: true, fill: { color: INK }, color: WHITE } }],
    ["1 · Pressão assistencial por UF", "Valores conferem (RO 701,17), mas fora da ordem pedida", "Parcial"],
    ["2 · Menor oferta de leitos por região", "Respondeu \"Nordeste\", que é a de MAIOR oferta (17,15); a menor é Sudeste (12,53). E o SQL do SHOWSQL retornaria outro resultado ainda — o RUNSQL executou SQL diferente", "Incorreta"],
    ["3 · Permanência acima da média nacional", "RR, TO, MA, PI, CE, PB — todas no conjunto correto (média ponderada 4,882 dias)", "Correta"],
    ["4 · Maior aumento de internações mar→abr", "RS +1.187 — exato (só 5 UFs cresceram num mês de queda nacional)", "Correta"],
    ["5 · Internações x leitos por região", "Norte 108.136/28.346 · Nordeste 311.866/98.381 — batem número a número", "Correta"],
  ];
  const corConf = { "Correta": TEAL, "Parcial": GOLD, "Incorreta": RED };
  const linhas = [
    placar[0],
    ...placar.slice(1).map((l) => l.map((t, i) => ({
      text: t,
      options: { color: i === 2 ? corConf[t] : LIGHT, bold: i === 2, fontSize: 9.5, valign: "middle" },
    }))),
  ];
  s.addTable(linhas, {
    x: 0.5, y: 4.55, w: 12.3, h: 1.85, fontFace: "Calibri", fontSize: 9.5,
    border: { type: "solid", color: "1E3A5F", pt: 0.5 }, fill: { color: NAVY2 },
    colW: [3.4, 7.4, 1.5], autoPage: false,
  });

  card(s, 0.5, 6.5, 12.3, 0.62, { fill: "2A2410" });
  s.addText([
    { text: "Conclusão: ", options: { color: GOLD, bold: true } },
    { text: "3 de 5 plenamente corretas, 1 com ordenação errada e 1 incorreta. O Select AI é uma ótima ferramenta de exploração, mas não substitui a consulta auditada — por isso o dashboard usa o JSON determinístico do ETL e marca seu SQL como \"não gerado por IA\".", options: { color: LIGHT } },
  ], {
    x: 0.75, y: 6.5, w: 11.8, h: 0.62, fontSize: 10, fontFace: "Calibri", margin: 0, valign: "middle",
  });
  footer(s, 15);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 16 — Repositório técnico
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "6ª ENTREGA");
  title(s, "Repositório técnico e código-fonte");
  subtitle(s, "github.com/gabriellive1817-stack/Leito_360 — repositório público, estrutura organizada por responsabilidade.");

  const tree = [
    "LEITO360/",
    "├── src/                  front-end React + TypeScript + Vite",
    "├── public/data/          JSON sanitizado consumido pelo dashboard",
    "├── etl/                  pipeline Python (fetch, parse, validação, indicadores)",
    "├── data/raw/             respostas originais das fontes (preservadas)",
    "├── data/processed/       CSV/JSON tratados + relatório de validação",
    "├── oracle/data/          3 formatos separados (CSV, JSON, CSV externo)",
    "├── oracle/sql/           DDL, carga, view analítica, Select AI",
    "├── docs/evidencias/      evidências (o quê, prova, fonte, limitação)",
    "├── docs/arquitetura/     diagramas e decisões",
    "├── docs/gerenciamento/   gestão do projeto",
    "├── docs/roteiro_pitch/   roteiro de gravação + texto falado do pitch",
    "├── apresentacao/         gerador deste PPTX (pptxgenjs, reprodutível)",
    "└── README.md             arquitetura, indicadores, como executar tudo",
  ];
  card(s, 0.5, 2.3, 7.6, 4.6);
  let ty2 = 2.5;
  for (const line of tree) {
    s.addText(line, { x: 0.75, y: ty2, w: 7.1, h: 0.3, fontSize: 10.5, color: LIGHT, fontFace: "Courier New", margin: 0 });
    ty2 += 0.3;
  }
  card(s, 8.25, 2.3, 4.55, 4.6);
  s.addText("Sem credenciais no repositório", { x: 8.5, y: 2.5, w: 4.05, h: 0.35, fontSize: 13, bold: true, color: TEAL, fontFace: "Calibri", margin: 0 });
  s.addText(".gitignore bloqueia node_modules, .env, wallets, tokens e arquivos de credencial. Scripts Oracle usam apenas placeholders (<CREDENTIAL_NAME>, <URI_...>, <SCHEMA_...>).", {
    x: 8.5, y: 2.9, w: 4.05, h: 1.1, fontSize: 10.5, color: LIGHT, fontFace: "Calibri", margin: 0,
  });
  s.addText("Link do repositório", { x: 8.5, y: 4.2, w: 4.05, h: 0.35, fontSize: 13, bold: true, color: TEAL, fontFace: "Calibri", margin: 0 });
  s.addText("github.com/gabriellive1817-stack/Leito_360", { x: 8.5, y: 4.6, w: 4.05, h: 0.4, fontSize: 11, color: LIGHT, fontFace: "Courier New", margin: 0 });
  s.addText("Link da aplicação publicada", { x: 8.5, y: 5.15, w: 4.05, h: 0.35, fontSize: 13, bold: true, color: TEAL, fontFace: "Calibri", margin: 0 });
  s.addText("gabriellive1817-stack.github.io/Leito_360", { x: 8.5, y: 5.55, w: 4.05, h: 0.4, fontSize: 11, color: LIGHT, fontFace: "Courier New", margin: 0 });
  footer(s, 16);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 17 — Vídeo pitch
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "7ª ENTREGA");
  title(s, "Vídeo pitch e demonstração hands-on");
  subtitle(s, "Gravado, com demonstração ao vivo do dashboard publicado e do Oracle Database Actions. Plano em docs/roteiro_pitch/roteiro.md e o texto falado, dividido por integrante, em texto_pitch.md.");

  const roteiro = [
    ["0:00–0:30", "Desafio", "Dados do SUS fragmentados entre SIH/SUS, CNES e IBGE"],
    ["0:30–1:00", "Objetivo", "Consolidar as três fontes numa plataforma reprodutível e transparente"],
    ["1:00–2:00", "Solução e arquitetura Oracle", "Diagrama de ponta a ponta, três formatos, view analítica"],
    ["2:00–4:00", "Demonstração hands-on", "Dashboard, filtros, UF selecionada, Oracle, view, Select AI real, SQL, resultado"],
    ["4:00–4:30", "Benefícios", "Dados oficiais, pipeline auditável, transparência sobre limitações"],
    ["4:30–5:00", "Conclusão", "Recapitulação do que foi implementado + próximos passos"],
  ];
  let ry = 2.3;
  for (const [t, h, d] of roteiro) {
    card(s, 0.5, ry, 12.3, 0.68);
    s.addText(t, { x: 0.7, y: ry, w: 1.6, h: 0.68, fontSize: 11, bold: true, color: GOLD, valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(h, { x: 2.4, y: ry, w: 3.0, h: 0.68, fontSize: 12, bold: true, color: WHITE, valign: "middle", fontFace: "Calibri", margin: 0 });
    s.addText(d, { x: 5.5, y: ry, w: 7.1, h: 0.68, fontSize: 10.5, color: LIGHT, valign: "middle", fontFace: "Calibri", margin: 0 });
    ry += 0.75;
  }
  s.addText([
    { text: "Link do vídeo (YouTube): ", options: { color: LIGHT, bold: true } },
    { text: "https://www.youtube.com/watch?v=IAoJ_zeWXmQ", options: { color: GOLD, bold: true } },
  ], {
    x: 0.5, y: ry + 0.05, w: 12.3, h: 0.4, fontSize: 13, fontFace: "Calibri", margin: 0,
  });
  footer(s, 17);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 18 — Resultados, limitações, próximos passos
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  sectionTag(s, "8ª ENTREGA");
  title(s, "Resultados, limitações e próximos passos");

  card(s, 0.5, 2.15, 3.95, 4.6);
  s.addText("Resultados", { x: 0.75, y: 2.35, w: 3.45, h: 0.35, fontSize: 14, bold: true, color: TEAL, fontFace: "Calibri", margin: 0 });
  s.addText([
    "162 registros reais, reconciliados exatamente com o TabNet",
    "3 formatos Oracle implementados (scripts prontos)",
    "Select AI respondendo: NL2SQL real sobre a view analítica",
    "Dashboard sem nenhum mock, publicado e testado no navegador",
    "Pipeline reprodutível com validação automática",
  ].map(t => ({ text: "• " + t, options: { breakLine: true, color: LIGHT, fontSize: 11, paraSpaceAfter: 8 } })),
    { x: 0.75, y: 2.75, w: 3.45, h: 3.9, fontFace: "Calibri", margin: 0 });

  card(s, 4.6, 2.15, 3.95, 4.6);
  s.addText("Limitações", { x: 4.85, y: 2.35, w: 3.45, h: 0.35, fontSize: 14, bold: true, color: GOLD, fontFace: "Calibri", margin: 0 });
  s.addText([
    "Leitos SUS cadastrados ≠ vagas livres em tempo real",
    "Dados de competências fechadas, não monitoramento ao vivo",
    "Sem alertas automáticos",
    "Mapa usa a malha do IBGE em qualidade mínima (simplificada)",
    "SQL gerado pelo LLM é não determinístico — sempre conferido",
  ].map(t => ({ text: "• " + t, options: { breakLine: true, color: LIGHT, fontSize: 11, paraSpaceAfter: 8 } })),
    { x: 4.85, y: 2.75, w: 3.45, h: 3.9, fontFace: "Calibri", margin: 0 });

  card(s, 8.7, 2.15, 4.1, 4.6);
  s.addText("Próximos passos", { x: 8.95, y: 2.35, w: 3.6, h: 0.35, fontSize: 14, bold: true, color: TEAL, fontFace: "Calibri", margin: 0 });
  s.addText([
    "Automatizar a carga Oracle via job agendado",
    "Avaliar endpoint ORDS seguro para consulta guiada",
    "Ampliar indicadores (CID, tipo de procedimento)",
    "Transcrever as saídas das perguntas 2 a 5 do Select AI",
  ].map(t => ({ text: "• " + t, options: { breakLine: true, color: LIGHT, fontSize: 11, paraSpaceAfter: 8 } })),
    { x: 8.95, y: 2.75, w: 3.6, h: 3.9, fontFace: "Calibri", margin: 0 });

  footer(s, 18);
}

// ══════════════════════════════════════════════════════════════════════════
// SLIDE 19 — Conclusão e agradecimentos + referências
// ══════════════════════════════════════════════════════════════════════════
{
  const s = baseSlide();
  s.addText([
    { text: "LEITO", options: { color: WHITE } },
    { text: "360", options: { color: TEAL } },
  ], { x: 0.9, y: 2.3, w: 10, h: 1.0, fontSize: 44, bold: true, fontFace: "Cambria", margin: 0 });
  s.addText("Obrigado — Grupo 61", { x: 0.9, y: 3.3, w: 10, h: 0.5, fontSize: 18, color: LIGHT, fontFace: "Calibri", margin: 0 });
  s.addText("Gabriel Silva de Jesus · João Gabriel Bernardes · Natália Naomi Nakamura · Pedro Henrique Wei Chern · Vitória Cristina da Silva Coutinho", {
    x: 0.9, y: 3.85, w: 10.5, h: 0.4, fontSize: 11, color: MUTED, fontFace: "Calibri", margin: 0,
  });

  card(s, 0.9, 4.5, 10.8, 2.1);
  s.addText("Referências", { x: 1.15, y: 4.65, w: 10, h: 0.35, fontSize: 13, bold: true, color: TEAL, fontFace: "Calibri", margin: 0 });
  const refs = [
    "SIH/SUS — tabnet.datasus.gov.br/cgi/deftohtm.exe?sih/cnv/niuf.def",
    "CNES — tabnet.datasus.gov.br/cgi/deftohtm.exe?cnes/cnv/leiintbr.def",
    "IBGE/SIDRA — apisidra.ibge.gov.br (tabela 6579)",
    "Oracle LiveLabs 4222 — livelabs.oracle.com (Chat with Your Data Using Select AI)",
    "Oracle Autonomous AI Database 23ai — documentação oficial Oracle",
  ];
  let rfy = 5.05;
  for (const r of refs) {
    s.addText(r, { x: 1.15, y: rfy, w: 10.3, h: 0.28, fontSize: 10, color: LIGHT, fontFace: "Calibri", margin: 0 });
    rfy += 0.29;
  }
  footer(s, 19);
}

pres.writeFile({ fileName: OUT }).then(() => console.log("PPTX gerado em", OUT));
