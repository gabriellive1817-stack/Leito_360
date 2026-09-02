import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Bed,
  ChevronDown,
  Clock,
  Database,
  Download,
  ExternalLink,
  Info,
  MapPin,
  RotateCcw,
  Users,
} from "lucide-react";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const P = {
  bg: "#0A1E42",
  topbar: "#08182F",
  card: "#164680",
  cardTo: "#0F3163",
  panel: "#0E2C58",
  inset: "#07152A",
  teal: "#2DD4BF",
  tealDeep: "#0F9E8E",
  gold: "#FBBF24",
  red: "#F87171",
  green: "#34D399",
  blue: "#60A5FA",
  purple: "#A78BFA",
  light: "#EAF3FF",
  muted: "#9CB6DA",
  border: "rgba(255,255,255,0.10)",
};

const CARD: React.CSSProperties = {
  backgroundImage: `linear-gradient(155deg, ${P.card} 0%, ${P.cardTo} 100%)`,
  borderColor: P.border,
};

type Screen = "executivo" | "analitico";
type Regiao = "Norte" | "Nordeste" | "Sudeste" | "Sul" | "Centro-Oeste";

interface Registro {
  competencia: string;
  codigo_uf: string;
  sigla_uf: string;
  estado: string;
  regiao: Regiao;
  internacoes: number;
  permanencia_media: number;
  obitos: number;
  taxa_mortalidade: number;
  leitos_sus: number;
  populacao: number;
  internacoes_por_100k_hab: number;
  leitos_sus_por_10k_hab: number;
  internacoes_por_leito: number;
  variacao_mensal_internacoes_pct: number | null;
  tercil_pressao_assistencial: "baixo" | "medio" | "alto";
}

interface Payload {
  gerado_em_competencia_padrao: string;
  competencias_disponiveis: string[];
  fonte: { sih: string; cnes: string; ibge: string };
  limitacoes: string[];
  registros: Registro[];
}

// ─── Malha territorial das UFs (IBGE) ────────────────────────────────────────
// Gerada por etl/build_malha_uf.py a partir da API de Malhas Territoriais do
// IBGE e publicada em public/data/uf_malha.json.
interface MalhaUf {
  codigo_uf: string;
  sigla_uf: string;
  estado: string;
  path: string;
  label_x: number;
  label_y: number;
  area: number;
}

interface Malha {
  fonte: string;
  view_box: { largura: number; altura: number };
  ufs: MalhaUf[];
}

// UFs pequenas demais para caber a sigla dentro do polígono ficam sem rótulo
// fixo — o nome aparece no tooltip ao passar o mouse.
const AREA_MINIMA_ROTULO = 1500;

const REGIOES: Regiao[] = ["Norte", "Nordeste", "Sudeste", "Sul", "Centro-Oeste"];

const FONTES = [
  {
    titulo: "SIH/SUS — Morbidade Hospitalar",
    descricao: "Internações, permanência média e taxa de mortalidade",
    url: "http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sih/cnv/niuf.def",
  },
  {
    titulo: "CNES — Leitos de internação",
    descricao: "Leitos de internação cadastrados e destinados ao SUS",
    url: "http://tabnet.datasus.gov.br/cgi/deftohtm.exe?cnes/cnv/leiintbr.def",
  },
  {
    titulo: "IBGE — População e malha das UFs",
    descricao: "População estimada em 2026 (SIDRA 6579) e malha territorial oficial",
    url: "https://apisidra.ibge.gov.br/values/t/6579/n3/all/v/9324/p/last",
  },
];

