import React from 'react';
import { Activity, Users, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn, formatNumber } from '../../utils';

interface Props {
  activeData: any[];
  selectedYear: string;
  onRowClick: (data: any) => void;
  viewMode: 'dashboard' | 'heatmap';
}

export function AnalysisTable({ activeData, selectedYear, onRowClick, viewMode }: Props) {
  if (viewMode === 'heatmap') return null;

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Activity size={18} />
          </div>
          <h3 className="font-bold text-slate-800">产能负荷明细</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500">正常 (&lt;90%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-500">预警 (90-120%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-slate-500">超负荷 (&gt;120%)</span>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr>
              <th rowSpan={2} className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">月份</th>
              <th rowSpan={2} className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">班组</th>
              <th rowSpan={2} className="py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right border-l border-slate-200">需求工时 (H)</th>
              <th colSpan={2} className="py-2 px-6 text-[11px] font-bold text-indigo-600 uppercase tracking-wider text-center border-l border-slate-200 bg-indigo-50/30">
                <div className="flex items-center justify-center gap-2">
                  <Users size={14} /> 人力
                </div>
              </th>
              <th colSpan={2} className="py-2 px-6 text-[11px] font-bold text-amber-600 uppercase tracking-wider text-center border-l border-slate-200 bg-amber-50/30">
                <div className="flex items-center justify-center gap-2">
                  <Cpu size={14} /> 设备
                </div>
              </th>
            </tr>
            <tr className="border-t border-slate-100">
              <th className="py-2 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right border-l border-slate-200 bg-indigo-50/10">可用产能(H)</th>
              <th className="py-2 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center bg-indigo-50/10">负荷率</th>
              <th className="py-2 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right border-l border-slate-200 bg-amber-50/10">可用产能(H)</th>
              <th className="py-2 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center bg-amber-50/10">负荷率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {activeData.length > 0 ? activeData.map((item, idx) => (
              <tr 
                key={`${item.month}-${item.team}-${idx}`} 
                className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                onClick={() => onRowClick({ name: item.team, originalMonth: item.month })}
              >
                <td className="py-4 px-6 text-sm font-medium text-slate-600">
                  {selectedYear !== 'all' ? item.month.replace(/\d+年/, '') : item.month}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="text-sm font-bold text-slate-800">{item.team}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-slate-600 text-right border-l border-slate-100 font-mono font-semibold bg-slate-50/20">
                  {formatNumber(item.human.load)}
                </td>
                <td className="py-4 px-6 text-sm text-slate-600 text-right border-l border-slate-100 font-mono">{formatNumber(item.human.capacity)}</td>
                <td className="py-4 px-6 text-center">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                    item.human.utilization > 120 ? "bg-red-50 text-red-600" :
                    item.human.utilization > 90 ? "bg-amber-50 text-amber-600" :
                    "bg-emerald-50 text-emerald-600"
                  )}>
                    {item.human.utilization > 120 ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                    {formatNumber(item.human.utilization)}%
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-slate-600 text-right border-l border-slate-100 font-mono">{formatNumber(item.machine.capacity)}</td>
                <td className="py-4 px-6 text-center">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                    item.machine.utilization > 120 ? "bg-red-50 text-red-600" :
                    item.machine.utilization > 90 ? "bg-amber-50 text-amber-600" :
                    "bg-emerald-50 text-emerald-600"
                  )}>
                    {item.machine.utilization > 120 ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                    {formatNumber(item.machine.utilization)}%
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                  暂无符合条件的月度分析数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
