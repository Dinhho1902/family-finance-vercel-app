"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { fmtVND, fmtCompact } from "@/lib/utils";
import { useEffect, useState } from 'react';

type DataPoint = { name: string; value: number; color: string };

export default function AllocationChart({ data }: { data: DataPoint[] }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.32;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central" fontSize={11} fontWeight={600}>
        {name}: {Math.round(percent * 100)}% ({fmtCompact(value)})
      </text>
    );
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
        {payload.map((entry: any, i: number) => {
          const d = data[i];
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
              <span className="text-[11px] text-slate-600 font-medium">
                {entry.value} <span className="text-slate-400">{pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="w-full">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={78}
                paddingAngle={4} dataKey="value">
                {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
              </Pie>
              <Tooltip
                formatter={(value: number) => fmtVND(value)}
                contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: 12 }}
              />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[350px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="45%" innerRadius={60} outerRadius={90}
            paddingAngle={5} dataKey="value" label={renderCustomLabel}
            labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
          </Pie>
          <Tooltip
            formatter={(value: number) => fmtVND(value)}
            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
          />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