const LIMITACOES = [
  "Dados agregados e retrospectivos; não representam ocupação ou vagas em tempo real.",
  "Internações do SIH/SUS correspondem a AIHs aprovadas e podem sofrer atualização retroativa.",
  "Leitos do CNES são cadastrados, não necessariamente disponíveis no momento da consulta.",
  "O indicador de pressão usa internações por 100 mil habitantes e não equivale à taxa de ocupação.",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCompetencia(c: string): string {
  const [ano, mes] = c.split("-");
  const nomes = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${nomes[parseInt(mes, 10)]}/${ano}`;
}

function mesCurto(c: string): string {
  return formatCompetencia(c).split("/")[0];
}

function diasNoMes(c: string): number {
  const [ano, mes] = c.split("-").map(Number);
  return new Date(ano, mes, 0).getDate();
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

function fmtDec(n: number, casas = 1): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function tercilColor(t: string | undefined) {
  if (t === "alto") return P.red;
  if (t === "medio") return P.gold;
  if (t === "baixo") return P.green;
  return "rgba(255,255,255,0.10)";
}

function tercilFill(t: string | undefined, destaque: boolean) {
  const base = { alto: "248,113,113", medio: "251,191,36", baixo: "52,211,153" } as Record<string, string>;
  const rgb = base[t ?? ""] ?? "148,163,184";
  return `rgba(${rgb},${destaque ? 0.95 : 0.72})`;
}

// Mesmos cortes de tercil usados pelo ETL (etl/parse_validate_build.py):
// t1 = 9º menor valor, t2 = 18º, sobre as 27 UFs da competência.
function limitesTercis(registrosCompetencia: Registro[]) {
  const vals = registrosCompetencia.map((r) => r.internacoes_por_100k_hab).sort((a, b) => a - b);
  const n = vals.length;
  if (!n) return { baixo: 0, alto: 0 };
  return {
    baixo: vals[Math.max(Math.floor(n / 3) - 1, 0)],
    alto: vals[Math.max(Math.floor((2 * n) / 3) - 1, 0)],
  };
}

interface Metricas {
  internacoes: number;
  obitos: number;
  leitos: number;
  populacao: number;
  permanencia: number;
  mortalidade: number;
  pressao: number;
  leitosPor10k: number;
  mediaDia: number;
}

function agregar(regs: Registro[], competencia: string): Metricas {
  const internacoes = regs.reduce((s, r) => s + r.internacoes, 0);
  const obitos = regs.reduce((s, r) => s + r.obitos, 0);
  const leitos = regs.reduce((s, r) => s + r.leitos_sus, 0);
  const populacao = regs.reduce((s, r) => s + r.populacao, 0);
  const permanencia = internacoes
    ? regs.reduce((s, r) => s + r.permanencia_media * r.internacoes, 0) / internacoes
    : 0;
  return {
    internacoes,
    obitos,
    leitos,
    populacao,
    permanencia,
    mortalidade: internacoes ? (obitos / internacoes) * 100 : 0,
    pressao: populacao ? (internacoes / populacao) * 100000 : 0,
    leitosPor10k: populacao ? (leitos / populacao) * 10000 : 0,
    mediaDia: internacoes / diasNoMes(competencia),
  };
}

function downloadCsv(filename: string, rows: Registro[]) {
  const header = [
    "competencia", "sigla_uf", "estado", "regiao", "internacoes", "permanencia_media",
    "taxa_mortalidade", "leitos_sus", "populacao", "internacoes_por_100k_hab",
    "leitos_sus_por_10k_hab", "internacoes_por_leito", "variacao_mensal_internacoes_pct",
  ];
  const lines = [header.join(";")];
  for (const r of rows) {
    lines.push(header.map((h) => String((r as unknown as Record<string, unknown>)[h] ?? "")).join(";"));
  }
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Peças de UI ──────────────────────────────────────────────────────────────
function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-2xl border ${className}`} style={{ ...CARD, ...style }}>
      {children}
    </div>
  );
}

function Logo() {
  return (
    <span className="text-xl font-extrabold tracking-tight leading-none select-none">
      <span className="text-white">LEITO</span>
      <span style={{ color: P.teal }}>360</span>
    </span>
  );
}

function DarkSelect({
  rotulo, icon: Icon, value, onChange, options,
}: {
  rotulo: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border px-3 py-2 relative"
      style={{ borderColor: P.border, backgroundColor: "rgba(255,255,255,0.05)" }}
    >
      <Icon size={13} color={P.muted} />
      <span className="text-xs font-semibold" style={{ color: P.muted }}>{rotulo}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none appearance-none cursor-pointer text-sm font-semibold pr-5"
        style={{ color: P.light }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ backgroundColor: P.cardTo, color: P.light }}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} style={{ color: P.muted, position: "absolute", right: 10, pointerEvents: "none" }} />
    </div>
  );
}

function TopBar({
  screen, onScreen, competencias, competencia, onCompetencia, regiao, onRegiao,
}: {
  screen: Screen;
  onScreen: (s: Screen) => void;
  competencias: string[];
  competencia: string;
  onCompetencia: (c: string) => void;
  regiao: string;
  onRegiao: (r: string) => void;
}) {
  return (
    <header
      className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-7 py-3 border-b"
      style={{ backgroundColor: P.topbar, borderColor: P.border }}
    >
      <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
        <Logo />
        <nav className="flex items-center gap-2">
          {(["executivo", "analitico"] as Screen[]).map((id) => {
            const label = id === "executivo" ? "Visão Executiva" : "Explorador Analítico";
            const active = screen === id;
            return (
              <button
                key={id}
                onClick={() => onScreen(id)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: active ? P.teal : "transparent",
                  color: active ? "#04262B" : P.muted,
                }}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <DarkSelect
          rotulo="Período"
          icon={Info}
          value={competencia}
          onChange={onCompetencia}
          options={competencias.map((c) => ({ value: c, label: formatCompetencia(c) }))}
        />
        <DarkSelect
          rotulo="Região"
          icon={MapPin}
          value={regiao}
          onChange={onRegiao}
          options={[{ value: "Brasil", label: "Brasil" }, ...REGIOES.map((r) => ({ value: r, label: r }))]}
        />
        <div
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl"
          style={{ backgroundColor: "rgba(45,212,191,0.12)", color: P.teal }}
          title="Competências fechadas do SIH/SUS e do CNES, sujeitas a atualização retroativa pelo DATASUS"
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: P.teal }} />
          Base pública · lote mensal
        </div>
      </div>
    </header>
  );
}

function PageHeader({
  titulo, subtitulo, recorteAtivo, onLimpar, onExportar,
}: {
  titulo: string;
  subtitulo: string;
  recorteAtivo: boolean;
  onLimpar: () => void;
  onExportar: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] mb-2" style={{ color: P.teal }}>
          MVP ANALÍTICO · GRUPO 61
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{titulo}</h1>
        <p className="text-sm mt-1.5" style={{ color: P.muted }}>{subtitulo}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onLimpar}
          disabled={!recorteAtivo}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-40"
          style={{ borderColor: P.border, color: P.light, backgroundColor: "rgba(255,255,255,0.05)" }}
        >
          <RotateCcw size={14} />
          Limpar recorte
        </button>
        <button
          onClick={onExportar}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ backgroundColor: P.teal, color: "#04262B" }}
        >
          <Download size={14} />
          Baixar dados em CSV
        </button>
      </div>
    </div>
  );
}

