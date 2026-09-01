import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Bed,
  Users,
  Clock,
  AlertTriangle,
  Database,
  Activity,
  MapPin,
  Download,
  Info,
  X,
} from "lucide-react";

// ─── Brand palette ────────────────────────────────────────────────────────────
const P = {
  bg: "#0B1B40",
  card: "#0F2A4A",
  inset: "#0A223E",
  topbar: "#091832",
  teal: "#14B8A6",
  tealDark: "#0D9488",
  gold: "#F59E0B",
  red: "#EF4444",
  purple: "#8B5CF6",
  blue: "#3B82F6",
  green: "#22C55E",
  muted: "#94A3B8",
  light: "#EAF6F3",
  border: "rgba(255,255,255,0.08)",
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

const REGIOES: Regiao[] = ["Norte", "Nordeste", "Sudeste", "Sul", "Centro-Oeste"];

function formatCompetencia(c: string): string {
  const [ano, mes] = c.split("-");
  const nomes = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${nomes[parseInt(mes, 10)]}/${ano}`;
}

function fmtInt(n: number): string {
  return n.toLocaleString("pt-BR");
}

// ─── Brazil state polygons (mesma geometria estilizada do protótipo Figma) ────
const BR_STATES = [
  { id: "AM", name: "Amazonas",            pts: [[38,62],[168,56],[188,96],[180,148],[124,174],[82,162],[38,132]] },
  { id: "PA", name: "Pará",                pts: [[168,48],[272,48],[300,88],[296,158],[248,178],[188,162],[178,108],[170,58]] },
  { id: "MT", name: "Mato Grosso",         pts: [[108,196],[266,188],[290,244],[218,272],[110,256]] },
  { id: "BA", name: "Bahia",               pts: [[298,180],[396,174],[420,242],[408,296],[356,310],[306,300],[276,268],[266,232]] },
  { id: "RS", name: "Rio Grande do Sul",   pts: [[186,462],[330,452],[328,514],[188,524]] },
  { id: "MG", name: "Minas Gerais",        pts: [[265,294],[412,284],[422,302],[418,348],[374,364],[300,370],[260,344]] },
  { id: "SP", name: "São Paulo",           pts: [[213,334],[316,328],[326,374],[216,388]] },
  { id: "MS", name: "Mato Grosso do Sul",  pts: [[162,268],[268,260],[286,318],[264,344],[166,350]] },
  { id: "MA", name: "Maranhão",            pts: [[286,122],[352,116],[364,162],[302,172],[274,154]] },
  { id: "GO", name: "Goiás",               pts: [[268,240],[314,232],[330,292],[306,316],[266,310],[252,276]] },
  { id: "PI", name: "Piauí",               pts: [[348,134],[394,128],[398,188],[354,196],[338,174]] },
  { id: "TO", name: "Tocantins",           pts: [[256,162],[304,156],[316,228],[275,240],[248,224]] },
  { id: "CE", name: "Ceará",               pts: [[376,112],[420,116],[418,168],[378,172]] },
  { id: "PR", name: "Paraná",              pts: [[178,380],[322,372],[330,412],[180,422]] },
  { id: "SC", name: "Santa Catarina",      pts: [[200,424],[328,414],[334,450],[202,460]] },
  { id: "RO", name: "Rondônia",            pts: [[104,144],[182,148],[194,196],[108,204]] },
  { id: "AC", name: "Acre",                pts: [[34,154],[104,142],[112,188],[38,200]] },
  { id: "RR", name: "Roraima",             pts: [[128,8],[172,8],[182,52],[162,76],[118,72],[108,40]] },
  { id: "AP", name: "Amapá",               pts: [[238,8],[270,10],[268,58],[232,54]] },
  { id: "PE", name: "Pernambuco",          pts: [[350,178],[426,172],[422,196],[348,200]] },
  { id: "RN", name: "Rio Grande do Norte", pts: [[396,112],[432,118],[428,146],[392,144]] },
  { id: "PB", name: "Paraíba",             pts: [[388,156],[428,150],[424,174],[384,178]] },
  { id: "ES", name: "Espírito Santo",      pts: [[414,298],[436,294],[434,348],[410,352]] },
  { id: "RJ", name: "Rio de Janeiro",      pts: [[320,358],[415,348],[412,378],[316,386]] },
  { id: "AL", name: "Alagoas",             pts: [[396,196],[422,192],[420,214],[394,216]] },
  { id: "SE", name: "Sergipe",             pts: [[392,216],[420,212],[416,232],[388,236]] },
  { id: "DF", name: "Distrito Federal",    pts: [[286,268],[300,264],[302,278],[288,282]] },
];

const LABEL_STATES = new Set(["AM", "PA", "MT", "GO", "MS", "BA", "MG", "SP", "RS", "MA", "TO"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tercilColor(t: string | undefined) {
  if (t === "alto") return P.red;
  if (t === "medio") return P.gold;
  if (t === "baixo") return P.green;
  return "rgba(255,255,255,0.08)";
}
function tercilFill(t: string | undefined, hover: boolean) {
  const base = { alto: "239,68,68", medio: "245,158,11", baixo: "34,197,94" } as Record<string, string>;
  const rgb = base[t ?? ""] ?? "148,163,184";
  return `rgba(${rgb},${hover ? 0.88 : 0.62})`;
}
function ptStr(pts: number[][]) {
  return pts.map(([x, y]) => `${x},${y}`).join(" ");
}
function centroid(pts: number[][]): [number, number] {
  return [
    pts.reduce((s, [x]) => s + x, 0) / pts.length,
    pts.reduce((s, [, y]) => s + y, 0) / pts.length,
  ];
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

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <span className="text-xl font-bold tracking-tight leading-none select-none">
      <span className="text-white">LEITO</span>
      <span style={{ color: P.teal }}>360</span>
    </span>
  );
}

// ─── Select estilizado (legível no modo escuro) ────────────────────────────────
function DarkSelect({
  icon: Icon,
  value,
  onChange,
  options,
}: {
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border relative"
      style={{ borderColor: P.border, backgroundColor: P.inset }}
    >
      <Icon size={12} color={P.muted} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent outline-none pr-4 appearance-none cursor-pointer"
        style={{ color: P.light }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ backgroundColor: P.card, color: P.light }}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={11} style={{ color: P.muted, position: "absolute", right: 8, pointerEvents: "none" }} />
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
function TopBar({
  screen,
  onScreen,
  competencias,
  competencia,
  onCompetencia,
  regiao,
  onRegiao,
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
      className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-2 flex-shrink-0 border-b"
      style={{ backgroundColor: P.topbar, borderColor: P.border }}
    >
      <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
        <Logo />
        <div className="w-px h-5 hidden sm:block" style={{ backgroundColor: P.border }} />
        <nav className="flex items-center gap-1">
          {(["executivo", "analitico"] as Screen[]).map((id) => {
            const label = id === "executivo" ? "Visão Executiva" : "Explorador Analítico";
            const active = screen === id;
            return (
              <button
                key={id}
                onClick={() => onScreen(id)}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={{
                  backgroundColor: active ? P.tealDark : "transparent",
                  color: active ? "#fff" : P.muted,
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
          icon={Info}
          value={competencia}
          onChange={onCompetencia}
          options={competencias.map((c) => ({ value: c, label: formatCompetencia(c) }))}
        />
        <DarkSelect
          icon={MapPin}
          value={regiao}
          onChange={onRegiao}
          options={[{ value: "Todas", label: "Todas as Regiões" }, ...REGIOES.map((r) => ({ value: r, label: r }))]}
        />
        <div
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
          style={{ backgroundColor: "rgba(20,184,166,0.12)", color: P.teal }}
          title="Dados fechados do SIH/SUS e CNES, sujeitos a atualização retroativa pelo DATASUS"
        >
          Dados até {formatCompetencia(competencia)}
        </div>
      </div>
    </header>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({
  label, value, sub, icon: Icon, color, delta,
}: {
  label: string; value: string; sub: string; icon: React.ElementType; color: string; delta?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 border flex flex-col gap-3"
      style={{ backgroundColor: P.card, borderColor: P.border }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: P.muted }}>{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + "1A" }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-2xl sm:text-3xl font-bold text-white leading-none">{value}</p>
        <p className="text-xs" style={{ color: P.muted }}>{sub}</p>
      </div>
      {delta && <p className="text-xs font-medium" style={{ color: P.teal }}>{delta}</p>}
    </div>
  );
}

// ─── Brazil Map ───────────────────────────────────────────────────────────────
function BrazilMap({
  dados, ufSelecionada, onSelectUf,
}: { dados: Map<string, Registro>; ufSelecionada: string | null; onSelectUf: (uf: string | null) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 450 535" className="w-full h-full" style={{ maxHeight: "100%", filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.45))" }}>
        <rect x="0" y="0" width="450" height="535" fill="#060E1F" rx="8" />
        {BR_STATES.map((s) => {
          const reg = dados.get(s.id);
          const isHov = hovered === s.id;
          const isSel = ufSelecionada === s.id;
          const [cx, cy] = centroid(s.pts);
          const showLabel = LABEL_STATES.has(s.id);
          const ttX = Math.min(Math.max(cx - 56, 4), 340);
          const ttY = Math.max(cy - 44, 4);

          return (
            <g key={s.id}>
              <polygon
                points={ptStr(s.pts)}
                fill={tercilFill(reg?.tercil_pressao_assistencial, isHov || isSel)}
                stroke={isSel ? P.teal : P.bg}
                strokeWidth={isSel ? 3 : 1.5}
                strokeLinejoin="round"
                style={{ cursor: "pointer", transition: "fill 0.12s ease" }}
                onMouseEnter={() => setHovered(s.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectUf(ufSelecionada === s.id ? null : s.id)}
              />
              {showLabel && (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="8.5"
                  fill="rgba(255,255,255,0.82)" fontFamily="Inter, sans-serif" fontWeight="600"
                  style={{ pointerEvents: "none", userSelect: "none" }}>{s.id}</text>
              )}
              {isHov && reg && (
                <g style={{ pointerEvents: "none" }}>
                  <rect x={ttX} y={ttY} width={112} height={40} rx="5" fill="#0F2A4A" stroke="rgba(20,184,166,0.35)" strokeWidth="0.8" />
                  <text x={ttX + 56} y={ttY + 13} textAnchor="middle" fontSize="7" fill={P.muted} fontFamily="Inter, sans-serif">{s.name}</text>
                  <text x={ttX + 56} y={ttY + 27} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={tercilColor(reg.tercil_pressao_assistencial)} fontFamily="Inter, sans-serif">
                    {reg.internacoes_por_100k_hab.toLocaleString("pt-BR")} /100k hab.
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MapLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {[
        { label: "Tercil baixo", color: P.green },
        { label: "Tercil médio", color: P.gold },
        { label: "Tercil alto", color: P.red },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color, opacity: 0.8 }} />
          <span className="text-xs whitespace-nowrap" style={{ color: P.muted }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Ranking ──────────────────────────────────────────────────────────────────
function PressaoRanking({ registros }: { registros: Registro[] }) {
  const top5 = [...registros].sort((a, b) => b.internacoes_por_100k_hab - a.internacoes_por_100k_hab).slice(0, 5);
  const max = top5[0]?.internacoes_por_100k_hab ?? 1;
  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ backgroundColor: P.card, borderColor: P.border }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">UFs com maior pressão assistencial</h3>
        <AlertTriangle size={13} style={{ color: P.red }} />
      </div>
      <p className="text-xs -mt-2" style={{ color: P.muted }}>Internações por 100 mil habitantes</p>
      <div className="flex flex-col gap-2.5">
        {top5.map((r, i) => (
          <div key={r.codigo_uf}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs w-4 text-center font-bold flex-shrink-0 tabular-nums" style={{ color: P.muted }}>{i + 1}</span>
                <span className="text-xs font-medium text-white truncate">{r.estado}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-xs" style={{ color: P.muted }}>{r.sigla_uf}</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: tercilColor(r.tercil_pressao_assistencial) }}>
                  {r.internacoes_por_100k_hab.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
            <div className="ml-6 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: P.inset }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(r.internacoes_por_100k_hab / max) * 100}%`, backgroundColor: tercilColor(r.tercil_pressao_assistencial) }} />
            </div>
          </div>
        ))}
        {top5.length === 0 && <p className="text-xs" style={{ color: P.muted }}>Sem dados para o filtro atual.</p>}
      </div>
    </div>
  );
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────
function TrendTooltipContent({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="text-xs px-2.5 py-2 rounded-lg border" style={{ backgroundColor: P.inset, borderColor: "rgba(255,255,255,0.12)", color: P.light }}>
      <p className="font-semibold mb-0.5" style={{ color: P.teal }}>{label}</p>
      <p>{payload[0].value.toLocaleString("pt-BR")} internações</p>
    </div>
  );
}

