"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Edit3, Save, X, Trash2, PlusCircle, Loader2 } from "lucide-react";
import { fmtNum, fmtQty } from "@/lib/utils";
import PriceReactionSection from "./PriceReactionSection";
import RiskSection from "./RiskSection";
import StockScreenerSection from "./StockScreenerSection";

type Investment = {
  asset: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
};

export default function InvestmentManager({ initialInvestments }: { initialInvestments: Investment[] }) {
  const [investments, setInvestments] = useState<Investment[]>(initialInvestments);
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  
  // Cash Management
  const cashRow = investments.find(i => i.asset === 'Tiền chưa giải ngân');
  const cashBalance = cashRow ? cashRow.quantity : 0;
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashForm, setCashForm] = useState(String(cashBalance));

  // Filter stocks for the table
  const stocks = investments.filter(i => i.asset !== 'Tiền chưa giải ngân');

  // Track new row
  const [isAddingMode, setIsAddingMode] = useState(false);

  // Edit State
  const [editForm, setEditForm] = useState<Investment>({ asset: "", quantity: 0, avgPrice: 0, currentPrice: 0 });
  const [loading, setLoading] = useState(false);

  // Calculations
  const stocksCost = Math.round(stocks.reduce((acc, curr) => acc + (curr.quantity * curr.avgPrice), 0));
  const stocksValue = Math.round(stocks.reduce((acc, curr) => acc + (curr.quantity * curr.currentPrice), 0));
  
  const totalValue = stocksValue + cashBalance;
  const totalCost = stocksCost + cashBalance; // We assume cash cost is its value
  
  const totalProfit = stocksValue - stocksCost;
  const profitPercent = stocksCost > 0 ? (totalProfit / stocksCost) * 100 : 0;

  const startEdit = (inv: Investment) => {
    setEditingAsset(inv.asset);
    setEditForm({ ...inv });
    setIsAddingMode(false);
  };

  const cancelEdit = () => {
    setEditingAsset(null);
    setIsAddingMode(false);
  };

  const startAddNew = () => {
    setIsAddingMode(true);
    setEditingAsset(null);
    setEditForm({ asset: "", quantity: 0, avgPrice: 0, currentPrice: 0 });
  };

  const handleSave = async (originalAsset: string | null) => {
    if (!editForm.asset || editForm.quantity <= 0) {
      alert("Thiếu thông tin hoặc Số lượng <= 0");
      return;
    }
    setLoading(true);

    const isNew = isAddingMode;
    const actionType = isNew ? "ADD_NEW" : "UPDATE_ASSET";
    
    try {
      const res = await fetch("/api/sheets?resource=investment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          originalAsset,
          asset: editForm.asset,
          quantity: Number(editForm.quantity),
          avgPrice: Number(editForm.avgPrice),
          currentPrice: Number(editForm.currentPrice || editForm.avgPrice)
        })
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (asset: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa mã ${asset}?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sheets?resource=investment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "DELETE_ASSET", asset })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch {
      alert("Lỗi mạng");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCash = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sheets?resource=investment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: cashRow ? "UPDATE_ASSET" : "ADD_NEW",
          originalAsset: 'Tiền chưa giải ngân',
          asset: 'Tiền chưa giải ngân',
          quantity: Number(cashForm),
          avgPrice: 1,
          currentPrice: 1
        })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hero summary — 2-row layout on mobile */}
      <section className="bg-gradient-to-br from-emerald-600 to-teal-900 rounded-2xl p-4 md:p-6 text-white shadow-lg">
        {/* Top: portfolio value + P&L */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-emerald-200 text-[11px] font-semibold uppercase tracking-wide mb-1">Tổng danh mục</p>
            <p className="text-2xl md:text-3xl font-black tracking-tight leading-none">
              {fmtNum(totalValue)}
              <span className="text-base font-semibold text-emerald-300 ml-1">VND</span>
            </p>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 flex-shrink-0 ${totalProfit >= 0 ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-300"}`}>
            {totalProfit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {totalProfit >= 0 ? "+" : ""}{profitPercent.toFixed(2)}%
          </div>
        </div>

        {/* Bottom: P&L + cash */}
        <div className="grid grid-cols-2 gap-3 border-t border-emerald-500/30 pt-3">
          <div>
            <p className="text-emerald-300 text-[10px] font-semibold uppercase mb-0.5">Lãi / Lỗ CK</p>
            <p className={`text-base font-bold ${totalProfit >= 0 ? "text-emerald-300" : "text-rose-400"}`}>
              {totalProfit >= 0 ? "+" : ""}{fmtNum(totalProfit)} VND
            </p>
          </div>

          <div className="bg-white/10 rounded-xl p-2.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-emerald-200 text-[10px] font-semibold uppercase">Tiền mặt</p>
              {!isEditingCash && (
                <button onClick={() => setIsEditingCash(true)} className="text-emerald-300 hover:text-white">
                  <Edit3 size={12} />
                </button>
              )}
            </div>
            {isEditingCash ? (
              <div className="space-y-1.5">
                <input type="text" autoFocus
                  value={cashForm ? fmtNum(Number(cashForm)) : ""}
                  onChange={e => setCashForm(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-white/20 border border-white/20 rounded-lg px-2 py-1 text-sm font-bold text-white outline-none" />
                <div className="flex gap-1.5">
                  <button onClick={handleSaveCash} disabled={loading}
                    className="flex-1 bg-emerald-500 py-1 rounded-lg text-[11px] font-bold">
                    {loading ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Lưu"}
                  </button>
                  <button onClick={() => { setIsEditingCash(false); setCashForm(String(cashBalance)); }}
                    className="px-2 bg-white/10 py-1 rounded-lg text-[11px] font-bold">Hủy</button>
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-white">{fmtNum(cashBalance)}₫</p>
            )}
          </div>
        </div>
      </section>

      {/* Stock Screener */}
      <StockScreenerSection />

      {/* Price Reaction Widget */}
      <PriceReactionSection tickers={stocks.map(s => s.asset)} />
      <RiskSection tickers={stocks.map(s => s.asset)} />

      {/* Stock list */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-800">Chi tiết Danh mục</h3>
          <button onClick={startAddNew}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors">
            <PlusCircle size={14} /> Thêm mã
          </button>
        </div>

        {/* Add new form */}
        {isAddingMode && (
          <div className="px-4 py-3 bg-indigo-50/40 border-b border-indigo-100 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Mã CP (VD: VNM)"
                value={editForm.asset}
                onChange={e => setEditForm({ ...editForm, asset: e.target.value.toUpperCase() })}
                className="col-span-2 bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <input type="number" placeholder="Số lượng"
                value={editForm.quantity || ""}
                onChange={e => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <input type="text" placeholder="Giá vốn"
                value={editForm.avgPrice ? fmtNum(editForm.avgPrice) : ""}
                onChange={e => setEditForm({ ...editForm, avgPrice: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSave(null)} disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Lưu</>}
              </button>
              <button onClick={cancelEdit} className="px-4 bg-slate-100 text-slate-600 py-2 rounded-xl text-sm font-semibold">
                Hủy
              </button>
            </div>
          </div>
        )}

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-slate-100">
          {stocks.map(inv => {
            const val   = Math.round(inv.quantity * inv.currentPrice);
            const pf    = Math.round(val - inv.quantity * inv.avgPrice);
            const isUp  = pf >= 0;
            const pct   = inv.avgPrice > 0 ? (pf / (inv.quantity * inv.avgPrice)) * 100 : 0;
            const isEd  = editingAsset === inv.asset;

            if (isEd) return (
              <div key={inv.asset} className="px-4 py-3 bg-indigo-50/40 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input value={editForm.quantity}
                    onChange={e => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                    type="number" placeholder="Số lượng"
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  <input value={editForm.avgPrice ? fmtNum(editForm.avgPrice) : ""}
                    onChange={e => setEditForm({ ...editForm, avgPrice: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                    placeholder="Giá vốn"
                    className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSave(inv.asset)} disabled={loading}
                    className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-1">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> Lưu</>}
                  </button>
                  <button onClick={cancelEdit} className="px-4 bg-slate-100 py-2 rounded-xl text-sm font-semibold text-slate-600">Hủy</button>
                </div>
              </div>
            );

            return (
              <div key={inv.asset} className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-emerald-700">{inv.asset}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-800">{fmtNum(inv.currentPrice)}</span>
                    <span className={`text-xs font-bold ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
                      {isUp ? "+" : ""}{pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] text-slate-400">{fmtQty(inv.quantity)} cp · vốn {fmtNum(inv.avgPrice)}</span>
                    <span className={`text-[11px] font-semibold ${isUp ? "text-emerald-500" : "text-rose-400"}`}>
                      {isUp ? "+" : ""}{fmtNum(pf)}₫
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => startEdit(inv)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => handleDelete(inv.asset)} className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
          {stocks.length === 0 && !isAddingMode && (
            <div className="py-10 text-center text-slate-400 text-sm">Chưa có mã nào. Nhấn Thêm mã để bắt đầu.</div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase text-slate-400 font-semibold">
                <th className="py-3 px-4">Mã</th>
                <th className="py-3 px-4 text-right">Lượng</th>
                <th className="py-3 px-4 text-right">Giá vốn</th>
                <th className="py-3 px-4 text-right">Giá HT</th>
                <th className="py-3 px-4 text-right">Giá trị TT</th>
                <th className="py-3 px-4 text-right">Lãi/Lỗ</th>
                <th className="py-3 px-4 text-center">Sửa</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {stocks.map(inv => {
                const val  = Math.round(inv.quantity * inv.currentPrice);
                const pf   = Math.round(val - inv.quantity * inv.avgPrice);
                const isUp = pf >= 0;
                const pct  = inv.avgPrice > 0 ? (pf / (inv.quantity * inv.avgPrice)) * 100 : 0;
                const isEd = editingAsset === inv.asset;

                if (isEd) return (
                  <tr key={inv.asset} className="border-b border-slate-100 bg-indigo-50/30">
                    <td className="py-2 px-4 font-bold text-slate-700">{inv.asset}</td>
                    <td className="py-2 px-4"><input type="number" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: Number(e.target.value) })} className="w-20 border border-slate-300 rounded-lg px-2 py-1 text-xs text-right" /></td>
                    <td className="py-2 px-4"><input value={editForm.avgPrice ? fmtNum(editForm.avgPrice) : ""} onChange={e => setEditForm({ ...editForm, avgPrice: Number(e.target.value.replace(/[^0-9]/g, '')) })} className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-xs text-right" /></td>
                    <td className="py-2 px-4"><input value={editForm.currentPrice ? fmtNum(editForm.currentPrice) : ""} onChange={e => setEditForm({ ...editForm, currentPrice: Number(e.target.value.replace(/[^0-9]/g, '')) })} className="w-24 border border-slate-300 rounded-lg px-2 py-1 text-xs text-right" /></td>
                    <td className="py-2 px-4 text-right text-slate-400 text-xs italic">Tự tính</td>
                    <td className="py-2 px-4 text-right text-slate-400 text-xs italic">Tự tính</td>
                    <td className="py-2 px-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleSave(inv.asset)} disabled={loading} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg"><Save size={15} /></button>
                        <button onClick={cancelEdit} className="text-slate-500 hover:bg-slate-100 p-1.5 rounded-lg"><X size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );

                return (
                  <tr key={inv.asset} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{inv.asset}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{fmtQty(inv.quantity)}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{fmtNum(inv.avgPrice)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">{fmtNum(inv.currentPrice)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">{fmtNum(val)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className={`font-bold text-sm flex flex-col items-end ${isUp ? "text-emerald-600" : "text-rose-500"}`}>
                        <span>{isUp ? "+" : ""}{pct.toFixed(2)}%</span>
                        <span className="text-[10px] font-medium opacity-75">{isUp ? "+" : ""}{fmtNum(pf)}₫</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => startEdit(inv)} className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"><Edit3 size={15} /></button>
                        <button onClick={() => handleDelete(inv.asset)} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {stocks.length === 0 && !isAddingMode && (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">Chưa có mã nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
