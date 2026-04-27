import { Transaction } from "@/lib/google-sheets";
import { ArrowLeftRight, TrendingDown, TrendingUp } from "lucide-react";
import { fmtNum } from "@/lib/utils";

export default function RecentActivity({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 border border-slate-100 shadow-sm">
      <h3 className="text-sm md:text-lg font-bold text-slate-800 mb-3 md:mb-6">Giao dịch gần đây</h3>
      <div className="space-y-1 md:space-y-4">
        {transactions.map((t, idx) => (
          <div key={idx} className="flex items-center justify-between px-2 py-2.5 md:p-4 hover:bg-slate-50 rounded-xl md:rounded-2xl transition-colors">
            <div className="flex items-center gap-2 md:gap-4 min-w-0">
              <div className={`p-2 rounded-xl flex-shrink-0 ${
                t.type.includes('Phân bổ') ? 'bg-indigo-50 text-indigo-600' :
                t.type.includes('Thu nhập') ? 'bg-emerald-50 text-emerald-600' :
                'bg-slate-50 text-slate-600'
              }`}>
                {t.type.includes('Phân bổ') ? <ArrowLeftRight size={16} /> :
                 t.type.includes('Thu nhập') ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-xs md:text-sm truncate">{t.note || t.type}</p>
                <p className="text-[10px] text-slate-400">{t.date}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <p className={`font-bold text-xs md:text-sm ${t.amount >= 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                {t.amount >= 0 ? '+' : ''}{fmtNum(t.amount)}đ
              </p>
              <p className="text-[9px] text-slate-400 truncate max-w-[80px] md:max-w-none">{t.destinationFund || t.sourceFund}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
