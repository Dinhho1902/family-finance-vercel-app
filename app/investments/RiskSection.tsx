"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import type { RiskLevel, RiskResult } from "./PriceReactionWidget";

const fmtN = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));
const fmtNum = (n: number, d = 1) => (typeof n === "number" ? n.toFixed(d) : "—");

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

function RiskCard({ data }: { data: RiskResult }) {
  const [open, setOpen] = useState(false);
  const cfg = RISK_CFG[data.riskLevel as RiskLevel] || RISK_CFG['high'];
  const INVERSE_FEATURES = new Set(["avg_turnover", "adx"]);

  return (
    <div style={{ border: `1.5px solid ${data.risk_border}`, background: "#fff" }}
         className="rounded-2xl overflow-hidden shadow-sm">
      <div style={{ background: data.risk_bg }} className="px-4 py-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-sm font-extrabold text-slate-800 tracking-wide">{data.ticker}</span>
            <span className="ml-2 text-xs text-slate-500">{fmtN(data.current_price ?? 0)}</span>
          </div>
          <span className={`text-[11px] font-bold ${cfg.tw}`}>{cfg.label}</span>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Risk Score</span><span>{data.risk_score ?? 0}/100</span>
          </div>
          <ScoreBar score={data.risk_score ?? 0} colorClass={scoreColor(data.risk_score ?? 0)} />
        </div>
      </div>
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

export default function RiskSection({ tickers }: { tickers: string[] }) {
  const [riskData, setRiskData] = useState<RiskResult[]>([]);
  const [riskSummary, setRiskSummary] = useState<Record<RiskLevel, string[]>>({ high: [], medium: [], low: [] });
  const [riskFilter, setRiskFilter] = useState<RiskLevel | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [errorRisk, setErrorRisk] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const tickerStr = tickers.join(",");

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

  useEffect(() => { fetchRisk(); }, [fetchRisk]);

  const filteredRisk = riskFilter
    ? riskData.filter(d => d.risk_level === riskFilter)
    : riskData;

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 cursor-pointer select-none"
           onClick={() => setCollapsed(c => !c)}>
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} className="text-amber-500" />
          <h3 className="font-bold text-sm text-slate-800">Phân loại rủi ro</h3>
          {loadingRisk && <span className="text-[10px] text-slate-400 animate-pulse">Đang phân tích…</span>}
          {lastUpdated && !loadingRisk && <span className="text-[10px] text-slate-400">{lastUpdated}</span>}
        </div>
        {collapsed ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronUp size={15} className="text-slate-400" />}
      </div>

      {!collapsed && (
        <div className="flex items-center gap-2 px-4 pb-3" onClick={e => e.stopPropagation()}>
          <button onClick={fetchRisk}
            disabled={loadingRisk}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors disabled:opacity-50 flex-shrink-0 ml-auto">
            <RefreshCw size={11} className={loadingRisk ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="px-4 pb-4">
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
        </div>
      )}
    </section>
  );
}
