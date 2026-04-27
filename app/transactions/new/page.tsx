"use client";

import { useEffect, useState } from "react";
import TransactionForm from "./TransactionForm";

export default function NewTransactionPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?resource=funds').then(r => r.json()).then(setFunds).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="p-10 text-center animate-pulse text-slate-500">Đang tải biểu mẫu...</div>;

  const fundNames = funds.map(f => f.fundName);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 animate-in slide-in-from-bottom-8 fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-800 to-indigo-500">
          Ghi chép Giao dịch
        </h1>
        <p className="text-slate-500 mt-2">Ghi nhận các khoản thu, chi hoặc biến động dòng tiền.</p>
      </header>

      <section className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-100 border border-slate-100 text-slate-800">
        {fundNames.length === 0 ? (
          <div className="p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
            Hãy tạo ít nhất 1 quỹ trong Google Sheets để có thể ghi chép giao dịch nhé!
          </div>
        ) : (
          <TransactionForm funds={fundNames} />
        )}
      </section>
    </div>
  );
}
