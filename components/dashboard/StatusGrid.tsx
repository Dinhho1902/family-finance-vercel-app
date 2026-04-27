import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { fmtNum } from "@/lib/utils";

export default function StatusGrid({
  netWorth,
  investmentProfit,
  accruedInterest,
}: {
  netWorth: number;
  investmentProfit: number;
  accruedInterest: number;
}) {
  const isProfit = investmentProfit >= 0;

  return (
    <div className="space-y-3">
      {/* Hero — net worth */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Wallet size={14} className="text-white" />
          </div>
          <span className="text-indigo-200 text-xs font-semibold tracking-wide uppercase">Tổng Tài Sản</span>
        </div>
        <p className="text-2xl font-black tracking-tight leading-none mt-2">
          {fmtNum(netWorth)}
          <span className="text-base font-semibold text-indigo-300 ml-1">VND</span>
        </p>
      </div>

      {/* Two secondary stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Investment profit */}
        <div className={`rounded-2xl p-4 ${isProfit ? "bg-emerald-50" : "bg-rose-50"}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className={`p-1 rounded-lg ${isProfit ? "bg-emerald-100" : "bg-rose-100"}`}>
              {isProfit
                ? <TrendingUp size={13} className="text-emerald-600" />
                : <TrendingDown size={13} className="text-rose-600" />}
            </div>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${isProfit ? "text-emerald-600" : "text-rose-500"}`}>
              Lợi nhuận ĐT
            </span>
          </div>
          <p className={`text-base font-black leading-none ${isProfit ? "text-emerald-700" : "text-rose-600"}`}>
            {isProfit ? "+" : ""}{fmtNum(investmentProfit)}
            <span className="text-xs font-semibold ml-0.5">VND</span>
          </p>
          <p className={`text-[10px] mt-0.5 font-medium ${isProfit ? "text-emerald-500" : "text-rose-400"}`}>
            {isProfit ? "Đang tăng trưởng" : "Đang sụt giảm"}
          </p>
        </div>

        {/* Accrued interest */}
        <div className="bg-amber-50 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 bg-amber-100 rounded-lg">
              <PiggyBank size={13} className="text-amber-600" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
              Lãi dự thu
            </span>
          </div>
          <p className="text-base font-black leading-none text-amber-700">
            +{fmtNum(accruedInterest)}
            <span className="text-xs font-semibold text-amber-600 ml-0.5">VND</span>
          </p>
          <p className="text-[10px] mt-0.5 font-medium text-amber-500">Đang sinh lời</p>
        </div>
      </div>
    </div>
  );
}
