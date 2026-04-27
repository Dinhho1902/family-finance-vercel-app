"use client";

import { useEffect, useState } from "react";
import GoldManager from "./GoldManager";

export default function GoldPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/sheets?resource=gold');
        const json = await res.json();
        const settingsRes = await fetch('/api/sheets?resource=settings');
        const settings = await settingsRes.json();
        setData({ gold: json, lastSync: settings['last_gold_sync'] || null });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading || !data) return <div className="p-10 text-center animate-pulse text-slate-500">Đang tải dữ liệu vàng...</div>;

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-10">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Quản lý Vàng Vật Chất</h1>
        <p className="text-slate-500 mt-1">Sổ tay theo dõi tích lũy vàng nhẫn, vàng miếng và trang sức.</p>
      </header>

      <GoldManager initialGold={data.gold} lastSync={data.lastSync} />
    </main>
  );
}