function KPICard({
  label, badge, badgeColor, valor, sub, destaque, icon: Icon,
}: {
  label: string;
  badge: string;
  badgeColor: string;
  valor: string;
  sub: string;
  destaque: string;
  icon: React.ElementType;
}) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: P.muted }}>{label}</span>
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 flex-shrink-0"
          style={{ backgroundColor: badgeColor + "26", color: badgeColor }}
        >
          <Icon size={10} />
          {badge}
        </span>
      </div>
      <div>
        <p className="text-3xl font-extrabold text-white leading-none">{valor}</p>
        <p className="text-xs mt-2" style={{ color: P.muted }}>{sub}</p>
      </div>
      <p className="text-xs font-semibold" style={{ color: P.teal }}>{destaque}</p>
    </Card>
  );
}

// ─── Mapa do Brasil (malha oficial do IBGE) ──────────────────────────────────
function BrazilMap({
  malha, dados, ufSelecionada, onSelectUf,
}: { malha: Malha; dados: Map<string, Registro>; ufSelecionada: string | null; onSelectUf: (uf: string | null) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const { largura, altura } = malha.view_box;
  const registroHover = hovered ? dados.get(hovered) : null;
  const ufHover = hovered ? malha.ufs.find((u) => u.sigla_uf === hovered) ?? null : null;
  const tooltipX = ufHover ? Math.min(Math.max(ufHover.label_x - 62, 4), largura - 128) : 0;
  const tooltipY = ufHover ? Math.max(ufHover.label_y - 48, 4) : 0;

  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full h-full" role="img"
      aria-label="Mapa do Brasil por unidade da federação, colorido pelo tercil de pressão assistencial">
      {malha.ufs.map((uf) => {
        const reg = dados.get(uf.sigla_uf);
        const destaque = hovered === uf.sigla_uf || ufSelecionada === uf.sigla_uf;
        const isSel = ufSelecionada === uf.sigla_uf;
        return (
          <path
            key={uf.codigo_uf}
            d={uf.path}
            fill={tercilFill(reg?.tercil_pressao_assistencial, destaque)}
            stroke={isSel ? P.teal : "rgba(7,21,42,0.85)"}
            strokeWidth={isSel ? 2.2 : 0.6}
            strokeLinejoin="round"
            style={{ cursor: "pointer", transition: "fill 0.12s ease" }}
            onMouseEnter={() => setHovered(uf.sigla_uf)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onSelectUf(ufSelecionada === uf.sigla_uf ? null : uf.sigla_uf)}
          />
        );
      })}

      {malha.ufs
        .filter((uf) => uf.area >= AREA_MINIMA_ROTULO)
        .map((uf) => (
          <text key={`rotulo-${uf.codigo_uf}`} x={uf.label_x} y={uf.label_y}
            textAnchor="middle" dominantBaseline="middle" fontSize="10"
            fill="rgba(255,255,255,0.9)" fontFamily="Inter, sans-serif" fontWeight="600"
            style={{ pointerEvents: "none", userSelect: "none" }}>
            {uf.sigla_uf}
          </text>
        ))}

      {ufHover && registroHover && (
        <g style={{ pointerEvents: "none" }}>
          <rect x={tooltipX} y={tooltipY} width={124} height={40} rx="5"
            fill="#0F3163" stroke="rgba(45,212,191,0.45)" strokeWidth="0.8" />
          <text x={tooltipX + 62} y={tooltipY + 14} textAnchor="middle" fontSize="8"
            fill={P.muted} fontFamily="Inter, sans-serif">
            {ufHover.estado}
          </text>
          <text x={tooltipX + 62} y={tooltipY + 29} textAnchor="middle" fontSize="10" fontWeight="700"
            fill={tercilColor(registroHover.tercil_pressao_assistencial)} fontFamily="Inter, sans-serif">
            {fmtDec(registroHover.internacoes_por_100k_hab)} /100 mil
          </text>
        </g>
      )}
    </svg>
  );
}

