"use client";

import { useState, useEffect } from "react";
import { Edit3, Save, X, Trash2, PlusCircle, Loader2, TrendingUp } from "lucide-react";
import { fmtVND, fmtNum, calcAccruedInterest, calcInterestBetween } from "@/lib/utils";

type Saving = {
  bankName: string;
  principal: number;
  interestRate: number;
  startDate: string;
  maturityDate: string;
};

export default function SavingsManager({ initialSavings }: { initialSavings: Saving[] }) {
  const [savings, setSavings] = useState<Saving[]>(initialSavings);
  const [editingBank, setEditingBank] = useState<string | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [editForm, setEditForm] = useState<Saving>({ bankName: "", principal: 0, interestRate: 0, startDate: new Date().toISOString().split('T')[0], maturityDate: "" });
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const getAccruedInterest = (sav: Saving) => calcAccruedInterest(sav.principal, sav.interestRate, sav.startDate);

  const totalPrincipal = savings.reduce((acc, curr) => acc + curr.principal, 0);
  const totalAccrued = savings.reduce((acc, curr) => acc + getAccruedInterest(curr), 0);
  const totalAtMaturity = savings.reduce((acc, curr) => acc + curr.principal + calcInterestBetween(curr.principal, curr.interestRate, curr.startDate, curr.maturityDate), 0);

  const fmtDate = (d: string) => d && isMounted ? new Date(d).toLocaleDateString('vi-VN') : '---';

  const startEdit = (sav: Saving) => { setEditingBank(sav.bankName); setEditForm({ ...sav }); setIsAddingMode(false); };
  const cancelEdit = () => { setEditingBank(null); setIsAddingMode(false); };
  const startAddNew = () => { setIsAddingMode(true); setEditingBank(null); setEditForm({ bankName: "", principal: 0, interestRate: 0, startDate: new Date().toISOString().split('T')[0], maturityDate: "" }); };

  const handleSave = async (originalBank: string | null) => {
    if (!editForm.bankName || editForm.principal <= 0) { alert("Thiếu thông tin hoặc Số tiền <= 0"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: isAddingMode ? "ADD_NEW" : "UPDATE_SAVING", originalBank, bankName: editForm.bankName, principal: Number(editForm.principal), interestRate: Number(editForm.interestRate), startDate: editForm.startDate, maturityDate: editForm.maturityDate })
      });
      if (res.ok) { window.location.reload(); } else { alert((await res.json()).error); }
    } catch { alert("Lỗi kết nối"); } finally { setLoading(false); }
  };

  const handleDelete = async (bankName: string) => {
    if (!confirm(`Xóa sổ ${bankName}?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/savings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionType: "DELETE_SAVING", bankName }) });
      if (res.ok) { window.location.reload(); } else { alert((await res.json()).error); }
    } catch { alert("Lỗi mạng"); } finally { setLoading(false); }
  };

  const sortedSavings = [...savings].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[2rem] p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex-1">
            <p className="text-blue-100 text-sm font-medium mb-1">Tiền gốc gửi tiết kiệm</p>
            <div className="text-3xl font-bold tracking-tight">{fmtVND(totalPrincipal)}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 flex-1 w-full">
            <p className="text-blue-100 text-xs font-bold uppercase mb-1">Ước tính hiện tại (+Lãi)</p>
            <div className="text-xl font-black text-emerald-300">{fmtVND(totalPrincipal + totalAccrued)}</div>
            <p className="text-[10px] text-blue-200 mt-1 font-semibold">+{fmtNum(totalAccrued)} đ lãi tạm tính</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 flex-1 w-full">
            <p className="text-blue-100 text-xs font-bold uppercase mb-1">Tối đa nếu tất toán</p>
            <div className="text-xl font-black text-amber-300">{fmtVND(totalAtMaturity)}</div>
            <p className="text-[10px] text-blue-200 mt-1 font-semibold">+{fmtNum(totalAtMaturity - totalPrincipal)} đ lãi tối đa</p>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-slate-800">Chi tiết Sổ Tiết Kiệm</h3>
          <button onClick={startAddNew} className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-xl transition-colors">
            <PlusCircle size={16} /> Thêm sổ
          </button>
        </div>

        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 font-semibold bg-slate-50/50">
              <th className="py-3 px-3 text-left">Tên sổ</th>
              <th className="py-3 px-3 text-right">Tiền gốc</th>
              <th className="py-3 px-3 text-center">Lãi</th>
              <th className="py-3 px-3 text-center">Gửi → Đáo hạn</th>
              <th className="py-3 px-3 text-right">Giá trị ĐH</th>
              <th className="py-3 px-3 text-center">·</th>
            </tr>
          </thead>
          <tbody>
            {isAddingMode && (
              <tr className="border-b-2 border-indigo-200 bg-indigo-50/40">
                <td className="py-2 px-3">
                  <input type="text" placeholder="Ngân hàng (VD: VCB)..." value={editForm.bankName} onChange={e => setEditForm({...editForm, bankName: e.target.value})} className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-bold" />
                </td>
                <td className="py-2 px-3">
                  <input type="text" placeholder="Tiền gốc..." value={editForm.principal ? fmtNum(editForm.principal) : ""} onChange={e => setEditForm({...editForm, principal: Number(e.target.value.replace(/[^0-9]/g, ''))})} className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-right" />
                </td>
                <td className="py-2 px-3">
                  <input type="number" step="0.1" placeholder="%" value={editForm.interestRate || ""} onChange={e => setEditForm({...editForm, interestRate: Number(e.target.value)})} className="w-16 bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-center" />
                </td>
                <td className="py-2 px-3">
                  <div className="flex flex-col gap-1">
                    <input type="date" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})} className="bg-white border border-slate-300 rounded px-2 py-1 text-xs w-full" />
                    <input type="date" value={editForm.maturityDate} onChange={e => setEditForm({...editForm, maturityDate: e.target.value})} className="bg-white border border-slate-300 rounded px-2 py-1 text-xs w-full" />
                  </div>
                </td>
                <td className="py-2 px-3 text-right text-xs italic text-slate-400">Tự tính</td>
                <td className="py-2 px-3">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => handleSave(null)} disabled={loading} className="text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 font-bold rounded-lg text-xs flex items-center gap-1">
                      {loading ? <Loader2 size={13} className="animate-spin" /> : "Lưu"}
                    </button>
                    <button onClick={cancelEdit} disabled={loading} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg"><X size={15} /></button>
                  </div>
                </td>
              </tr>
            )}
            {sortedSavings.map((sav, idx) => {
              const isEditing = editingBank === sav.bankName;
              const seqName = `${sav.bankName} ${idx + 1}`;

              if (isEditing) {
                return (
                  <tr key={sav.bankName} className="border-b border-slate-100 bg-indigo-50/40">
                    <td className="py-2 px-3">
                      <input type="text" value={editForm.bankName} onChange={e => setEditForm({...editForm, bankName: e.target.value})} placeholder="Ngân hàng..." className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-bold" />
                    </td>
                    <td className="py-2 px-3">
                      <input type="text" value={editForm.principal ? fmtNum(editForm.principal) : ""} onChange={e => setEditForm({...editForm, principal: Number(e.target.value.replace(/[^0-9]/g, ''))})} placeholder="Tiền gốc..." className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-right" />
                    </td>
                    <td className="py-2 px-3">
                      <input type="number" step="0.1" value={editForm.interestRate || ""} onChange={e => setEditForm({...editForm, interestRate: Number(e.target.value)})} placeholder="%" className="w-16 bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-center" />
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col gap-1">
                        <input type="date" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})} className="bg-white border border-slate-300 rounded px-2 py-1 text-xs w-full" />
                        <input type="date" value={editForm.maturityDate} onChange={e => setEditForm({...editForm, maturityDate: e.target.value})} className="bg-white border border-slate-300 rounded px-2 py-1 text-xs w-full" />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-xs italic text-slate-400">Tự tính</td>
                    <td className="py-2 px-3">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleSave(sav.bankName)} disabled={loading} className="text-emerald-600 hover:bg-emerald-100 p-1.5 rounded-lg"><Save size={15} /></button>
                        <button onClick={cancelEdit} disabled={loading} className="text-slate-400 hover:bg-slate-100 p-1.5 rounded-lg"><X size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={sav.bankName} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-800">{seqName}</div>
                    <div className="text-[11px] text-slate-400">{sav.bankName}</div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="font-bold text-slate-800">{fmtNum(sav.principal)}</div>
                    <div className="text-[11px] text-emerald-600 font-semibold">+{fmtNum(getAccruedInterest(sav))}</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">
                      <TrendingUp size={11} />{sav.interestRate}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="text-xs text-slate-500">{fmtDate(sav.startDate)}</div>
                    <div className="text-xs font-bold text-indigo-600">{fmtDate(sav.maturityDate)}</div>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-indigo-700">
                    {fmtNum(sav.principal + calcInterestBetween(sav.principal, sav.interestRate, sav.startDate, sav.maturityDate))}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => startEdit(sav)} className="text-slate-300 hover:text-indigo-500 transition-colors p-1"><Edit3 size={15} /></button>
                      <button onClick={() => handleDelete(sav.bankName)} className="text-slate-300 hover:text-rose-500 transition-colors p-1"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}

          </tbody>
        </table>

        {savings.length === 0 && !isAddingMode && (
          <div className="text-center py-12 text-slate-400 text-sm">
            Chưa có khoản tiết kiệm nào. Nhấn <strong>Thêm sổ</strong> để bắt đầu.
          </div>
        )}
      </section>
    </div>
  );
}
