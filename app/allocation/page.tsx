"use client";

import { useEffect, useState } from "react";
import { Fund, Investment, Saving, Gold, AllocationRecord, HistoryPoint } from "@/lib/supabase";
import AllocationManager from "./AllocationManager";

export default function AllocationPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/sheets?resource=allocation-page');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Error loading allocation data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading || !data) {
    return <div className="max-w-7xl mx-auto p-10 text-center text-slate-500 animate-pulse">Đang tải cấu trúc phân bổ từ Google Sheets...</div>;
  }

  const { funds, investments, savings, gold, allocationHistory, historyData } = data;

  // Tính tổng tài sản để AI tham khảo
  const totalInvestValue = investments.reduce((acc: number, curr: Investment) => acc + (curr.quantity * curr.currentPrice), 0);
  const totalSavingsPrincipal = savings.reduce((acc: number, curr: Saving) => acc + curr.principal, 0);
  const totalGoldValue = gold.reduce((acc: number, curr: Gold) => acc + (curr.quantity * curr.currentPrice), 0);

  // Tính lãi dự thu
  const today = new Date();
  const totalAccruedInterest = savings.reduce((acc: number, curr: Saving) => {
    const start = new Date(curr.startDate);
    if (isNaN(start.getTime())) return acc;
    const diffDays = Math.max(0, (today.getTime() - start.getTime()) / (1000 * 3600 * 24));
    return acc + Math.round(curr.principal * (curr.interestRate / 100) * (diffDays / 365.25));
  }, 0);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-4">
        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 tracking-tight">
          Phân bổ Tài chính
        </h1>
        <p className="text-slate-500 font-medium">AI phân bổ theo thứ tự ưu tiên: <span className="text-rose-500 font-semibold">quỹ sắp đến hạn</span> → <span className="text-amber-500 font-semibold">quỹ tiết kiệm &amp; vàng</span> → <span className="text-indigo-500 font-semibold">các quỹ còn lại</span>. Mỗi quỹ được nạp tối đa theo chỉ tiêu tháng, phần dư tự động chuyển sang quỹ tiếp theo.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-rose-500 uppercase tracking-wide mb-1">Khẩn cấp</p>
            <p className="text-sm text-rose-800 font-semibold">Deadline ≤ 30 ngày</p>
            <p className="text-xs text-rose-600 mt-1">Ưu tiên tuyệt đối. Điền quỹ còn thiếu ít nhất trước, nếu hết tiền thì ưu tiên gần deadline nhất.</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wide mb-1">Tiết kiệm &amp; Vàng</p>
            <p className="text-sm text-amber-800 font-semibold">Nền tảng tài chính</p>
            <p className="text-xs text-amber-600 mt-1">Quỹ tiết kiệm cần đạt tối thiểu 6 lần thu nhập trung bình/tháng. Vàng duy trì mục tiêu 15%.</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-1">Quỹ thông thường</p>
            <p className="text-sm text-indigo-800 font-semibold">Deadline &gt; 30 ngày</p>
            <p className="text-xs text-indigo-600 mt-1">Điền theo thứ tự gap nhỏ nhất. Mỗi quỹ bị giới hạn bởi chỉ tiêu tháng.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Chứng khoán</p>
            <p className="text-sm text-slate-800 font-semibold">Nhận phần dư</p>
            <p className="text-xs text-slate-500 mt-1">Chỉ nhận tiền sau khi tất cả các quỹ khác đã được xử lý xong.</p>
          </div>
        </div>
      </header>

      <AllocationManager 
        funds={funds}
        investments={totalInvestValue}
        savings={totalSavingsPrincipal}
        gold={totalGoldValue}
        accruedInterest={totalAccruedInterest}
        allocationHistory={allocationHistory}
        historyData={historyData}
      />
    </div>
  );
}