function MapaCard({
  malha, mapaRegistros, ufSelecionada, onSelectUf, limites,
}: {
  malha: Malha;
  mapaRegistros: Map<string, Registro>;
  ufSelecionada: string | null;
  onSelectUf: (uf: string | null) => void;
  limites: { baixo: number; alto: number };
}) {
  const legenda = [
    { label: `Baixa ≤ ${fmtDec(limites.baixo)}`, cor: P.green },
    { label: "Intermediária", cor: P.gold },
    { label: `Alta > ${fmtDec(limites.alto)}`, cor: P.red },
  ];

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Pressão assistencial por Unidade da Federação</h2>
          <p className="text-xs mt-1" style={{ color: P.muted }}>
            Internações por 100 mil habitantes · não equivale à ocupação hospitalar
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
          {legenda.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.cor }} />
              <span className="text-xs whitespace-nowrap" style={{ color: P.muted }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-xl p-3 w-full mx-auto"
        style={{ backgroundColor: P.inset, height: 430, maxWidth: 620 }}
      >
        <BrazilMap malha={malha} dados={mapaRegistros} ufSelecionada={ufSelecionada} onSelectUf={onSelectUf} />
      </div>

      <p className="text-xs text-center" style={{ color: P.muted }}>
        Clique em uma UF para detalhar. Classificação relativa aos tercis do período.
      </p>
    </Card>
  );
}

// ─── Ranking ──────────────────────────────────────────────────────────────────
function RankingCard({
  registros, escopo, competencia, ufSelecionada, onSelectUf,
}: {
  registros: Registro[];
  escopo: string;
  competencia: string;
  ufSelecionada: string | null;
  onSelectUf: (uf: string | null) => void;
}) {
  const top = [...registros]
    .sort((a, b) => b.internacoes_por_100k_hab - a.internacoes_por_100k_hab)
    .slice(0, 5);

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div>
        <h3 className="text-base font-bold text-white">UFs com maior pressão</h3>
        <p className="text-xs mt-0.5" style={{ color: P.muted }}>{escopo} · {formatCompetencia(competencia)}</p>
      </div>
      <div className="flex flex-col">
        {top.map((r, i) => {
          const ativo = ufSelecionada === r.sigla_uf;
          return (
            <button
              key={r.codigo_uf}
              onClick={() => onSelectUf(ativo ? null : r.sigla_uf)}
              className="flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-lg text-left transition-all"
              style={{ backgroundColor: ativo ? "rgba(45,212,191,0.14)" : "transparent" }}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-bold tabular-nums w-3" style={{ color: P.muted }}>{i + 1}</span>
                <span className="text-sm font-medium text-white truncate">{r.estado}</span>
              </span>
              <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: P.gold }}>
                {fmtDec(r.internacoes_por_100k_hab)}
              </span>
            </button>
          );
        })}
        {top.length === 0 && <p className="text-xs" style={{ color: P.muted }}>Sem dados para o recorte atual.</p>}
      </div>
    </Card>
  );
}

// ─── Evolução das internações ─────────────────────────────────────────────────
function TrendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="text-xs px-3 py-2 rounded-lg border" style={{ backgroundColor: P.inset, borderColor: P.border, color: P.light }}>
      <p className="font-bold mb-0.5" style={{ color: P.teal }}>{label}</p>
      <p>{fmtInt(payload[0].value)} internações</p>
    </div>
  );
}

function TrendCard({ serie, escopo }: { serie: { competencia: string; mes: string; internacoes: number }[]; escopo: string }) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div>
        <h3 className="text-base font-bold text-white">Evolução das internações</h3>
        <p className="text-xs mt-0.5" style={{ color: P.muted }}>{escopo} · seis competências</p>
      </div>
      <div style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={serie} margin={{ top: 24, right: 30, bottom: 4, left: 26 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: P.muted }} axisLine={false} tickLine={false} />
            <YAxis hide domain={["dataMin - 60000", "dataMax + 60000"]} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: P.border }} />
            <Line
              type="linear"
              dataKey="internacoes"
              stroke={P.teal}
              strokeWidth={2.5}
              isAnimationActive={false}
              dot={{ fill: P.teal, strokeWidth: 0, r: 3.5 }}
              activeDot={{ r: 5, fill: P.teal }}
            >
              <LabelList
                dataKey="internacoes"
                position="top"
                offset={10}
                formatter={(v: number) => fmtInt(v)}
                style={{ fill: P.light, fontSize: 9, fontWeight: 600 }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function NotaCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border p-4 flex gap-3" style={{ backgroundColor: P.panel, borderColor: P.border }}>
      <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: P.teal }} />
      <p className="text-xs leading-relaxed" style={{ color: P.light }}>{children}</p>
    </div>
  );
}

