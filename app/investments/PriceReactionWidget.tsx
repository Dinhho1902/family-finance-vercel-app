"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { RefreshCw, ChevronDown, ChevronUp, Target, ShieldAlert } from "lucide-react";

export type RiskLevel = "high" | "medium" | "low";
export type RiskResult = {
  ticker: string;
  maxDrawdown: number;
  volatility: number;
  sharpeRatio: number;
  cagr: number;
  riskLevel: RiskLevel;
  // API response fields
  risk_level?: string;
  risk_score?: number;
  risk_bg?: string;
  risk_border?: string;
  current_price?: number;
  features?: Record<string, number>;
  feature_ratings?: Record<string, string>;
};

// ─── Types ────────────────────────────────────────────────────────────────────
export type ReactionPoint = {

  price: number; score: number;
  zone_type: "support" | "resistance";
  dist_pct: number;
};

export type TickerResult = {
  ticker: string; error?: string;
  current_price: number; latest_date: string;
  position_note: "near_resistance" | "near_support" | "mid_range" | "neutral";
  reaction_points: ReactionPoint[];
  nearest_support: ReactionPoint | null;
  nearest_resistance: ReactionPoint | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtN   = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const fmtNum = (n: number, d = 1) => (typeof n === "number" ? n.toFixed(d) : "—");

// ─── Risk config ──────────────────────────────────────────────────────────────
const RISK_CFG: Record<RiskLevel, { label: string; tw: string; dot: string; pill: string; pillActive: string }> = {
  high:   { label: "High Risk",   tw: "text-red-600",    dot: "bg-red-400",    pill: "bg-red-50 text-red-600 border-red-200",    pillActive: "bg-red-600 text-white border-red-600" },
  medium: { label: "Medium Risk", tw: "text-amber-600",  dot: "bg-amber-400",  pill: "bg-amber-50 text-amber-600 border-amber-200",  pillActive: "bg-amber-500 text-white border-amber-500" },
  low:    { label: "Low Risk",    tw: "text-emerald-600",dot: "bg-emerald-400",pill: "bg-emerald-50 text-emerald-600 border-emerald-200",pillActive: "bg-emerald-600 text-white border-emerald-600" },
};

const FEATURE_META: Record<string, { label: string; unit: string; desc: string }> = {
  atr_pct:       { label: "ATR %",       unit: "%",   desc: "Biên độ dao động" },
  vol_annual:    { label: "Volatility",  unit: "%",   desc: "Độ lệch chuẩn năm" },
  max_drawdown:  { label: "Max DD",      unit: "%",   desc: "Sụt giảm tối đa" },
  recovery_days: { label: "Recovery",   unit: "d",   desc: "Phiên phục hồi TB" },
  avg_turnover:  { label: "Liquidity",  unit: "tỷ",  desc: "Thanh khoản TB" },
  vol_cov:       { label: "Vol. CoV",   unit: "",    desc: "Ổn định khối lượng" },
  pe_ratio:      { label: "P/E",        unit: "x",   desc: "Giá / lợi nhuận" },
  adx:           { label: "ADX",        unit: "",    desc: "Sức mạnh xu hướng" },
};

const TIER_COLOR: Record<RiskLevel, string> = {
  low: "text-emerald-600", medium: "text-amber-600", high: "text-red-600",
};

const TIER_BG: Record<RiskLevel, string> = {
  low: "bg-emerald-50 text-emerald-700", medium: "bg-amber-50 text-amber-700", high: "bg-red-50 text-red-700",
};

const scoreColor = (s: number) =>
  s >= 65 ? "bg-red-400" : s >= 35 ? "bg-amber-400" : "bg-emerald-400";


// ─── Risk: score bar ──────────────────────────────────────────────────────────
function ScoreBar({ score, colorClass }: { score: number; colorClass?: string }) {
  const cls = colorClass ?? scoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${cls}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[10px] font-bold w-6 text-right ${cls.replace("bg-", "text-")}`}>{score}</span>
    </div>
  );
}

// ─── Risk: single ticker card ─────────────────────────────────────────────────
function RiskCard({ data }: { data: RiskResult }) {
  const [open, setOpen] = useState(false);
  const cfg = RISK_CFG[data.riskLevel as RiskLevel] || RISK_CFG['high'];
  const INVERSE_FEATURES = new Set(["avg_turnover", "adx"]);

  return (
    <div style={{ border: `1.5px solid ${data.risk_border}`, background: "#fff" }}
         className="rounded-2xl overflow-hidden shadow-sm">

      {/* Header */}
      <div style={{ background: data.risk_bg }} className="px-4 py-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-sm font-extrabold text-slate-800 tracking-wide">{data.ticker}</span>
            <span className="ml-2 text-xs text-slate-500">{fmtN(data.current_price ?? 0)}</span>
          </div>
          <span className={`text-[11px] font-bold ${cfg.tw}`}>{cfg.label}</span>
        </div>
        {/* Score bar */}
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Risk Score</span><span>{data.risk_score ?? 0}/100</span>
          </div>
          <ScoreBar score={data.risk_score ?? 0} colorClass={scoreColor(data.risk_score ?? 0)} />
        </div>
      </div>

      {/* Quick 4-feature grid */}
      <div className="px-4 pt-3 pb-1">
        <div className="grid grid-cols-2 gap-x-3">
          {(["atr_pct","vol_annual","max_drawdown","avg_turnover"] as const).map(k => {
            const meta  = FEATURE_META[k];
            const tier  = (data.feature_ratings as any)?.[k] ?? "medium";
            return (
              <div key={k} className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-[10px] text-slate-500">{meta.label}</span>
                <span className={`text-[11px] font-bold ${(TIER_COLOR as any)[tier]}`}>
                  {fmtNum((data.features as any)?.[k] ?? 0)}{meta.unit ? ` ${meta.unit}` : ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* Toggle detail */}
        <button onClick={() => setOpen(o => !o)}
          className="mt-2 w-full text-[10px] text-slate-400 hover:text-slate-600 py-1 text-center transition-colors">
          {open ? "▲ Thu gọn" : "▼ Xem tất cả chỉ số"}
        </button>

        {open && (
          <div className="mt-1 mb-2 space-y-0.5">
            {Object.keys(FEATURE_META).map(k => {
              const meta  = FEATURE_META[k];
              const tier  = (data.feature_ratings as any)?.[k] ?? "medium";
              const isInv = INVERSE_FEATURES.has(k);
              const label = tier === "low"
                ? (isInv ? "✓ Good" : "✓ Low")
                : tier === "high"
                ? (isInv ? "✗ Low" : "✗ High")
                : "~ Med";
              return (
                <div key={k} className="flex items-center gap-2 py-1 border-b border-slate-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-slate-700">{meta.label}</div>
                    <div className="text-[9px] text-slate-400">{meta.desc}</div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 w-16 text-right">
                    {fmtNum((data.features as any)?.[k] ?? 0)}{meta.unit ? ` ${meta.unit}` : ""}
                  </span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${(TIER_BG as any)[tier]}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Risk summary stacked bar ─────────────────────────────────────────────────
function RiskSummaryBar({ summary, active, onFilter }: {
  summary: Record<RiskLevel, string[]>;
  active: RiskLevel | null;
  onFilter: (l: RiskLevel | null) => void;
}) {
  const total = Object.values(summary).reduce((s, arr) => s + arr.length, 0);
  const levels: RiskLevel[] = ["high", "medium", "low"];
  const BAR_COLOR: Record<RiskLevel, string> = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };

  return (
    <div className="mb-4">
      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px mb-3">
        {levels.map(lvl => {
          const count = summary[lvl]?.length ?? 0;
          if (!count) return null;
          return (
            <div key={lvl} onClick={() => onFilter(active === lvl ? null : lvl)}
              className="cursor-pointer transition-opacity hover:opacity-80"
              style={{ flex: count, background: BAR_COLOR[lvl] }}
              title={`${RISK_CFG[lvl].label}: ${count} mã`} />
          );
        })}
      </div>

      {/* Pills */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => onFilter(null)}
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all
            ${!active ? "bg-slate-800 text-white border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"}`}>
          Tất cả ({total})
        </button>
        {levels.map(lvl => {
          const count = summary[lvl]?.length ?? 0;
          const cfg   = RISK_CFG[lvl];
          const isActive = active === lvl;
          return (
            <button key={lvl} onClick={() => onFilter(isActive ? null : lvl)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all
                ${isActive ? cfg.pillActive : cfg.pill} hover:opacity-80`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5 align-middle`} />
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ─── Price Reaction helpers ───────────────────────────────────────────────────
function PositionBar({ support, resistance, current }: { support: number; resistance: number; current: number }) {
  const range = resistance - support;
  const pct   = range > 0 ? Math.max(0, Math.min(100, (current - support) / range * 100)) : 50;
  const color = pct > 70 ? "bg-emerald-400" : pct < 30 ? "bg-red-400" : "bg-amber-400";
  return (
    <div className="flex items-center gap-1.5 w-full">
      <span className="text-[9px] text-red-500 font-semibold w-10 text-right flex-shrink-0">{fmtN(support)}</span>
      <div className="relative flex-1 h-1.5 bg-slate-100 rounded-full">
        <div className={`absolute -top-[3px] w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${color}`}
             style={{ left: `calc(${pct}% - 5px)` }} />
      </div>
      <span className="text-[9px] text-emerald-600 font-semibold w-10 flex-shrink-0">{fmtN(resistance)}</span>
    </div>
  );
}

const POSITION: Record<string, { label: string; cls: string }> = {
  near_resistance: { label: "Gần kháng cự", cls: "text-emerald-600 bg-emerald-50" },
  near_support:    { label: "Gần hỗ trợ",   cls: "text-red-500 bg-red-50" },
  mid_range:       { label: "Giữa vùng",    cls: "text-amber-600 bg-amber-50" },
  neutral:         { label: "—",            cls: "text-slate-400 bg-slate-50" },
};

const reactionScoreColor = (s: number) =>
  s >= 70 ? "bg-red-400" : s >= 45 ? "bg-amber-400" : "bg-slate-300";

function TickerRow({ data, isExpanded, onToggle }: {
  data: TickerResult; isExpanded: boolean; onToggle: () => void;
}) {
  if (data.error) {
    return (
      <tr className="border-b border-slate-100">
        <td className="py-3 px-4 font-bold text-slate-400">{data.ticker}</td>
        <td colSpan={4} className="py-3 px-4 text-xs text-red-400">{data.error}</td>
      </tr>
    );
  }

  const supports    = data.reaction_points.filter(p => p.zone_type === "support" && p.score >= 50);
  const resistances = data.reaction_points.filter(p => p.zone_type === "resistance" && p.score >= 50);
  const choiLoi = resistances[0] ?? null;
  const batDay  = supports[0]    ?? null;
  const catLo   = supports[1]    ?? (batDay
    ? { price: Math.round(batDay.price * 0.97), dist_pct: +(batDay.dist_pct - 3).toFixed(1), score: 0 }
    : null);
  const pos = POSITION[data.position_note] ?? POSITION.neutral;
  const moreResist  = resistances.slice(0, 5);
  const moreSupport = supports.slice(0, 5);

  return (
    <Fragment>
      <tr className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors cursor-pointer select-none ${isExpanded ? "bg-indigo-50/20" : ""}`}
          onClick={onToggle}>
        <td className="py-3 px-4">
          <div className="font-extrabold text-slate-800 tracking-wide text-sm">{data.ticker}</div>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${pos.cls}`}>{pos.label}</span>
        </td>
        <td className="py-3 px-4">
          <div className="font-bold text-slate-700 text-sm mb-1.5">{fmtN(data.current_price)}</div>
          {batDay && choiLoi && (
            <PositionBar support={batDay.price} resistance={choiLoi.price} current={data.current_price} />
          )}
        </td>
        <td className="py-3 px-4">
          {choiLoi
            ? <><div className="font-bold text-emerald-600 text-sm">{fmtN(choiLoi.price)}</div><div className="text-[10px] text-emerald-500">{fmtPct(choiLoi.dist_pct)}</div></>
            : <span className="text-slate-300 text-xs">—</span>}
        </td>
        <td className="py-3 px-4">
          {batDay
            ? <><div className="font-bold text-emerald-600 text-sm">{fmtN(batDay.price)}</div><div className="text-[10px] text-emerald-500">{fmtPct(batDay.dist_pct)}</div></>
            : <span className="text-slate-300 text-xs">—</span>}
        </td>
        <td className="py-3 px-4">
          {catLo
            ? <><div className="font-bold text-red-600 text-sm">{fmtN(catLo.price)}</div><div className="text-[10px] text-red-400">{fmtPct(catLo.dist_pct)}</div></>
            : <span className="text-slate-300 text-xs">—</span>}
        </td>
      </tr>

      {isExpanded && (
        <tr className="border-b-2 border-indigo-100">
          <td colSpan={5} className="px-4 pb-4 pt-0 bg-indigo-50/20">
            <div className="grid grid-cols-2 gap-6 pt-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-emerald-500 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Vùng chốt lời
                </p>
                <div className="space-y-2">
                  {moreResist.length === 0
                    ? <p className="text-xs text-slate-400">Không có dữ liệu</p>
                    : moreResist.map((pt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600 text-xs w-14 flex-shrink-0">{fmtN(pt.price)}</span>
                        <span className="text-[10px] text-emerald-500 w-10 flex-shrink-0">{fmtPct(pt.dist_pct)}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${reactionScoreColor(pt.score)}`} style={{ width: `${pt.score}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 w-5 text-right flex-shrink-0">{pt.score}</span>
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-red-400 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Vùng bắt đáy / cắt lỗ
                </p>
                <div className="space-y-2">
                  {moreSupport.length === 0
                    ? <p className="text-xs text-slate-400">Không có dữ liệu</p>
                    : moreSupport.map((pt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="font-bold text-red-600 text-xs w-14 flex-shrink-0">{fmtN(pt.price)}</span>
                        <span className="text-[10px] text-red-400 w-10 flex-shrink-0">{fmtPct(pt.dist_pct)}</span>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${reactionScoreColor(pt.score)}`} style={{ width: `${pt.score}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 w-5 text-right flex-shrink-0">{pt.score}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <p className="text-[9px] text-slate-300 mt-3 px-4">Score ≥70 mạnh · 45–69 trung bình · &lt;45 yếu · Nhấn lại để đóng</p>
          </td>
        </tr>
      )}
    </Fragment>
  );
}


// ─── Main widget ──────────────────────────────────────────────────────────────
export default function PriceReactionWidget({
  tickers,
  onData,
}: {
  tickers: string[];
  onData?: (data: TickerResult[]) => void;
}) {
  const [activeTab,     setActiveTab]     = useState<"reaction" | "risk">("reaction");
  const [results,       setResults]       = useState<TickerResult[]>([]);
  const [riskData,      setRiskData]      = useState<RiskResult[]>([]);
  const [riskSummary,   setRiskSummary]   = useState<Record<RiskLevel, string[]>>({ high: [], medium: [], low: [] });
  const [riskFilter,    setRiskFilter]    = useState<RiskLevel | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [loadingRisk,   setLoadingRisk]   = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [errorRisk,     setErrorRisk]     = useState<string | null>(null);
  const [lastUpdated,   setLastUpdated]   = useState<string | null>(null);
  const [collapsed,     setCollapsed]     = useState(false);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  const tickerStr = tickers.join(",");

  const fetchReaction = useCallback(async () => {
    if (!tickers.length) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/price-reaction?tickers=${tickerStr}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      const data = json.data ?? [];
      setResults(data);
      onData?.(data);
      setLastUpdated(new Date().toLocaleTimeString("vi-VN"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally { setLoading(false); }
  }, [tickerStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRisk = useCallback(async () => {
    if (!tickers.length) return;
    setLoadingRisk(true); setErrorRisk(null);
    try {
      const res  = await fetch(`/api/risk?tickers=${tickerStr}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRiskData(json.data?.filter((d: RiskResult) => "risk_level" in d) ?? []);
      setRiskSummary(json.summary ?? { high: [], medium: [], low: [] });
      setLastUpdated(new Date().toLocaleTimeString("vi-VN"));
    } catch (e: unknown) {
      setErrorRisk(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally { setLoadingRisk(false); }
  }, [tickerStr]);

  useEffect(() => { fetchReaction(); }, [fetchReaction]);
  useEffect(() => { fetchRisk(); }, [fetchRisk]);

  const filteredRisk = riskFilter
    ? riskData.filter(d => d.risk_level === riskFilter)
    : riskData;

  const isLoading = activeTab === "reaction" ? loading : loadingRisk;

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      {/* Row 1: title + collapse */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 cursor-pointer select-none"
           onClick={() => setCollapsed(c => !c)}>
        <div className="flex items-center gap-2">
          {activeTab === "risk"
            ? <ShieldAlert size={15} className="text-amber-500" />
            : <Target size={15} className="text-indigo-500" />}
          <h3 className="font-bold text-sm text-slate-800">
            {activeTab === "risk" ? "Phân loại rủi ro" : "Khuyến nghị giá"}
          </h3>
          {isLoading && <span className="text-[10px] text-slate-400 animate-pulse">Đang phân tích…</span>}
          {lastUpdated && !isLoading && <span className="text-[10px] text-slate-400">{lastUpdated}</span>}
        </div>
        {collapsed ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronUp size={15} className="text-slate-400" />}
      </div>

      {/* Row 2: tab switcher + refresh */}
      {!collapsed && (
        <div className="flex items-center gap-2 px-4 pb-3" onClick={e => e.stopPropagation()}>
          <div className="flex flex-1 bg-slate-100 rounded-xl p-0.5 gap-0.5">
            {([
              { id: "reaction", label: "◎ Phản ứng giá" },
              { id: "risk",     label: "⬡ Rủi ro" },
            ] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 rounded-[10px] text-xs font-semibold transition-all
                  ${activeTab === tab.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={activeTab === "reaction" ? fetchReaction : fetchRisk}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors disabled:opacity-50 flex-shrink-0">
            <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="px-4 pb-4">

          {/* ── RISK TAB ── */}
          {activeTab === "risk" && (
            <>
              {errorRisk && (
                <div className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-3">{errorRisk}</div>
              )}
              {riskData.length > 0 && (
                <RiskSummaryBar summary={riskSummary} active={riskFilter} onFilter={setRiskFilter} />
              )}
              {loadingRisk && !riskData.length && (
                <div className="grid grid-cols-2 gap-3">
                  {tickers.map(t => <div key={t} className="h-36 rounded-2xl bg-slate-100 animate-pulse" />)}
                </div>
              )}
              {filteredRisk.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRisk.map(d => <RiskCard key={d.ticker} data={d} />)}
                </div>
              )}
              {filteredRisk.length === 0 && !loadingRisk && riskData.length > 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Không có mã nào ở mức {riskFilter} risk.
                </div>
              )}
            </>
          )}

          {/* ── REACTION TAB ── */}
          {activeTab === "reaction" && (
            <>
              {error && (
                <div className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 mb-3">{error}</div>
              )}
              {loading && !results.length && (
                <div className="space-y-2">
                  {tickers.map(t => <div key={t} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}
                </div>
              )}
              {results.length > 0 && (
                <div className="overflow-x-auto -mx-4 px-4">
                  <table className="w-full text-left border-collapse min-w-[480px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400 font-semibold">
                        <th className="pb-2 pr-3">Mã</th>
                        <th className="pb-2 pr-3">Giá / Vị trí</th>
                        <th className="pb-2 pr-3">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Chốt lời
                          </span>
                        </th>
                        <th className="pb-2 pr-3">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />Bắt đáy
                          </span>
                        </th>
                        <th className="pb-2">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />Cắt lỗ
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(data => (
                        <TickerRow key={data.ticker} data={data}
                          isExpanded={expandedTicker === data.ticker}
                          onToggle={() => setExpandedTicker(p => p === data.ticker ? null : data.ticker)} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {results.length > 0 && (
                <p className="text-[9px] text-slate-300 mt-3">
                  * Nhấn vào mã để xem chi tiết vùng kháng cự / hỗ trợ
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
