import React from 'react';
import { Download, BarChart3, Grid } from 'lucide-react';
import { cn } from '../../utils';
import { Button } from '../ui/Button';

interface Props {
  viewMode: 'dashboard' | 'heatmap';
  setViewMode: (mode: 'dashboard' | 'heatmap') => void;
  filters: {
    year: string;
    month: string;
    team: string;
  };
  onFiltersChange: (filters: { year: string; month: string; team: string }) => void;
  uniqueYears: string[];
  uniqueMonths: string[];
  uniqueTeams: string[];
  onExport: () => void;
}

export function FilterBar({
  viewMode,
  setViewMode,
  filters,
  onFiltersChange,
  uniqueYears,
  uniqueMonths,
  uniqueTeams,
  onExport
}: Props) {
  const { year: selectedYear, month: selectedMonth, team: selectedTeam } = filters;

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit shadow-inner">
        <button 
          onClick={() => setViewMode('dashboard')} 
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", 
            viewMode === 'dashboard' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <BarChart3 size={18} /> 产能分析看板
        </button>
        <button 
          onClick={() => setViewMode('heatmap')} 
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", 
            viewMode === 'heatmap' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Grid size={18} /> 全局产能热力图
        </button>
      </div>

      {/* Header Controls */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-500">年份</span>
              <select 
                value={selectedYear}
                onChange={(e) => {
                  onFiltersChange({
                    ...filters,
                    year: e.target.value,
                    month: 'all'
                  });
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20"
              >
                <option value="all">全部年份</option>
                {uniqueYears.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
            </div>
            
            {viewMode === 'dashboard' && (
              <>
                <div className={cn("flex items-center gap-2 transition-opacity", selectedTeam !== 'all' && "opacity-50")}>
                  <span className="text-sm font-bold text-slate-500">月份</span>
                  <select 
                    value={selectedMonth}
                    onChange={(e) => {
                      const val = e.target.value;
                      onFiltersChange({
                        ...filters,
                        month: val,
                        team: val !== 'all' ? 'all' : filters.team
                      });
                    }}
                    disabled={selectedTeam !== 'all'}
                    className={cn(
                      "bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 transition-all",
                      selectedTeam !== 'all' ? "cursor-not-allowed" : "hover:border-slate-300"
                    )}
                  >
                    <option value="all">全部月份</option>
                    {uniqueMonths.map(m => (
                      <option key={m} value={m}>
                        {selectedYear !== 'all' ? m.replace(/\d+年/, '') : m}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className={cn("flex items-center gap-2 ml-4 transition-opacity", selectedMonth !== 'all' && "opacity-50")}>
                  <span className="text-sm font-bold text-slate-500">班组</span>
                  <select 
                    value={selectedTeam}
                    onChange={(e) => {
                      const val = e.target.value;
                      onFiltersChange({
                        ...filters,
                        team: val,
                        month: val !== 'all' ? 'all' : filters.month
                      });
                    }}
                    disabled={selectedMonth !== 'all'}
                    className={cn(
                      "bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-red/20 transition-all",
                      selectedMonth !== 'all' ? "cursor-not-allowed" : "hover:border-slate-300"
                    )}
                  >
                    <option value="all">全部班组</option>
                    {uniqueTeams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={onExport}
            icon={<Download size={16} />}
            className="px-6 py-2 rounded-full"
          >
            导出结果
          </Button>
        </div>
      </div>
    </div>
  );
}
