"use client";

import { useEffect, useState } from "react";
import InvestmentManager from "./InvestmentManager";
import SyncButton from "./SyncButton";

export default function InvestmentsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/sheets?resource=investments');
        const json = await res.json();
        setData({ investments: json.investments, lastSync: json.settings?.['last_investment_sync'] || null });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading || !data) return <div className="p-10 text-center animate-pulse text-slate-500">Đang tải biểu đồ đầu tư...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-500">
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-800 to-emerald-500">
            Quỹ Chứng Khoán
          </h1>
          <p className="text-slate-500 mt-2">Theo dõi tài sản tăng trưởng hàng ngày.</p>
        </div>
        <SyncButton lastSync={data.lastSync} />
      </header>
      
      <InvestmentManager initialInvestments={data.investments} />
    </div>
  );
}
