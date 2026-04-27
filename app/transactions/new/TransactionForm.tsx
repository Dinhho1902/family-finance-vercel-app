"use client";

import { useState } from "react";
import { MoveRight, Loader2, CheckCircle2 } from "lucide-react";
import { fmtNum } from "@/lib/utils";

export default function TransactionForm({ funds }: { funds: string[] }) {
  const [type, setType] = useState<"Thu nhập" | "Chuyển quỹ">("Thu nhập");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [sourceFund, setSourceFund] = useState(funds[0] || "");
  const [destinationFund, setDestinationFund] = useState(funds.length > 1 ? funds[1] : funds[0]);
  const [note, setNote] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, date, amount: Number(amount), sourceFund, destinationFund, note }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setAmount("");
        setNote("");
        setType("Thu nhập"); // Reset
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Mất kết nối tới server.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-in zoom-in duration-500">
        <CheckCircle2 size={80} className="text-emerald-500" />
        <h3 className="text-2xl font-bold text-slate-800">Đã lưu giao dịch!</h3>
        <p className="text-slate-500">Giao dịch đã được đồng bộ lên Google Sheets.</p>
        <button 
          onClick={() => setSuccess(false)}
          className="mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2 rounded-xl transition-colors font-medium"
        >
          Ghi chép tiếp
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Transaction Type Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl">
        {(["Thu nhập", "Chuyển quỹ"] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === t ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Số tiền</label>
          <div className="relative">
            <input 
              type="text" 
              required
              value={amount ? fmtNum(Number(amount)) : ""}
              onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="0"
            />
            <span className="absolute right-4 top-3 text-slate-400 font-medium font-mono">VNĐ</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Ngày giao dịch</label>
          <input 
            type="date" 
            required
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
        {type === "Chuyển quỹ" && (
          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Từ Quỹ</label>
            <select 
              value={sourceFund} 
              onChange={e => setSourceFund(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-medium outline-none focus:border-indigo-500"
            >
              {funds.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        )}

        {type === "Chuyển quỹ" && <MoveRight className="text-slate-400 hidden md:block shrink-0 mt-5" />}

        {(type === "Thu nhập" || type === "Chuyển quỹ") && (
          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Đến Quỹ</label>
            <select 
              value={destinationFund} 
              onChange={e => setDestinationFund(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-medium outline-none focus:border-indigo-500"
            >
              {funds.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">Mô tả / Ghi chú</label>
        <input 
          type="text" 
          value={note}
          onChange={e => setNote(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          placeholder="Ví dụ: Lương đổ về, Trả tiền netflix..."
        />
      </div>

      {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

      <button 
        type="submit" 
        disabled={loading}
        className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3.5 px-6 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
      >
        {loading ? <Loader2 className="animate-spin" /> : "Lưu Giao dịch"}
      </button>

    </form>
  );
}
