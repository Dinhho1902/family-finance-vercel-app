"use client";

import { useEffect, useState } from "react";
import SavingsManager from "./SavingsManager";

export default function SavingsPage() {
  const [savings, setSavings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?resource=savings').then(r => r.json()).then(setSavings).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="p-10 text-center animate-pulse text-slate-500">Đang tải dữ liệu tiết kiệm...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-500">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-800 to-blue-500">
            Sổ Tiết Kiệm
          </h1>
          <p className="text-slate-500 mt-2">Quản lý dòng tiền gửi tích lũy và lãi suất.</p>
        </div>
      </header>
      
      <SavingsManager initialSavings={savings} />
    </div>
  );
}
