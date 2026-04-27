import { fmtNum } from "@/lib/utils";

type GoalFund = {
  name: string;
  current: number;
  goal: number;
};

export default function GoalProgress({ goals }: { goals: GoalFund[] }) {
  if (goals.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 border border-slate-100 shadow-sm">
      <h3 className="text-sm md:text-lg font-bold text-slate-800 mb-3 md:mb-6">Tiến độ Mục tiêu</h3>
      <div className="space-y-3 md:space-y-6">
        {goals.map((g, idx) => {
          const percent = Math.min(100, Math.round((g.current / g.goal) * 100));
          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="font-bold text-slate-700 truncate pr-2">{g.name}</span>
                <span className="text-slate-500 flex-shrink-0">{percent}%</span>
              </div>
              <div className="h-2 md:h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full transition-all duration-1000"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] md:text-[10px] text-slate-400 font-medium">
                <span>{fmtNum(g.current)} đ</span>
                <span>/ {fmtNum(g.goal)} đ</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
