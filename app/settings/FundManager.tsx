"use client";

import { useState } from "react";
import { Loader2, Plus, ArrowRight, Wallet, Target, Settings2, Trash2 } from "lucide-react";
import { fmtVND, fmtNum } from "@/lib/utils";

type Fund = {
  fundName: string;
  type: string;
  initialBalance: number;
  currentBalance: number;
  goalAmount: number | null;
  targetDate: string | null;
  isVirtual?: boolean;
};

export default function FundManager({ initialFunds }: { initialFunds: Fund[] }) {
  const [funds, setFunds] = useState<Fund[]>(initialFunds);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isVirtualMode, setIsVirtualMode] = useState(false);

  // Form State
  const [fundName, setFundName] = useState("");
  const [type, setType] = useState("Tiết kiệm"); // Tiết kiệm, Đầu tư, Khác...
  const [initialBalance, setInitialBalance] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const getMonthsDiff = (dateStr: string) => {
    const target = new Date(dateStr);
    const now = new Date();
    const diff = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    return diff > 0 ? diff : 1;
  };

  const handleEdit = (fund: Fund) => {
    setFundName(fund.fundName);
    setType(fund.type);
    setInitialBalance(String(fund.currentBalance)); // Using current balance as the baseline
    setGoalAmount(fund.goalAmount ? String(fund.goalAmount) : "");
    setTargetDate(fund.targetDate || "");
    setEditMode(true);
    setIsVirtualMode(!!fund.isVirtual);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFundName("");
    setType("Tiết kiệm");
    setInitialBalance("");
    setGoalAmount("");
    setTargetDate("");
    setEditMode(false);
    setIsVirtualMode(false);
    setShowForm(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        fundName,
        type,
        initialBalance: Number(initialBalance),
        goalAmount: goalAmount ? Number(goalAmount) : null,
        targetDate: targetDate || null,
        isUpdate: editMode || initialFunds.some(f => f.fundName === fundName)
      };

      const res = await fetch("/api/funds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
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
  
  const handleDelete = async (fundName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa quỹ "${fundName}"? Dữ liệu này sẽ không thể khôi phục.`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/funds?name=${encodeURIComponent(fundName)}`, {
        method: "DELETE"
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
    <div className="space-y-6">
      
      {/* Nút thêm mới */}
      {!showForm && (
        <button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="w-full py-4 border-2 border-dashed border-slate-300 rounded-3xl text-slate-500 font-medium hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Tạo Quỹ Mới
        </button>
      )}

      {/* Form thêm mới / Sửa */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-300 relative">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-700">{editMode ? `Chỉnh sửa Quỹ: ${fundName}` : "Thông tin Quỹ mới"}</h3>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 text-sm font-medium">Hủy</button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Tên Quỹ</label>
              <input type="text" required value={fundName} onChange={e=>setFundName(e.target.value)} disabled={editMode || isVirtualMode} placeholder="VD: Quỹ mua ô tô" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Loại quỹ</label>
              <select value={type} disabled={isVirtualMode} onChange={e=>setType(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400">
                <option value="Tiết kiệm">Tiết kiệm</option>
                <option value="Đầu tư">Đầu tư</option>
                <option value="Dự phòng">Dự phòng</option>
                <option value="Chi tiêu">Chi tiêu</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Số dư (VNĐ)</label>
              <input type="text" required value={initialBalance ? fmtNum(Number(initialBalance)) : ""} onChange={e=>setInitialBalance(e.target.value.replace(/[^0-9]/g, ''))} disabled={isVirtualMode} placeholder="0" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-400" />
            </div>
          </div>

          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 mt-4">
            <p className="text-xs font-semibold text-indigo-600 mb-3 uppercase tracking-wider">Cấu hình Đạt mục tiêu (Tiết kiệm/Đầu tư)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Mục tiêu Số tiền (VNĐ)</label>
                <input type="text" value={goalAmount ? fmtNum(Number(goalAmount)) : ""} onChange={e=>setGoalAmount(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Để trống nếu không có mục tiêu" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Deadline Đạt mục tiêu</label>
                <input type="date" value={targetDate} onChange={e=>setTargetDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl flex items-center justify-center transition-colors">
               {loading ? <Loader2 className="animate-spin" /> : (editMode ? "Cập nhật Quỹ" : "Lưu Quỹ mới")}
            </button>
            
            {editMode && fundName !== 'Quỹ Vàng' && 
             fundName !== 'Quỹ Tiết Kiệm' && 
             fundName !== 'Quỹ Chứng Khoán' && (
              <button 
                type="button"
                disabled={loading}
                onClick={() => handleDelete(fundName)}
                className="px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors flex items-center justify-center"
                title="Xóa quỹ"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </form>
      )}

      {/* Danh sách Quỹ & Tiến độ */}
      <div className="space-y-4 pt-4">
        <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Danh sách quỹ</h3>
        
        {funds.map((fund, idx) => {
          const hasGoal = fund.goalAmount && fund.goalAmount > 0 && fund.targetDate;
          const progress = hasGoal ? Math.min((fund.currentBalance / (fund.goalAmount as number)) * 100, 100) : 0;
          
          let suggestMonthly = 0;
          if (hasGoal) {
            const missing = (fund.goalAmount as number) - fund.currentBalance;
            const monthsLeft = getMonthsDiff(fund.targetDate as string);
            suggestMonthly = missing > 0 ? missing / monthsLeft : 0;
          }

          return (
            <div key={idx} className="bg-white border text-sm border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-colors">
              <button 
                onClick={() => handleEdit(fund)}
                className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-400 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-10"
                title="Sửa quỹ"
              >
                <Settings2 size={16} />
              </button>

              <div className="flex justify-between items-start mb-4 pr-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">{fund.type}</span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800">{fund.fundName}</h4>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Hiện có</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {fmtVND(fund.currentBalance)}
                  </p>
                </div>
              </div>

              {/* Tiến độ (chỉ hiện đối với quỹ có Mục tiêu) */}
              {hasGoal && (
                <div className="mt-6 pt-4 border-t border-slate-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-500">Mục tiêu: {fmtVND(fund.goalAmount as number)}</span>
                    <span className="text-xs font-bold text-indigo-600">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                  </div>
                  
                  {suggestMonthly > 0 && (
                    <div className="mt-4 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-800/80">
                        <Target size={16} />
                        <span className="text-xs font-medium">Khuyến nghị phân bổ mỗi tháng</span>
                      </div>
                      <span className="font-bold text-indigo-700">
                        {fmtVND(suggestMonthly)}
                      </span>
                    </div>
                  )}

                  {suggestMonthly <= 0 && fund.currentBalance >= (fund.goalAmount as number) && (
                    <div className="mt-4 bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-bold text-center border border-emerald-100">
                      🎉 Tuyệt vời! Bạn đã hoàn thành 100% mục tiêu của quỹ này!
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
