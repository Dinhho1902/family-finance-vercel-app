"use client";

import { useState } from "react";
import { Sparkles, Save, History, Calendar, Plus, CheckCircle2, AlertCircle, Loader2, PiggyBank } from "lucide-react";
import { fmtNum as fmt } from "@/lib/utils";

type Fund = {
  fundName: string;
  type: string;
  currentBalance: number;
  goalAmount: number | null;
  targetDate: string | null;
};

type AllocationRecord = {
  date: string;
  month: string;
  totalAmount: number;
  note: string;
  details: string;
};

type Suggestion = {
  fundName: string;
  amount: number;
  reason: string;
};

type ConfirmingState = {
  suggestions: Suggestion[];
  note: string;
  totalAmount: number;
  hasCash: boolean;
  cashAmount: number;
  hasSavings: boolean;
  savingsAmount: number;
};


export default function AllocationManager({
  funds,
  investments,
  savings,
  gold,
  accruedInterest,
  allocationHistory: initialAllocationHistory,
  historyData
}: {
  funds: Fund[],
  investments: number,
  savings: number,
  gold: number,
  accruedInterest: number,
  allocationHistory: AllocationRecord[],
  historyData: any[]
}) {
  const [income, setIncome] = useState<number>(0);
  const [note, setNote] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [allocationHistory, setAllocationHistory] = useState(initialAllocationHistory);

  // Bước xác nhận (chưa lưu)
  const [confirming, setConfirming] = useState<ConfirmingState | null>(null);
  const [savingsForm, setSavingsForm] = useState({ bankName: "", interestRate: "", startDate: new Date().toISOString().split('T')[0], maturityDate: "" });
  const [savingsDone, setSavingsDone] = useState(false);

  // Lưu chính thức
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const handleGetAISuggestion = async () => {
    if (income <= 0) {
      setError("Vui lòng nhập số tiền lớn hơn 0 để có thể phân bổ.");
      return;
    }
    setError("");
    setSuccess("");
    setConfirming(null);
    setLoadingAI(true);
    setSuggestions([]);

    try {
      const res = await fetch("/api/allocation/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funds, investments, savings, gold, income, accruedInterest, historyData, allocationHistory })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi AI");
      setSuggestions(data.suggestions);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lấy gợi ý AI");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleUpdateAmount = (fundName: string, amount: number) => {
    setSuggestions(prev => prev.map(s => s.fundName === fundName ? { ...s, amount } : s));
  };

  // Bước 1: validate rồi vào màn hình xác nhận (chưa gọi API)
  const handleConfirm = () => {
    const totalAllocated = suggestions.reduce((acc, s) => acc + s.amount, 0);
    if (totalAllocated !== income) {
      setError(`Tổng tiền phân bổ (${fmt(totalAllocated)}) phải bằng số tiền cần phân bổ (${fmt(income)}).`);
      return;
    }
    setError("");
    const cashAlloc = suggestions.find(s => s.fundName === 'Quỹ Chứng Khoán');
    const savingsAlloc = suggestions.find(s => s.fundName === 'Quỹ Tiết Kiệm');
    setConfirming({
      suggestions,
      note,
      totalAmount: totalAllocated,
      hasCash: !!cashAlloc && cashAlloc.amount > 0,
      cashAmount: cashAlloc?.amount || 0,
      hasSavings: !!savingsAlloc && savingsAlloc.amount > 0,
      savingsAmount: savingsAlloc?.amount || 0,
    });
    setSavingsDone(false);
    setSavingsForm({ bankName: "", interestRate: "", startDate: new Date().toISOString().split('T')[0], maturityDate: "" });
  };

  const allStepsDone = confirming && (!confirming.hasSavings || savingsDone);

  // Bước 2: lưu chính thức — 1 lần gọi API duy nhất
  const handleFinalSave = async () => {
    if (!confirming) return;
    setSaving(true);
    setError("");

    try {
      const now = new Date();
      const monthStr = `${now.getMonth() + 1}/${now.getFullYear()}`;
      const dateStr = now.toISOString().split('T')[0];

      const alreadyAllocated = allocationHistory.some(r => r.month === monthStr);
      if (alreadyAllocated && !confirm(`Tháng ${monthStr} đã có bản ghi phân bổ. Bạn có muốn ghi đè không?`)) {
        setSaving(false);
        return;
      }

      const res = await fetch("/api/allocation/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: monthStr,
          date: dateStr,
          totalAmount: confirming.totalAmount,
          note: confirming.note,
          allocations: confirming.suggestions,
          savingsData: confirming.hasSavings && savingsDone ? {
            bankName: savingsForm.bankName,
            principal: confirming.savingsAmount,
            interestRate: parseFloat(savingsForm.interestRate) || 0,
            startDate: savingsForm.startDate,
            maturityDate: savingsForm.maturityDate,
          } : null,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi lưu");

      const newRecord: AllocationRecord = {
        date: dateStr,
        month: monthStr,
        totalAmount: confirming.totalAmount,
        note: confirming.note,
        details: JSON.stringify(confirming.suggestions)
      };
      setAllocationHistory([newRecord, ...allocationHistory.filter(r => r.month !== monthStr)]);
      setSuccess("Đã lưu phân bổ chính thức thành công!");
      setConfirming(null);
      setSuggestions([]);
      setSummary("");
      setIncome(0);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setConfirming(null);
    setSavingsDone(false);
    setError("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Left Column */}
      <section className="space-y-8">
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Plus size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Lập kế hoạch Phân bổ</h2>
          </div>

          {/* Input */}
          {!confirming && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-500 ml-1">Số tiền cần phân bổ</label>
              <input
                type="text"
                inputMode="numeric"
                value={income ? fmt(income) + ' VND' : ""}
                onChange={(e) => {
                  const raw = Number(e.target.value.replace(/[^0-9]/g, ''));
                  setIncome(isNaN(raw) ? 0 : raw);
                }}
                className="w-full px-5 py-5 bg-slate-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-indigo-500 transition-all font-black text-2xl text-indigo-600"
                placeholder="0 VND"
              />
              <button
                onClick={handleGetAISuggestion}
                disabled={loadingAI || income <= 0}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-[1.5rem] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100"
              >
                {loadingAI ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                AI Gợi ý
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 text-rose-600 rounded-xl flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && !confirming && (
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-start gap-3 text-sm animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Bước xác nhận */}
          {confirming && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-700">Xác nhận phân bổ</p>
                <span className="text-xs text-slate-400 font-medium">Tổng: {fmt(confirming.totalAmount)} VND</span>
              </div>

              {/* Quỹ Chứng Khoán */}
              {confirming.hasCash && (
                <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Quỹ Chứng Khoán</p>
                    <p className="text-xs text-slate-500 mt-0.5">+{fmt(confirming.cashAmount)} VND sẽ được thêm vào <span className="font-semibold">Tiền chưa giải ngân</span>.</p>
                  </div>
                </div>
              )}

              {/* Quỹ Tiết Kiệm */}
              {confirming.hasSavings && !savingsDone && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-3">
                  <div className="flex items-start gap-3">
                    <PiggyBank size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-indigo-800">Quỹ Tiết Kiệm — Thêm sổ mới</p>
                      <p className="text-xs text-indigo-600 mt-0.5">Điền thông tin sổ tiết kiệm <span className="font-bold">{fmt(confirming.savingsAmount)} VND</span>.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Tên ngân hàng / sổ"
                      value={savingsForm.bankName}
                      onChange={e => setSavingsForm(f => ({ ...f, bankName: e.target.value }))}
                      className="col-span-2 px-3 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      type="number"
                      placeholder="Lãi suất (%/năm)"
                      value={savingsForm.interestRate}
                      onChange={e => setSavingsForm(f => ({ ...f, interestRate: e.target.value }))}
                      className="px-3 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      type="date"
                      value={savingsForm.startDate}
                      onChange={e => setSavingsForm(f => ({ ...f, startDate: e.target.value }))}
                      className="px-3 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      type="date"
                      placeholder="Ngày đáo hạn"
                      value={savingsForm.maturityDate}
                      onChange={e => setSavingsForm(f => ({ ...f, maturityDate: e.target.value }))}
                      className="col-span-2 px-3 py-2 bg-white border border-indigo-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => setSavingsDone(true)}
                      disabled={!savingsForm.bankName || !savingsForm.maturityDate}
                      className="col-span-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle2 size={14} />
                      Xác nhận sổ tiết kiệm
                    </button>
                  </div>
                </div>
              )}

              {confirming.hasSavings && savingsDone && (
                <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Quỹ Tiết Kiệm — Đã xác nhận</p>
                    <p className="text-xs text-emerald-600 mt-0.5">{savingsForm.bankName} · {fmt(confirming.savingsAmount)} VND</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl font-bold text-sm transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleFinalSave}
                  disabled={saving || !allStepsDone}
                  className="flex-2 flex-1 py-3 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Lưu chính thức
                </button>
              </div>
            </div>
          )}

          {/* Suggestions List */}
          {!confirming && suggestions.length > 0 && (
            <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <p className="text-sm text-indigo-800 font-medium flex items-center gap-2">
                  <Sparkles size={16} /> Gemini Idea:
                </p>
                <p className="text-sm text-slate-600 italic mt-1">{summary}</p>
              </div>

              <div className="space-y-3">
                {suggestions.map((s, idx) => (
                  <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-colors shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-700">{s.fundName}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={fmt(s.amount)}
                        onChange={(e) => handleUpdateAmount(s.fundName, Number(e.target.value.replace(/[^0-9]/g, '')))}
                        className="w-36 text-right px-2 py-1 bg-slate-50 rounded-lg text-indigo-600 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{s.reason}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-500 ml-1">Ghi chú phân bổ</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                  rows={2}
                  placeholder="Ghi chú thêm về đợt phân bổ này..."
                />
              </div>

              <button
                onClick={handleConfirm}
                className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-slate-200"
              >
                <Save size={24} />
                Xác nhận & Lưu Phân bổ
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Right Column: History */}
      <section className="space-y-8">
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <History size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Lịch sử Phân bổ</h2>
          </div>

          <div className="space-y-6 flex-1 overflow-auto pr-2 max-h-[800px]">
            {allocationHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                <Calendar size={48} className="opacity-20" />
                <p className="font-medium text-sm">Chưa có bản ghi phân bổ nào</p>
              </div>
            ) : (
              allocationHistory.map((record, idx) => {
                const details = JSON.parse(record.details || "[]");
                return (
                  <div key={idx} className="group relative bg-slate-50/50 hover:bg-slate-50 p-6 rounded-[2rem] border border-transparent hover:border-slate-200 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-wider">Tháng {record.month}</span>
                        <p className="text-sm text-slate-400 mt-1 font-medium">{record.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-800">+{fmt(record.totalAmount)}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Tổng phân bổ</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {details.map((d: any, i: number) => (
                        <div key={i} className="px-3 py-1 bg-white rounded-full border border-slate-100 text-[11px] font-bold text-slate-600 shadow-sm">
                          {d.fundName}: <span className="text-indigo-600">{fmt(d.amount)}</span>
                        </div>
                      ))}
                    </div>
                    {record.note && (
                      <p className="text-xs text-slate-500 italic bg-white/50 p-3 rounded-xl border border-dashed border-slate-200">
                        "{record.note}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
