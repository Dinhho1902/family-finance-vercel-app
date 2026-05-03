"use client";

import { useEffect, useState } from "react";
import { Saving, Investment, Fund, Gold, Transaction } from "@/lib/supabase";
import StatusGrid from "@/components/dashboard/StatusGrid";
import AllocationChart from "@/components/dashboard/AllocationChart";
import GoalProgress from "@/components/dashboard/GoalProgress";
import RecentActivity from "@/components/dashboard/RecentActivity";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/sheets?resource=dashboard&limit=5');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Logic tính toán lãi dồn tích
  const today = new Date();
  const funds = data?.funds ?? [];
  const investments = data?.investments ?? [];
  const savings = data?.savings ?? [];
  const transactions = data?.transactions ?? [];
  const gold = data?.gold ?? [];

  const totalAccruedInterest = savings.reduce((acc: number, sav: Saving) => {
    const start = new Date(sav.startDate);
    if (isNaN(start.getTime())) return acc;
    const diffDays = Math.max(0, (today.getTime() - start.getTime()) / (1000 * 3600 * 24));
    return acc + Math.round(sav.principal * (sav.interestRate / 100) * (diffDays / 365.25));
  }, 0);

  const totalInvestValue = investments.reduce((acc: number, curr: Investment) => acc + (curr.quantity * curr.currentPrice), 0);
  const totalSavingsPrincipal = savings.reduce((acc: number, curr: Saving) => acc + curr.principal, 0);
  const totalGoldValue = gold.reduce((acc: number, curr: Gold) => acc + (curr.quantity * curr.currentPrice), 0);

  const totalFundsBalance = funds.reduce((acc: number, curr: Fund) => acc + curr.currentBalance, 0);
  const netWorth = totalFundsBalance + totalAccruedInterest;

  const availableCash = Math.max(0, totalFundsBalance - totalInvestValue - totalSavingsPrincipal - totalGoldValue);

  const stockInvestments = investments.filter((i: Investment) => i.asset !== 'Tiền chưa giải ngân');
  const totalInvestmentProfit = stockInvestments.reduce((acc: number, curr: Investment) => acc + (curr.quantity * (curr.currentPrice - curr.avgPrice)), 0);

  // Background Snapshot Saving
  useEffect(() => {
    if (data && netWorth > 0) {
      fetch('/api/sheets?resource=snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total: netWorth, invest: totalInvestValue, savings: totalSavingsPrincipal, gold: totalGoldValue, cash: availableCash })
      }).catch(console.error);
    }
  }, [data, netWorth, totalInvestValue, totalSavingsPrincipal, totalGoldValue, availableCash]);

  if (isLoading || !data) {
    return <div className="max-w-7xl mx-auto p-10 text-center text-slate-500 animate-pulse">Đang tải dữ liệu...</div>;
  }

  const chartData = [
    { name: 'Đầu tư', value: totalInvestValue, color: '#10b981' },
    { name: 'Tiết kiệm', value: totalSavingsPrincipal, color: '#6366f1' },
    { name: 'Vàng', value: totalGoldValue, color: '#f59e0b' },
    { name: 'Tiền mặt', value: availableCash, color: '#94a3b8' }
  ].filter(d => d.value > 0);

  const goals = funds
    .filter((f: Fund) => !!f.goalAmount && (f.goalAmount > 0))
    .map((f: Fund) => ({
      name: f.fundName,
      current: f.currentBalance,
      goal: f.goalAmount!
    }));


  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 pb-4 md:px-10 md:pt-10 space-y-4 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-medium mt-0.5 hidden md:block">Bức tranh tài sản của bạn</p>
        </div>
        <div className="text-xs text-slate-400 bg-white border border-slate-100 rounded-full px-3 py-1.5 shadow-sm">
          {new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
      </header>

      {/* 3 Key Stats */}
      <StatusGrid
        netWorth={netWorth}
        investmentProfit={totalInvestmentProfit}
        accruedInterest={totalAccruedInterest}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Main Chart Section */}
        <section className="lg:col-span-2 bg-white rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-amber-400"></div>
          <h3 className="text-base md:text-xl font-bold text-slate-800 mb-0.5 self-start">Phân bổ Tài sản</h3>
          <p className="text-xs text-slate-400 mb-2 self-start">Tỷ trọng các lớp tài sản</p>
          <AllocationChart data={chartData} />
        </section>

        {/* Action / Mini Info */}
        <section className="space-y-4 md:space-y-8">
          <GoalProgress goals={goals} />
          <div className="bg-gradient-to-br from-indigo-600 to-blue-800 rounded-2xl md:rounded-3xl p-4 md:p-8 text-white shadow-xl">
            <h4 className="font-bold text-sm md:text-lg mb-1.5">Lời khuyên hôm nay</h4>
            <p className="text-indigo-100 text-xs md:text-sm leading-relaxed opacity-90">
              {netWorth > 100000000 ? "Tài sản đang tăng trưởng tốt. Cân nhắc tái phân bổ lợi nhuận vào quỹ dự phòng." :
               "Duy trì kỷ luật phân bổ hàng tháng để sớm đạt mục tiêu tài chính."}
            </p>
          </div>
        </section>
      </div>

      {/* Bottom Section: Transactions */}
      <RecentActivity transactions={transactions} />
    </div>
  );
}
