"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Edit3, Save, X, Trash2, PlusCircle, Loader2, RefreshCcw } from "lucide-react";
import { fmtVND, fmtNum, fmtQty } from "@/lib/utils";

type Gold = {
  type: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
};

const GOLD_TYPES = [
  "Nhẫn trơn 9999 (SJC)",
  "Nhẫn trơn 9999 (PNJ)",
  "Nhẫn trơn 9999 (Doji)",
  "SJC (Vàng miếng)",
  "Vàng trang sức",
  "Tiền mặt chưa mua vàng"
];

export default function GoldManager({ initialGold, lastSync }: { initialGold: Gold[], lastSync: string | null }) {
  const [goldList, setGoldList] = useState<Gold[]>(initialGold);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [editForm, setEditForm] = useState<Gold>({ type: GOLD_TYPES[0], quantity: 0, avgPrice: 0, currentPrice: 0 });
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const formatLastSync = (isoStr: string | null) => {
    if (!isoStr) return "Chưa cập nhật";
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
             " ngày " + date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch { return "Không xác định"; }
  };

  const totalValue = goldList.reduce((acc, curr) => acc + (curr.quantity * curr.currentPrice), 0);
  const totalQuantity = goldList.filter(g => g.type !== 'Tiền mặt chưa mua vàng').reduce((acc, curr) => acc + curr.quantity, 0);

  const startEdit = (gold: Gold) => {
    setEditingType(gold.type);
    setEditForm({ ...gold });
    setIsAddingMode(false);
  };

  const cancelEdit = () => {
    setEditingType(null);
    setIsAddingMode(false);
  };

  const startAddNew = () => {
    setIsAddingMode(true);
    setEditingType(null);
    setEditForm({ type: GOLD_TYPES[0], quantity: 0, avgPrice: 0, currentPrice: 0 });
  };

  const handleSave = async (originalType: string | null) => {
    if (!editForm.type || (editForm.type !== 'Tiền mặt chưa mua vàng' && editForm.quantity <= 0)) {
      alert("Thiếu thông tin hoặc Số lượng <= 0");
      return;
    }
    setLoading(true);

    const isNew = isAddingMode;
    const actionType = isNew ? "ADD_NEW" : "UPDATE_GOLD";
    
    try {
      const res = await fetch("/api/gold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          originalType,
          type: editForm.type,
          quantity: Number(editForm.quantity),
          avgPrice: 0, // No longer tracked
          currentPrice: Number(editForm.currentPrice)
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

  const handleDelete = async (type: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa dữ liệu loại ${type}?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/gold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "DELETE_GOLD", type })
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

  const syncPrice = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "SYNC_PRICE" })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Không thể đồng bộ giá vàng lúc này.");
      }
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-gradient-to-br from-amber-400 to-amber-700 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
           <RefreshCcw size={120} />
        </div>
        <h2 className="text-amber-100 font-medium mb-1">Giá trị tích lũy Vàng</h2>
        <div className="text-4xl font-bold tracking-tight mb-4">
          {fmtVND(totalValue)}
        </div>
        <div className="flex items-center gap-4 border-t border-amber-300/30 pt-4">
          <div>
            <span className="text-amber-200 text-xs uppercase font-semibold">Tổng lượng tích lũy</span>
            <div className="flex items-center mt-1 text-lg font-bold text-amber-50">
               {totalQuantity.toFixed(1)} Chỉ
            </div>
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-white border border-amber-300/30">
            Cập nhật theo giá thị trường
          </div>
        </div>
      </section>

      <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-slate-800">Kho Vàng của bạn</h3>
          <div className="flex flex-col items-end gap-1">
            <button onClick={syncPrice} disabled={loading} className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-800 transition-colors bg-amber-50 px-4 py-2 rounded-xl">
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} /> Cập nhật giá
            </button>
            <p className="text-[10px] font-medium text-slate-400 italic">
              Cập nhật lần cuối: <span className="text-amber-600 not-italic font-bold">{mounted ? formatLastSync(lastSync) : "---"}</span>
            </p>
            <button onClick={startAddNew} className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-4 py-2 rounded-xl">
              <PlusCircle size={18} /> Thêm số lượng
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 font-bold bg-slate-50/50">
                <th className="py-4 px-4 font-semibold rounded-tl-xl text-center">Loại vàng</th>
                <th className="py-4 px-4 font-semibold text-right">Lượng (Chỉ)</th>
                <th className="py-4 px-4 font-semibold text-right">Giá HT / Chỉ</th>
                <th className="py-4 px-4 font-semibold text-right">Giá trị Hiện tại</th>
                <th className="py-4 px-4 font-semibold text-center rounded-tr-xl">Hành động</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {goldList.map((gold) => {
                const isEditing = editingType === gold.type;

                if (isEditing) {
                  return (
                    <tr key={gold.type} className="border-b border-slate-100 bg-amber-50/30">
                      <td className="py-3 px-3">
                         <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold outline-none">
                            {GOLD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                      </td>
                      <td className="py-3 px-3">
                         <input type="number" step="0.1" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-right outline-none" />
                      </td>
                      <td className="py-3 px-3">
                         <input type="text" value={editForm.currentPrice ? fmtNum(editForm.currentPrice) : ""} onChange={e => setEditForm({...editForm, currentPrice: Number(e.target.value.replace(/[^0-9]/g, ''))})} className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-right text-amber-700 font-bold outline-none" />
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-400">---</td>
                      <td className="py-3 px-3 flex justify-center gap-2">
                         <button onClick={() => handleSave(gold.type)} disabled={loading} className="text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-lg"><Save size={18} /></button>
                         <button onClick={cancelEdit} disabled={loading} className="text-slate-500 hover:bg-slate-200 p-1.5 rounded-lg"><X size={18} /></button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={gold.type} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-800">{gold.type}</td>
                    <td className="py-4 px-4 text-right font-bold text-indigo-600">{fmtQty(gold.quantity)} Chỉ</td>
                    <td className="py-4 px-4 text-right font-bold text-amber-600">{fmtNum(gold.currentPrice)}</td>
                    <td className="py-4 px-4 text-right font-black text-slate-800">
                       {fmtVND(gold.quantity * gold.currentPrice)}
                    </td>
                    <td className="py-4 px-4">
                       <div className="flex justify-center gap-3">
                         <button onClick={() => startEdit(gold)} className="text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 size={16} /></button>
                         <button onClick={() => handleDelete(gold.type)} className="text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                       </div>
                    </td>
                  </tr>
                );
              })}

              {isAddingMode && (
                 <tr className="border-b-2 border-indigo-200 bg-amber-50/30">
                    <td className="py-4 px-4">
                       <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-bold outline-none">
                          {GOLD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                       </select>
                    </td>
                    <td className="py-3 px-3">
                       <input type="number" step="0.1" placeholder="Số chỉ..." value={editForm.quantity || ""} onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})} className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-right outline-none" />
                    </td>
                    <td className="py-3 px-3">
                       <div className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-right text-slate-400 font-medium italic">Tự cập nhật...</div>
                    </td>
                    <td className="py-3 px-3 text-right text-xs italic text-slate-400">---</td>
                    <td className="py-3 px-3 flex justify-center gap-2">
                       <button onClick={() => handleSave(null)} disabled={loading} className="text-emerald-600 bg-emerald-100 hover:bg-emerald-200 px-3 py-1 font-bold rounded-lg text-xs flex items-center gap-1">
                          {loading ? <Loader2 size={14} className="animate-spin" /> : "Lưu tích lũy"}
                       </button>
                       <button onClick={cancelEdit} disabled={loading} className="text-slate-500 hover:bg-slate-200 p-1.5 rounded-lg"><X size={16} /></button>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
          {goldList.length === 0 && !isAddingMode && (
             <div className="text-center py-12 text-slate-400 border-b border-slate-100">
               Chưa có dữ liệu vàng. Nhấn Thêm để bắt đầu tích lũy.
             </div>
          )}
        </div>
      </section>
    </div>
  );
}
