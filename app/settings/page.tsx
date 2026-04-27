"use client";

import { useEffect, useState } from "react";
import FundManager from "./FundManager";

export default function SettingsPage() {
  const [funds, setFunds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sheets?resource=funds').then(r => r.json()).then(setFunds).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="p-10 text-center animate-pulse text-slate-500">Đang tải...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in slide-in-from-right-8 fade-in duration-500 min-h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 to-indigo-600">
          Quản lý quỹ
        </h1>
        <p className="text-slate-500 mt-2">Thiết lập và theo dõi tiến độ các hũ tài chính của gia đình.</p>
      </header>

      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 min-h-[500px] overflow-hidden p-6 md:p-8">
        <FundManager initialFunds={funds} />
      </section>
    </div>
  );
}

