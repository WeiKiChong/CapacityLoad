import React from 'react';
import { Users, Cpu } from 'lucide-react';
import { cn, formatNumber } from '../../utils';

interface Props {
  heatmapData: {
    months: string[];
    teams: string[];
    matrix: Record<string, Record<string, any>>;
  };
  heatmapCategory: 'human' | 'machine';
  setHeatmapCategory: (category: 'human' | 'machine') => void;
}

export function HeatmapView({ heatmapData, heatmapCategory, setHeatmapCategory }: Props) {
  const { months, teams, matrix } = heatmapData;

  if (months.length === 0 || teams.length === 0) {
    return <div className="h-[400px] flex items-center justify-center text-slate-400">暂无数据</div>;
  }

  const getCellColor = (utilization: number) => {
    if (utilization === 0) return 'bg-slate-50 text-slate-400';
    if (utilization < 90) return 'bg-emerald-100 text-emerald-700';
    if (utilization <= 120) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700 font-bold shadow-sm ring-1 ring-red-200';
  };

  return (
    <div className="space-y-4">
      {/* Heatmap Category Toggle */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg w-fit mb-4">
        <button
          onClick={() => setHeatmapCategory('human')}
          className={cn(
            "px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
            heatmapCategory === 'human' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:bg-white/50"
          )}
        >
          <Users size={14} /> 人力负荷
        </button>
        <button
          onClick={() => setHeatmapCategory('machine')}
          className={cn(
            "px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
            heatmapCategory === 'machine' ? "bg-white text-amber-600 shadow-sm" : "text-slate-500 hover:bg-white/50"
          )}
        >
          <Cpu size={14} /> 设备负荷
        </button>
      </div>

      <div className="overflow-x-auto custom-scrollbar pb-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 text-left font-bold text-slate-500 border-b border-slate-200 min-w-[120px] sticky left-0 bg-white z-10">班组 \ 月份</th>
              {months.map(m => (
                <th key={m} className="p-3 text-center font-bold text-slate-500 border-b border-slate-200 min-w-[100px]">
                  {m.replace(/\d+年/, '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map(team => (
              <tr key={team} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="p-3 font-bold text-slate-700 sticky left-0 bg-white/90 backdrop-blur-sm z-10">{team}</td>
                {months.map(month => {
                  const cell = matrix[team][month][heatmapCategory];
                  return (
                    <td key={month} className="p-2">
                      <div 
                        className={cn("h-10 rounded-md flex items-center justify-center text-sm transition-all hover:scale-105 cursor-default", getCellColor(cell.utilization))} 
                        title={`需求: ${formatNumber(cell.load)}h\n产能: ${formatNumber(cell.capacity)}h`}
                      >
                        {cell.utilization > 0 ? `${cell.utilization.toFixed(1)}%` : '-'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
