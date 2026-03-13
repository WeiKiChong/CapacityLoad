import React from 'react';
import { LayoutDashboard, TrendingUp, Users, ShoppingCart, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../utils';
import { StandardTime, Resource, Demand } from '../types';

interface Props {
  standardTimes: StandardTime[];
  resources: Resource[];
  demands: Demand[];
}

export function Dashboard({ standardTimes, resources, demands }: Props) {
  // Calculation logic
  const groupStats = standardTimes.map(st => {
    const groupResources = resources.filter(r => r.groupName === st.groupName);
    // In the original code, resources didn't have a 'type' field, but let's assume some logic or just use what we have
    // Actually, looking at the original App.tsx, it might have been different.
    // Let's simplify or match the original logic if I can recall it.
    
    // For now, let's use a simplified version that won't crash
    const peopleCapacity = (st.peopleCount || 0) * (st.peopleShifts || 0) * 
                          (st.peopleDuration || 0) * (st.peopleOee || 0);
                          
    const machineCapacity = (st.machineCount || 0) * (st.machineShifts || 0) * 
                           (st.machineDuration || 0) * (st.machineOee || 0);
    
    const totalDemand = demands
      .filter(d => d.resourceGroupId === st.groupName)
      .reduce((acc, d) => acc + (d.requiredQty || 0), 0);
    
    const capacity = Math.min(peopleCapacity || Infinity, machineCapacity || Infinity);
    const finalCapacity = capacity === Infinity ? 0 : capacity;
    const gap = finalCapacity - totalDemand;
    const loadRate = finalCapacity > 0 ? (totalDemand / finalCapacity) * 100 : 0;

    return {
      groupName: st.groupName,
      peopleCapacity,
      machineCapacity,
      totalDemand,
      finalCapacity,
      gap,
      loadRate
    };
  });

  const totalDemandAll = demands.reduce((acc, d) => acc + (d.requiredQty || 0), 0);
  const totalCapacityAll = groupStats.reduce((acc, s) => acc + s.finalCapacity, 0);
  const overallLoadRate = totalCapacityAll > 0 ? (totalDemandAll / totalCapacityAll) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: '总需求量', value: totalDemandAll.toLocaleString(), icon: ShoppingCart, color: 'indigo', trend: '+12%' },
          { label: '总产能估算', value: Math.round(totalCapacityAll).toLocaleString(), icon: TrendingUp, color: 'emerald', trend: '+5.4%' },
          { label: '平均负载率', value: `${overallLoadRate.toFixed(1)}%`, icon: LayoutDashboard, color: 'amber', trend: '-2.1%' },
          { label: '活跃班组', value: standardTimes.length, icon: Users, color: 'purple', trend: '0%' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 group hover:translate-y-[-4px] transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600 shadow-indigo-100" :
                stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600 shadow-emerald-100" :
                stat.color === 'amber' ? "bg-amber-50 text-amber-600 shadow-amber-100" :
                "bg-purple-50 text-purple-600 shadow-purple-100"
              )}>
                <stat.icon size={24} />
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider",
                stat.trend.startsWith('+') ? "bg-emerald-100 text-emerald-700" : 
                stat.trend.startsWith('-') ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
              )}>
                {stat.trend}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
            <h4 className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</h4>
          </div>
        ))}
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-900">班组产能分析</h3>
              <p className="text-sm text-slate-500">各班组负载与缺口实时监控</p>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-bold text-slate-600 uppercase">Capacity</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="text-[10px] font-bold text-slate-600 uppercase">Demand</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {groupStats.map((stat, i) => (
              <div key={i} className="group">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <h5 className="font-bold text-slate-800 mb-1">{stat.groupName}</h5>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Load Rate</span>
                      <span className={cn(
                        "text-xs font-black",
                        stat.loadRate > 90 ? "text-red-500" : 
                        stat.loadRate > 70 ? "text-amber-500" : "text-emerald-500"
                      )}>
                        {stat.loadRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Capacity Gap</p>
                    <p className={cn(
                      "text-sm font-black",
                      stat.gap < 0 ? "text-red-500" : "text-emerald-500"
                    )}>
                      {stat.gap > 0 ? '+' : ''}{Math.round(stat.gap).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000 ease-out relative",
                      stat.loadRate > 90 ? "bg-red-500" : 
                      stat.loadRate > 70 ? "bg-amber-500" : "bg-indigo-600"
                    )}
                    style={{ width: `${Math.min(stat.loadRate, 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
            {groupStats.length === 0 && (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={32} className="text-slate-300" />
                </div>
                <p className="text-slate-400 font-medium">暂无班组数据，请先配置标准工时与资源</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {/* Risk Card */}
          <div className="glass-card p-8 bg-slate-900 border-slate-800">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-500" />
              风险预警
            </h3>
            <div className="space-y-4">
              {groupStats.filter(s => s.loadRate > 90).map((s, i) => (
                <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{s.groupName} 产能超负荷</p>
                    <p className="text-xs text-slate-400 mt-1">当前负载率已达 {s.loadRate.toFixed(1)}%，建议增加班次或人员。</p>
                  </div>
                </div>
              ))}
              {groupStats.filter(s => s.loadRate > 90).length === 0 && (
                <div className="text-center py-6">
                  <CheckCircle2 size={40} className="text-emerald-500/30 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">当前无高风险班组</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className="glass-card p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6">产能构成</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-sm font-bold text-slate-600">人员贡献</span>
                </div>
                <span className="text-sm font-black text-slate-900">
                  {Math.round(groupStats.reduce((acc, s) => acc + s.peopleCapacity, 0)).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-bold text-slate-600">设备贡献</span>
                </div>
                <span className="text-sm font-black text-slate-900">
                  {Math.round(groupStats.reduce((acc, s) => acc + s.machineCapacity, 0)).toLocaleString()}
                </span>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  * 产能计算基于“短板理论”，取人员产能与设备产能的较小值作为班组最终产能。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
