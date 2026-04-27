"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { RefreshCw, ChevronDown, ChevronUp, Target } from "lucide-react";
import type { TickerResult } from "./PriceReactionWidget";

const fmtN = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;

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
          {batDay
            ? <><div className="font-bold text-emerald-600 text-sm">{fmtN(batDay.price)}</div><div className="text-[10px] text-emerald-500">{fmtPct(batDay.dist_pct)}</div></>
            : <span className="text-slate-300 text-xs">—</span>}
        </td>
        <td className="py-3 px-4">
          {choiLoi
            ? <><div className="font-bold text-emerald-600 text-sm">{fmtN(choiLoi.price)}</div><div className="text-[10px] text-emerald-500">{fmtPct(choiLoi.dist_pct)}</div></>
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
                <p className="text-[10px] font-bold uppercase text-red-400 mb-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Hỗ trợ — Vùng bắt đáy / cắt lỗ
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
            </div>
            <p className="text-[9px] text-slate-300 mt-3 px-4">Score ≥70 mạnh · 45–69 trung bình · &lt;45 yếu · Nhấn lại để đóng</p>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export default function PriceReactionSection({ tickers, onData }: {
  tickers: string[];
  onData?: (data: TickerResult[]) => void;
}) {
  const [results, setResults] = useState<TickerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
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
  }, [tickerStr]);

  useEffect(() => { fetchReaction(); }, [fetchReaction]);

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 cursor-pointer select-none"
           onClick={() => setCollapsed(c => !c)}>
        <div className="flex items-center gap-2">
          <Target size={15} className="text-indigo-500" />
          <h3 className="font-bold text-sm text-slate-800">Phản ứng giá</h3>
          {loading && <span className="text-[10px] text-slate-400 animate-pulse">Đang phân tích…</span>}
          {lastUpdated && !loading && <span className="text-[10px] text-slate-400">{lastUpdated}</span>}
        </div>
        {collapsed ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronUp size={15} className="text-slate-400" />}
      </div>

      {!collapsed && (
        <div className="flex items-center gap-2 px-4 pb-3" onClick={e => e.stopPropagation()}>
          <button onClick={fetchReaction}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors disabled:opacity-50 flex-shrink-0 ml-auto">
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="px-4 pb-4">
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
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />Bắt đáy
                      </span>
                    </th>
                    <th className="pb-2 pr-3">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Chốt lời
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
        </div>
      )}
    </section>
  );
}