function TrendChart({ trend }: { trend: { mes: string; internacoes: number }[] }) {
  return (
    <div className="rounded-xl border p-4 flex flex-col gap-2" style={{ backgroundColor: P.card, borderColor: P.border }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Internações por período</h3>
        <span className="text-xs" style={{ color: P.muted }}>{trend.length} competências</span>
      </div>
      <div style={{ height: 108 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={P.teal} stopOpacity={0.28} />
                <stop offset="95%" stopColor={P.teal} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: P.muted }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: P.muted }} axisLine={false} tickLine={false} />
            <Tooltip content={<TrendTooltipContent />} />
            <Area type="monotone" dataKey="internacoes" stroke={P.teal} strokeWidth={2} fill="url(#tealGrad)"
              dot={{ fill: P.teal, strokeWidth: 0, r: 2.5 }} activeDot={{ r: 4, fill: P.teal, strokeWidth: 2, stroke: P.card }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── UF selecionada ───────────────────────────────────────────────────────────
function UfSelecionadaCard({ registro, onClear }: { registro: Registro; onClear: () => void }) {
  return (
    <div className="rounded-xl border p-4 flex flex-col gap-2" style={{ backgroundColor: P.card, borderColor: P.teal + "55" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{registro.estado} ({registro.sigla_uf})</h3>
        <button onClick={onClear} style={{ color: P.muted }}><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: P.muted }}>
        <div>Internações<br /><span className="text-white font-semibold">{fmtInt(registro.internacoes)}</span></div>
        <div>Leitos SUS<br /><span className="text-white font-semibold">{fmtInt(registro.leitos_sus)}</span></div>
        <div>Permanência média<br /><span className="text-white font-semibold">{registro.permanencia_media.toLocaleString("pt-BR")} dias</span></div>
        <div>Taxa mortalidade<br /><span className="text-white font-semibold">{registro.taxa_mortalidade.toLocaleString("pt-BR")}%</span></div>
        <div>Pressão /100k hab.<br /><span className="text-white font-semibold">{registro.internacoes_por_100k_hab.toLocaleString("pt-BR")}</span></div>
        <div>Leitos /10k hab.<br /><span className="text-white font-semibold">{registro.leitos_sus_por_10k_hab.toLocaleString("pt-BR")}</span></div>
      </div>
    </div>
  );
}

// ─── Screen 1: Visão Executiva ────────────────────────────────────────────────
function VisaoExecutiva({
  registrosFiltrados, mapaRegistros, trend, ufSelecionada, onSelectUf, onScreen,
}: {
  registrosFiltrados: Registro[];
  mapaRegistros: Map<string, Registro>;
  trend: { mes: string; internacoes: number }[];
  ufSelecionada: string | null;
  onSelectUf: (uf: string | null) => void;
  onScreen: (s: Screen) => void;
}) {
  const agg = useMemo(() => {
    const internacoes = registrosFiltrados.reduce((s, r) => s + r.internacoes, 0);
    const leitos = registrosFiltrados.reduce((s, r) => s + r.leitos_sus, 0);
    const populacao = registrosFiltrados.reduce((s, r) => s + r.populacao, 0);
    const permPonderada = internacoes > 0
      ? registrosFiltrados.reduce((s, r) => s + r.permanencia_media * r.internacoes, 0) / internacoes
      : 0;
    const pressaoMedia = registrosFiltrados.length
      ? registrosFiltrados.reduce((s, r) => s + r.internacoes_por_100k_hab, 0) / registrosFiltrados.length
      : 0;
    const leitosPor10k = populacao > 0 ? (leitos / populacao) * 10000 : 0;
    const variacoes = registrosFiltrados.map((r) => r.variacao_mensal_internacoes_pct).filter((v): v is number => v !== null);
    const variacaoMedia = variacoes.length ? variacoes.reduce((s, v) => s + v, 0) / variacoes.length : null;
    return { internacoes, leitos, permPonderada, pressaoMedia, leitosPor10k, variacaoMedia };
  }, [registrosFiltrados]);

  const registroUf = ufSelecionada ? mapaRegistros.get(ufSelecionada) ?? null : null;

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 sm:p-5 overflow-y-auto min-h-0">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
        <KPICard label="Pressão assistencial" value={agg.pressaoMedia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          sub="internações /100 mil hab. (média das UFs)" icon={Activity} color={P.gold}
          delta={agg.variacaoMedia !== null ? `${agg.variacaoMedia >= 0 ? "↑" : "↓"} ${Math.abs(agg.variacaoMedia).toFixed(1)}% vs mês anterior` : undefined} />
        <KPICard label="Internações no período" value={fmtInt(agg.internacoes)} sub="competência selecionada" icon={Users} color={P.blue} />
        <KPICard label="Permanência média (ponderada)" value={`${agg.permPonderada.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`}
          sub="ponderada por internações" icon={Clock} color={P.purple} />
        <KPICard label="Leitos SUS cadastrados" value={fmtInt(agg.leitos)}
          sub={`${agg.leitosPor10k.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} por 10 mil hab. — não são vagas livres`} icon={Bed} color={P.teal} />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        <div className="flex-1 rounded-xl border flex flex-col p-4 gap-3 min-w-0" style={{ backgroundColor: P.card, borderColor: P.border, minHeight: 340 }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 flex-shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-white">Pressão assistencial comparativa por Estado</h2>
              <p className="text-xs mt-0.5" style={{ color: P.muted }}>Internações por 100 mil habitantes · Fonte: SIH/SUS + IBGE/SIDRA · clique numa UF para detalhar</p>
            </div>
            <MapLegend />
          </div>
          <div className="flex-1 min-h-[260px]">
            <BrazilMap dados={mapaRegistros} ufSelecionada={ufSelecionada} onSelectUf={onSelectUf} />
          </div>
        </div>

        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-3">
          {registroUf && <UfSelecionadaCard registro={registroUf} onClear={() => onSelectUf(null)} />}
          <PressaoRanking registros={registrosFiltrados} />
          <TrendChart trend={trend} />
          <button onClick={() => onScreen("analitico")}
            className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ backgroundColor: P.tealDark }}>
            <span className="flex items-center gap-2"><Database size={14} />Explorador Analítico</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2: Explorador Analítico ────────────────────────────────────────────
type Ordenacao = "internacoes_por_100k_hab" | "leitos_sus_por_10k_hab" | "permanencia_media" | "internacoes" | "variacao_mensal_internacoes_pct";

const ORDENACOES: { value: Ordenacao; label: string }[] = [
  { value: "internacoes_por_100k_hab", label: "Pressão assistencial (/100k hab.)" },
  { value: "leitos_sus_por_10k_hab", label: "Leitos SUS (/10k hab.)" },
  { value: "permanencia_media", label: "Permanência média" },
  { value: "internacoes", label: "Internações (total)" },
  { value: "variacao_mensal_internacoes_pct", label: "Variação mensal (%)" },
];

function sqlEquivalente(competencia: string, regiao: string, ordenacao: Ordenacao): string {
  const where = regiao === "Todas" ? `WHERE competencia = '${competencia}'` : `WHERE competencia = '${competencia}' AND regiao = '${regiao}'`;
  return `-- Consulta SQL equivalente ao filtro guiado abaixo (roda contra VW_LEITO360_ANALITICO)\n` +
    `-- Não gerada pelo Select AI: o Select AI é demonstrado no Database Actions durante o pitch.\n` +
    `SELECT sigla_uf, estado, regiao, internacoes, permanencia_media, leitos_sus,\n` +
    `       internacoes_por_100k_hab, leitos_sus_por_10k_hab\n` +
    `FROM VW_LEITO360_ANALITICO\n${where}\nORDER BY ${ordenacao} DESC;`;
}

function ExploradorAnalitico({
  todosRegistros, competencia, regiao,
}: { todosRegistros: Registro[]; competencia: string; regiao: string }) {
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("internacoes_por_100k_hab");
  const [sqlOpen, setSqlOpen] = useState(true);

  const linhas = useMemo(() => {
    return [...todosRegistros].sort((a, b) => {
      const va = a[ordenacao] ?? -Infinity;
      const vb = b[ordenacao] ?? -Infinity;
      return (vb as number) - (va as number);
    });
  }, [todosRegistros, ordenacao]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 sm:p-5 overflow-y-auto min-h-0">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-shrink-0">
          <DarkSelect icon={Database} value={ordenacao} onChange={(v) => setOrdenacao(v as Ordenacao)} options={ORDENACOES} />
          <button onClick={() => downloadCsv(`leito360_${competencia}_${regiao}.csv`, linhas)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white w-fit"
            style={{ backgroundColor: P.tealDark }}>
            <Download size={13} /> Exportar CSV
          </button>
        </div>

        <div className="rounded-xl border overflow-hidden flex-shrink-0" style={{ backgroundColor: P.card, borderColor: P.border }}>
          <button onClick={() => setSqlOpen(!sqlOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs uppercase tracking-wider font-semibold transition-colors"
            style={{ color: P.muted }}>
            <div className="flex items-center gap-2">
              <Database size={13} style={{ color: P.blue }} />
              <span>Consulta guiada — SQL equivalente</span>
              <span className="px-1.5 py-0.5 rounded text-xs font-normal normal-case" style={{ backgroundColor: "rgba(59,130,246,0.14)", color: P.blue }}>
                não gerada por IA
              </span>
            </div>
            {sqlOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {sqlOpen && (
            <div className="px-3 pb-3">
              <pre style={{
                backgroundColor: "#060D1E", color: P.light, fontFamily: "'JetBrains Mono','Courier New',monospace",
                fontSize: "11px", lineHeight: 1.7, padding: 14, borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
                overflowX: "auto", margin: 0, whiteSpace: "pre-wrap",
              }}>{sqlEquivalente(competencia, regiao, ordenacao)}</pre>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-white">{linhas.length} UFs no filtro atual</h3>
        </div>

        <div className="flex-1 overflow-auto min-h-0 rounded-xl border" style={{ borderColor: P.border }}>
          <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: P.inset, color: P.muted }}>
                {["UF", "Região", "Internações", "Permanência (d)", "Leitos SUS", "/100k hab.", "/10k hab. leitos", "Variação mês (%)"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((r, i) => (
                <tr key={r.codigo_uf} style={{ backgroundColor: i % 2 ? "rgba(255,255,255,0.015)" : "transparent", borderTop: `1px solid ${P.border}` }}>
                  <td className="px-3 py-2 font-medium text-white whitespace-nowrap">{r.sigla_uf} — {r.estado}</td>
                  <td className="px-3 py-2" style={{ color: P.muted }}>{r.regiao}</td>
                  <td className="px-3 py-2 tabular-nums text-white">{fmtInt(r.internacoes)}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: P.muted }}>{r.permanencia_media.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: P.muted }}>{fmtInt(r.leitos_sus)}</td>
                  <td className="px-3 py-2 tabular-nums font-bold" style={{ color: tercilColor(r.tercil_pressao_assistencial) }}>{r.internacoes_por_100k_hab.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: P.muted }}>{r.leitos_sus_por_10k_hab.toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: (r.variacao_mensal_internacoes_pct ?? 0) >= 0 ? P.red : P.green }}>
                    {r.variacao_mensal_internacoes_pct !== null ? `${r.variacao_mensal_internacoes_pct >= 0 ? "+" : ""}${r.variacao_mensal_internacoes_pct.toLocaleString("pt-BR")}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-4 rounded-xl border p-4 self-start" style={{ backgroundColor: P.card, borderColor: P.border }}>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: P.muted }}>Fontes de dados</h4>
          <div className="flex flex-col gap-2 text-xs" style={{ color: P.muted }}>
            <a href="http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sih/cnv/niuf.def" target="_blank" rel="noreferrer" className="underline hover:text-white">SIH/SUS — DATASUS TabNet</a>
            <a href="http://tabnet.datasus.gov.br/cgi/deftohtm.exe?cnes/cnv/leiintbr.def" target="_blank" rel="noreferrer" className="underline hover:text-white">CNES — Leitos de Internação</a>
            <a href="https://apisidra.ibge.gov.br/values/t/6579/n3/all/v/9324/p/last" target="_blank" rel="noreferrer" className="underline hover:text-white">IBGE/SIDRA — População estimada</a>
          </div>
        </div>
        <div className="border-t pt-4" style={{ borderColor: P.border }}>
          <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: P.muted }}>Limitações</h4>
          <ul className="flex flex-col gap-2 text-xs list-disc pl-4" style={{ color: P.muted }}>
            <li>Leitos SUS cadastrados não são vagas livres em tempo real.</li>
            <li>Sem monitoramento operacional ao vivo — dados de competências fechadas.</li>
            <li>Indicador principal é pressão assistencial comparativa, não ocupação hospitalar.</li>
          </ul>
        </div>
        <div className="border-t pt-4" style={{ borderColor: P.border }}>
          <div className="text-xs px-3 py-2.5 rounded-lg" style={{ backgroundColor: "rgba(20,184,166,0.08)", color: P.teal }}>
            <p className="font-semibold mb-1">Sobre o Select AI</p>
            <p className="leading-relaxed" style={{ color: P.muted }}>
              As consultas em linguagem natural via Oracle Select AI são demonstradas ao vivo no
              Database Actions durante o pitch (perfil LEITO360_AI). Este explorador usa filtros
              guiados sobre os mesmos dados, sem depender de um backend de IA em produção.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("executivo");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [competencia, setCompetencia] = useState<string>("");
  const [regiao, setRegiao] = useState<string>("Todas");
  const [ufSelecionada, setUfSelecionada] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/leito360.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Payload) => {
        setPayload(data);
        setCompetencia(data.gerado_em_competencia_padrao);
      })
      .catch((e) => setErro(String(e)));
  }, []);

  const registrosCompetencia = useMemo(() => {
    if (!payload) return [];
    return payload.registros.filter((r) => r.competencia === competencia);
  }, [payload, competencia]);

  const registrosFiltrados = useMemo(() => {
    if (regiao === "Todas") return registrosCompetencia;
    return registrosCompetencia.filter((r) => r.regiao === regiao);
  }, [registrosCompetencia, regiao]);

  const mapaRegistros = useMemo(() => {
    const m = new Map<string, Registro>();
    for (const r of registrosCompetencia) m.set(r.sigla_uf, r);
    return m;
  }, [registrosCompetencia]);

  const trend = useMemo(() => {
    if (!payload) return [];
    return payload.competencias_disponiveis.map((c) => {
      const regs = payload.registros.filter((r) => r.competencia === c && (regiao === "Todas" || r.regiao === regiao));
      return { mes: formatCompetencia(c), internacoes: regs.reduce((s, r) => s + r.internacoes, 0) };
    });
  }, [payload, regiao]);

  if (erro) {
    return (
      <div className="h-screen flex items-center justify-center p-6 text-center" style={{ backgroundColor: P.bg, color: P.light }}>
        <div>
          <p className="font-semibold mb-2">Não foi possível carregar os dados do LEITO360.</p>
          <p className="text-sm" style={{ color: P.muted }}>{erro}</p>
          <p className="text-xs mt-3" style={{ color: P.muted }}>
            Rode <code>python etl/fetch_raw.py &amp;&amp; python etl/parse_validate_build.py</code> para gerar public/data/leito360.json.
          </p>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: P.bg, color: P.muted }}>
        Carregando dados do LEITO360…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: P.bg, fontFamily: "'Inter', sans-serif" }}>
      <TopBar
        screen={screen} onScreen={setScreen}
        competencias={payload.competencias_disponiveis}
        competencia={competencia} onCompetencia={(c) => { setCompetencia(c); setUfSelecionada(null); }}
        regiao={regiao} onRegiao={setRegiao}
      />
      {screen === "executivo" ? (
        <VisaoExecutiva
          registrosFiltrados={registrosFiltrados}
          mapaRegistros={mapaRegistros}
          trend={trend}
          ufSelecionada={ufSelecionada}
          onSelectUf={setUfSelecionada}
          onScreen={setScreen}
        />
      ) : (
        <ExploradorAnalitico todosRegistros={registrosFiltrados} competencia={competencia} regiao={regiao} />
      )}
    </div>
  );
}