// ─── Tela 1: Visão Executiva ──────────────────────────────────────────────────
function VisaoExecutiva({
  registrosEscopo, registrosRegiao, registrosCompetencia, mapaRegistros, malha, serie,
  competencia, escopo, escopoRegiao, ufSelecionada, onSelectUf, recorteAtivo, onLimpar, onExportar,
}: {
  registrosEscopo: Registro[];
  registrosRegiao: Registro[];
  registrosCompetencia: Registro[];
  mapaRegistros: Map<string, Registro>;
  malha: Malha;
  serie: { competencia: string; mes: string; internacoes: number }[];
  competencia: string;
  escopo: string;
  escopoRegiao: string;
  ufSelecionada: string | null;
  onSelectUf: (uf: string | null) => void;
  recorteAtivo: boolean;
  onLimpar: () => void;
  onExportar: () => void;
}) {
  const m = useMemo(() => agregar(registrosEscopo, competencia), [registrosEscopo, competencia]);
  const limites = useMemo(() => limitesTercis(registrosCompetencia), [registrosCompetencia]);

  // Variação agregada do recorte: total do mês atual contra o total do mês anterior.
  const variacao = useMemo(() => {
    const i = serie.findIndex((p) => p.competencia === competencia);
    if (i <= 0) return null;
    const anterior = serie[i - 1].internacoes;
    if (!anterior) return null;
    return (serie[i].internacoes / anterior - 1) * 100;
  }, [serie, competencia]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        titulo="Gestão hospitalar baseada em dados públicos"
        subtitulo={`${escopo} · competência ${formatCompetencia(competencia)} · SIH/SUS, CNES e IBGE`}
        recorteAtivo={recorteAtivo}
        onLimpar={onLimpar}
        onExportar={onExportar}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label="Internações no período"
          badge="AIH" badgeColor={P.blue} icon={Users}
          valor={fmtInt(m.internacoes)}
          sub={`AIHs aprovadas · ${escopo}`}
          destaque={variacao !== null
            ? `${variacao >= 0 ? "Aumento" : "Redução"} de ${fmtDec(Math.abs(variacao))}% vs mês anterior`
            : "Primeira competência da série"}
        />
        <KPICard
          label="Média de internações/dia"
          badge="DIA" badgeColor={P.teal} icon={Activity}
          valor={fmtInt(m.mediaDia)}
          sub="Média calculada para o mês"
          destaque={`${fmtDec(m.pressao)} por 100 mil habitantes`}
        />
        <KPICard
          label="Permanência média"
          badge="ALOS" badgeColor={P.purple} icon={Clock}
          valor={`${fmtDec(m.permanencia)} dias`}
          sub="Média ponderada pelas internações"
          destaque={`Mortalidade hospitalar: ${fmtDec(m.mortalidade, 2)}%`}
        />
        <KPICard
          label="Leitos SUS cadastrados"
          badge="CNES" badgeColor={P.gold} icon={Bed}
          valor={fmtInt(m.leitos)}
          sub="CNES · não representa vagas livres"
          destaque={`${fmtDec(m.leitosPor10k, 2)} por 10 mil habitantes`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <MapaCard
          malha={malha}
          mapaRegistros={mapaRegistros}
          ufSelecionada={ufSelecionada}
          onSelectUf={onSelectUf}
          limites={limites}
        />

        <div className="flex flex-col gap-4">
          <RankingCard
            registros={registrosRegiao}
            escopo={escopoRegiao}
            competencia={competencia}
            ufSelecionada={ufSelecionada}
            onSelectUf={onSelectUf}
          />
          <TrendCard serie={serie} escopo={escopo} />
          <NotaCard>
            Dados agregados, retrospectivos e sujeitos a atualização. O MVP apoia análise
            comparativa; não informa ocupação nem vagas em tempo real.
          </NotaCard>
        </div>
      </div>
    </div>
  );
}

// ─── Tela 2: Explorador Analítico ─────────────────────────────────────────────
type ConsultaId = "pressao" | "leitos" | "permanencia" | "mortalidade";

interface Consulta {
  id: ConsultaId;
  titulo: string;
  descricao: string;
  campo: keyof Pick<Registro, "internacoes_por_100k_hab" | "leitos_sus_por_10k_hab" | "permanencia_media" | "taxa_mortalidade">;
  ordem: "asc" | "desc";
  coluna: string;
  formatar: (v: number) => string;
}

const CONSULTAS: Consulta[] = [
  {
    id: "pressao",
    titulo: "Maior pressão assistencial",
    descricao: "Internações por 100 mil habitantes",
    campo: "internacoes_por_100k_hab",
    ordem: "desc",
    coluna: "internacoes_por_100k_hab",
    formatar: (v) => `${fmtDec(v)} / 100 mil`,
  },
  {
    id: "leitos",
    titulo: "Menor oferta de leitos",
    descricao: "Leitos SUS cadastrados por 10 mil habitantes",
    campo: "leitos_sus_por_10k_hab",
    ordem: "asc",
    coluna: "leitos_sus_por_10k_hab",
    formatar: (v) => `${fmtDec(v, 2)} / 10 mil`,
  },
  {
    id: "permanencia",
    titulo: "Maior permanência média",
    descricao: "Média de dias por internação",
    campo: "permanencia_media",
    ordem: "desc",
    coluna: "permanencia_media",
    formatar: (v) => `${fmtDec(v)} dias`,
  },
  {
    id: "mortalidade",
    titulo: "Maior taxa de mortalidade",
    descricao: "Óbitos a cada 100 internações",
    campo: "taxa_mortalidade",
    ordem: "desc",
    coluna: "taxa_mortalidade",
    formatar: (v) => `${fmtDec(v, 2)}%`,
  },
];

function sqlEquivalente(
  consulta: Consulta,
  competencia: string,
  regiao: string,
  ufSelecionada: string | null,
): string {
  const filtros = [`competencia = '${competencia}'`];
  if (regiao !== "Brasil") filtros.push(`regiao = '${regiao}'`);
  if (ufSelecionada) filtros.push(`sigla_uf = '${ufSelecionada}'`);
  return [
    "-- Consulta equivalente à pergunta selecionada, sobre a view analítica do Oracle.",
    "-- Gerada pelo motor local do MVP; o Select AI é demonstrado no Database Actions.",
    `SELECT sigla_uf, estado, regiao, ${consulta.coluna}, internacoes, leitos_sus`,
    "FROM VW_LEITO360_ANALITICO",
    `WHERE ${filtros.join(String.fromCharCode(10) + "  AND ")}`,
    `ORDER BY ${consulta.coluna} ${consulta.ordem.toUpperCase()};`,
  ].join(String.fromCharCode(10));
}

function ConsultasCard({ ativa, onSelect }: { ativa: ConsultaId; onSelect: (id: ConsultaId) => void }) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div>
        <h3 className="text-base font-bold text-white">Consultas disponíveis</h3>
        <p className="text-xs mt-1" style={{ color: P.muted }}>
          Motor analítico local com perguntas predefinidas e resultados reproduzíveis.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {CONSULTAS.map((c) => {
          const sel = c.id === ativa;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="text-left rounded-xl border px-4 py-3 transition-all"
              style={{
                borderColor: sel ? P.teal : P.border,
                backgroundColor: sel ? "rgba(45,212,191,0.10)" : "rgba(255,255,255,0.03)",
              }}
            >
              <p className="text-sm font-bold" style={{ color: sel ? P.teal : P.light }}>{c.titulo}</p>
              <p className="text-xs mt-0.5" style={{ color: P.muted }}>{c.descricao}</p>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function QualidadeCard({ ufs, periodos, registros }: { ufs: number; periodos: number; registros: number }) {
  const conciliado = registros === ufs * periodos;
  const itens = [
    { rotulo: "UFs", valor: String(ufs), cor: P.light },
    { rotulo: "Períodos", valor: String(periodos), cor: P.light },
    { rotulo: "Registros", valor: String(registros), cor: P.light },
    { rotulo: "Reconciliação", valor: conciliado ? "OK" : "REVISAR", cor: conciliado ? P.green : P.red },
  ];
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-bold text-white">Qualidade e cobertura</h3>
        <p className="text-xs mt-1" style={{ color: P.muted }}>Validações executadas no pipeline</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {itens.map((i) => (
          <div key={i.rotulo}>
            <p className="text-xs" style={{ color: P.muted }}>{i.rotulo}</p>
            <p className="text-2xl font-extrabold leading-tight" style={{ color: i.cor }}>{i.valor}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ResultadoCard({
  consulta, linhas, escopo, competencia,
}: {
  consulta: Consulta;
  linhas: Registro[];
  escopo: string;
  competencia: string;
}) {
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.16em]" style={{ color: P.muted }}>RESULTADO DA CONSULTA</p>
          <h2 className="text-xl font-extrabold text-white mt-1">{consulta.titulo}</h2>
          <p className="text-xs mt-1" style={{ color: P.muted }}>
            {consulta.descricao} · {escopo} · {formatCompetencia(competencia)}
          </p>
        </div>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
          style={{ backgroundColor: "rgba(52,211,153,0.14)", color: P.green }}
        >
          {linhas.length} {linhas.length === 1 ? "UF retornada" : "UFs retornadas"}
        </span>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wider" style={{ color: P.muted }}>
              <th className="text-left font-bold py-2 px-3">Posição</th>
              <th className="text-left font-bold py-2 px-3">UF</th>
              <th className="text-left font-bold py-2 px-3">Região</th>
              <th className="text-right font-bold py-2 px-3">Resultado</th>
              <th className="text-right font-bold py-2 px-3">Internações</th>
              <th className="text-right font-bold py-2 px-3">Leitos SUS</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((r, i) => (
              <tr key={r.codigo_uf} style={{ backgroundColor: i % 2 ? "rgba(255,255,255,0.03)" : "transparent" }}>
                <td className="py-2.5 px-3 tabular-nums" style={{ color: P.muted }}>{i + 1}</td>
                <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                  {r.estado} ({r.sigla_uf})
                </td>
                <td className="py-2.5 px-3" style={{ color: P.muted }}>{r.regiao}</td>
                <td className="py-2.5 px-3 text-right font-bold tabular-nums" style={{ color: P.gold }}>
                  {consulta.formatar(r[consulta.campo] as number)}
                </td>
                <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: P.light }}>{fmtInt(r.internacoes)}</td>
                <td className="py-2.5 px-3 text-right tabular-nums" style={{ color: P.light }}>{fmtInt(r.leitos_sus)}</td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-xs" style={{ color: P.muted }}>
                  Sem dados para o recorte atual.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SqlCard({ sql }: { sql: string }) {
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Database size={14} style={{ color: P.teal }} />
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Consulta SQL equivalente</h3>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded"
          style={{ backgroundColor: "rgba(45,212,191,0.14)", color: P.teal }}
        >
          não gerada por IA
        </span>
      </div>
      <pre
        className="rounded-xl p-4 overflow-x-auto text-xs leading-relaxed"
        style={{ backgroundColor: P.inset, color: P.light, fontFamily: "'JetBrains Mono', monospace" }}
      >
        {sql}
      </pre>
    </Card>
  );
}

function FontesCard() {
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-bold text-white">Fontes e rastreabilidade</h3>
        <p className="text-xs mt-1" style={{ color: P.muted }}>Links oficiais utilizados pelo pipeline</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {FONTES.map((f) => (
          <a
            key={f.titulo}
            href={f.url}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-xl border p-4 transition-all hover:brightness-125"
            style={{ borderColor: P.border, backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            <p className="text-sm font-bold flex items-center gap-1.5" style={{ color: P.teal }}>
              {f.titulo}
              <ExternalLink size={12} />
            </p>
            <p className="text-xs mt-1.5" style={{ color: P.muted }}>{f.descricao}</p>
          </a>
        ))}
      </div>
    </Card>
  );
}

function LimitacoesCard() {
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-bold text-white">Limitações metodológicas</h3>
        <p className="text-xs mt-1" style={{ color: P.muted }}>Interpretação responsável dos indicadores</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        {LIMITACOES.map((l) => (
          <p key={l} className="text-xs leading-relaxed flex gap-2" style={{ color: P.light }}>
            <span style={{ color: P.teal }}>•</span>
            {l}
          </p>
        ))}
      </div>
      <div className="rounded-xl border p-4" style={{ borderColor: "rgba(45,212,191,0.35)", backgroundColor: "rgba(45,212,191,0.08)" }}>
        <p className="text-xs leading-relaxed" style={{ color: P.light }}>
          <span className="font-bold" style={{ color: P.teal }}>Estado atual: </span>
          os 162 registros já estão carregados no Oracle AI Database em três formatos distintos
          (tabela relacional, documento JSON nativo e tabela de apoio carregada a partir de CSV),
          integrados pela view VW_LEITO360_ANALITICO. O dashboard consome um JSON estático publicado
          pelo ETL — sem credenciais no front-end — e a consulta em linguagem natural roda de verdade
          no Select AI (perfil LEITO360_AI), demonstrada no Database Actions.
        </p>
      </div>
    </Card>
  );
}

function ExploradorAnalitico({
  registrosEscopo, payload, competencia, regiao, ufSelecionada, escopo, recorteAtivo, onLimpar, onExportar,
}: {
  registrosEscopo: Registro[];
  payload: Payload;
  competencia: string;
  regiao: string;
  ufSelecionada: string | null;
  escopo: string;
  recorteAtivo: boolean;
  onLimpar: () => void;
  onExportar: () => void;
}) {
  const [consultaId, setConsultaId] = useState<ConsultaId>("pressao");
  const consulta = CONSULTAS.find((c) => c.id === consultaId) ?? CONSULTAS[0];

  const linhas = useMemo(() => {
    const ordenado = [...registrosEscopo].sort((a, b) => {
      const va = a[consulta.campo] as number;
      const vb = b[consulta.campo] as number;
      return consulta.ordem === "desc" ? vb - va : va - vb;
    });
    return ordenado;
  }, [registrosEscopo, consulta]);

  const ufs = new Set(payload.registros.map((r) => r.sigla_uf)).size;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        titulo="Consultas guiadas e rastreáveis"
        subtitulo={`${escopo} · competência ${formatCompetencia(competencia)} · SIH/SUS, CNES e IBGE`}
        recorteAtivo={recorteAtivo}
        onLimpar={onLimpar}
        onExportar={onExportar}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <ConsultasCard ativa={consultaId} onSelect={setConsultaId} />
          <QualidadeCard
            ufs={ufs}
            periodos={payload.competencias_disponiveis.length}
            registros={payload.registros.length}
          />
        </div>

        <div className="flex flex-col gap-4">
          <ResultadoCard consulta={consulta} linhas={linhas} escopo={escopo} competencia={competencia} />
          <SqlCard sql={sqlEquivalente(consulta, competencia, regiao, ufSelecionada)} />
          <FontesCard />
          <LimitacoesCard />
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("executivo");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [malha, setMalha] = useState<Malha | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [competencia, setCompetencia] = useState<string>("");
  const [regiao, setRegiao] = useState<string>("Brasil");
  const [ufSelecionada, setUfSelecionada] = useState<string | null>(null);

  useEffect(() => {
    const carregar = async (arquivo: string) => {
      const r = await fetch(`${import.meta.env.BASE_URL}data/${arquivo}`);
      if (!r.ok) throw new Error(`${arquivo}: HTTP ${r.status}`);
      return r.json();
    };

    Promise.all([carregar("leito360.json"), carregar("uf_malha.json")])
      .then(([dados, malhaUf]: [Payload, Malha]) => {
        setPayload(dados);
        setMalha(malhaUf);
        setCompetencia(dados.gerado_em_competencia_padrao);
      })
      .catch((e) => setErro(String(e)));
  }, []);

  // Todas as 27 UFs da competência — base do mapa e dos cortes de tercil.
  const registrosCompetencia = useMemo(() => {
    if (!payload) return [];
    return payload.registros.filter((r) => r.competencia === competencia);
  }, [payload, competencia]);

  const registrosRegiao = useMemo(() => {
    if (regiao === "Brasil") return registrosCompetencia;
    return registrosCompetencia.filter((r) => r.regiao === regiao);
  }, [registrosCompetencia, regiao]);

  // Recorte efetivo: a UF clicada manda em tudo (KPIs, ranking, série, tabela).
  const registrosEscopo = useMemo(() => {
    if (!ufSelecionada) return registrosRegiao;
    return registrosRegiao.filter((r) => r.sigla_uf === ufSelecionada);
  }, [registrosRegiao, ufSelecionada]);

  const mapaRegistros = useMemo(() => {
    const m = new Map<string, Registro>();
    for (const r of registrosCompetencia) m.set(r.sigla_uf, r);
    return m;
  }, [registrosCompetencia]);

  const escopoRegiao = regiao === "Brasil" ? "Brasil" : `Região ${regiao}`;

  const escopo = useMemo(() => {
    if (ufSelecionada) {
      return mapaRegistros.get(ufSelecionada)?.estado ?? ufSelecionada;
    }
    return escopoRegiao;
  }, [ufSelecionada, escopoRegiao, mapaRegistros]);

  const serie = useMemo(() => {
    if (!payload) return [];
    return payload.competencias_disponiveis.map((c) => {
      const regs = payload.registros.filter(
        (r) =>
          r.competencia === c &&
          (regiao === "Brasil" || r.regiao === regiao) &&
          (!ufSelecionada || r.sigla_uf === ufSelecionada),
      );
      return { competencia: c, mes: mesCurto(c), internacoes: regs.reduce((s, r) => s + r.internacoes, 0) };
    });
  }, [payload, regiao, ufSelecionada]);

  const recorteAtivo = regiao !== "Brasil" || ufSelecionada !== null;

  const limparRecorte = () => {
    setRegiao("Brasil");
    setUfSelecionada(null);
  };

  const exportar = () => {
    const sufixo = ufSelecionada ?? (regiao === "Brasil" ? "brasil" : regiao.toLowerCase());
    downloadCsv(`leito360_${competencia}_${sufixo}.csv`.replace(/\s+/g, "_"), registrosEscopo);
  };

  if (erro) {
    return (
      <div className="h-screen flex items-center justify-center p-6 text-center" style={{ backgroundColor: P.bg, color: P.light }}>
        <div>
          <p className="font-semibold mb-2">Não foi possível carregar os dados do LEITO360.</p>
          <p className="text-sm" style={{ color: P.muted }}>{erro}</p>
          <p className="text-xs mt-3" style={{ color: P.muted }}>
            Rode <code>python etl/fetch_raw.py &amp;&amp; python etl/parse_validate_build.py</code> e{" "}
            <code>python etl/build_malha_uf.py</code> para gerar os JSONs em public/data/.
          </p>
        </div>
      </div>
    );
  }

  if (!payload || !malha) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: P.bg, color: P.muted }}>
        Carregando dados do LEITO360…
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: P.bg, fontFamily: "'Inter', sans-serif" }}>
      <TopBar
        screen={screen}
        onScreen={setScreen}
        competencias={payload.competencias_disponiveis}
        competencia={competencia}
        onCompetencia={(c) => { setCompetencia(c); setUfSelecionada(null); }}
        regiao={regiao}
        onRegiao={(r) => { setRegiao(r); setUfSelecionada(null); }}
      />

      <main className="max-w-[1500px] mx-auto px-4 sm:px-7 py-6">
        {screen === "executivo" ? (
          <VisaoExecutiva
            registrosEscopo={registrosEscopo}
            registrosRegiao={registrosRegiao}
            registrosCompetencia={registrosCompetencia}
            mapaRegistros={mapaRegistros}
            malha={malha}
            serie={serie}
            competencia={competencia}
            escopo={escopo}
            escopoRegiao={escopoRegiao}
            ufSelecionada={ufSelecionada}
            onSelectUf={setUfSelecionada}
            recorteAtivo={recorteAtivo}
            onLimpar={limparRecorte}
            onExportar={exportar}
          />
        ) : (
          <ExploradorAnalitico
            registrosEscopo={registrosEscopo}
            payload={payload}
            competencia={competencia}
            regiao={regiao}
            ufSelecionada={ufSelecionada}
            escopo={escopo}
            recorteAtivo={recorteAtivo}
            onLimpar={limparRecorte}
            onExportar={exportar}
          />
        )}
      </main>
    </div>
  );
}
