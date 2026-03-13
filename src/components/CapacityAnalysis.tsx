import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Line, ComposedChart, Cell
} from 'recharts';
import ExcelJS from 'exceljs';
import { Clock, Database, Activity, Download, Calendar, Users, Cpu, AlertTriangle, CheckCircle2, BarChart3, TrendingUp, Grid, Save, X } from 'lucide-react';
import { formatNumber, cn, sortTeams } from '../utils';
import { AnalysisResult, ProductionDemand, ProductionResource, SystemSettings } from '../types';

interface Props {
  data: AnalysisResult;
  demands: ProductionDemand[];
  resources: ProductionResource[];
  settings?: SystemSettings;
  filters: {
    year: string;
    month: string;
    team: string;
  };
  onFiltersChange: (filters: { year: string; month: string; team: string }) => void;
}

export default function CapacityAnalysis({ data, demands, resources, settings, filters, onFiltersChange }: Props) {
  const [viewMode, setViewMode] = useState<'dashboard' | 'heatmap'>('dashboard');
  const [heatmapCategory, setHeatmapCategory] = useState<'human' | 'machine'>('human');
  const [selectedBarData, setSelectedBarData] = useState<{ team: string, month: string } | null>(null);

  const { year: selectedYear, month: selectedMonth, team: selectedTeam } = filters;

  // Handle chart click is now handled directly on the Bar component

  const topDemands = useMemo(() => {
    if (!selectedBarData) return [];

    const { team: targetTeam, month: targetMonth } = selectedBarData;
    
    const resourceMap = new Map<string, ProductionResource>();
    resources.forEach(r => resourceMap.set(r.id, r));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Deduplicate demands by orderNo and opNo, keeping only the first occurrence
    const uniqueDemands: ProductionDemand[] = [];
    const seenOrderOp = new Set<string>();
    
    demands.forEach(demand => {
      const key = `${demand.orderNo}_${demand.opNo}`;
      if (!seenOrderOp.has(key)) {
        seenOrderOp.add(key);
        uniqueDemands.push(demand);
      }
    });

    const processedDemands = uniqueDemands.map(demand => {
      if (!demand.dueDate) return null;
      
      const dueDate = new Date(demand.dueDate);
      const uncompletedQty = demand.requiredQty - demand.completedQty - (demand.rejectedQty || 0);
      
      let targetDate = dueDate;
      if (uncompletedQty > 0) {
        const demandDate = new Date(dueDate);
        demandDate.setHours(0, 0, 0, 0);
        if (demandDate.getTime() < todayTime) {
          targetDate = today;
        }
      }

      const resource = resourceMap.get(demand.resourceGroupId);
      const demandTeam = resource ? (resource.team || '其他').trim() : '其他';
      
      const actualHours = uncompletedQty <= 0 ? 0 : demand.actualHours;
      const pendingHours = (uncompletedQty * actualHours) / 60;

      const monthStr = `${targetDate.getFullYear()}年${(targetDate.getMonth() + 1).toString().padStart(2, '0')}月`;

      return {
        ...demand,
        demandTeam,
        monthStr,
        pendingHours,
        uncompletedQty
      };
    }).filter(Boolean) as (ProductionDemand & { demandTeam: string, monthStr: string, pendingHours: number, uncompletedQty: number })[];

    const filtered = processedDemands.filter(d => {
      const teamMatch = targetTeam === 'all' || d.demandTeam === targetTeam;
      const monthMatch = targetMonth === 'all' || d.monthStr === targetMonth;
      return teamMatch && monthMatch && d.pendingHours > 0;
    });

    return filtered.sort((a, b) => b.pendingHours - a.pendingHours).slice(0, 10);
  }, [selectedBarData, demands, resources]);

  const setSelectedYear = (year: string) => onFiltersChange({ ...filters, year });
  const setSelectedMonth = (month: string) => onFiltersChange({ ...filters, month });
  const setSelectedTeam = (team: string) => onFiltersChange({ ...filters, team });

  // Extract unique years from data
  const uniqueYears = useMemo(() => {
    return Array.from(new Set(data.monthlyTeamData.map(d => d.month.substring(0, 4)))).sort();
  }, [data.monthlyTeamData]);

  // Base data filtered by year (applies to all views)
  const yearFilteredData = useMemo(() => {
    return data.monthlyTeamData.filter(d => selectedYear === 'all' || d.month.startsWith(`${selectedYear}年`));
  }, [data.monthlyTeamData, selectedYear]);

  // Extract unique months based on selected year
  const uniqueMonths = useMemo(() => {
    return Array.from(new Set(yearFilteredData.map(d => d.month))).sort();
  }, [yearFilteredData]);

  // Extract unique teams
  const uniqueTeams = useMemo(() => {
    return sortTeams(Array.from(new Set(data.monthlyTeamData.map(d => d.team))), settings?.teamOrder);
  }, [data.monthlyTeamData, settings?.teamOrder]);

  // Validate and reset filters if they don't exist in current data
  useEffect(() => {
    let changed = false;
    const newFilters = { ...filters };

    if (selectedYear !== 'all' && !uniqueYears.includes(selectedYear)) {
      newFilters.year = 'all';
      changed = true;
    }
    
    if (selectedMonth !== 'all' && !uniqueMonths.includes(selectedMonth)) {
      newFilters.month = 'all';
      changed = true;
    }

    if (selectedTeam !== 'all' && !uniqueTeams.includes(selectedTeam)) {
      newFilters.team = 'all';
      changed = true;
    }

    if (changed) {
      onFiltersChange(newFilters);
    }
  }, [uniqueYears, uniqueMonths, uniqueTeams, selectedYear, selectedMonth, selectedTeam, filters, onFiltersChange]);

  // Active data for metrics and charts based on viewMode
  const activeData = useMemo(() => {
    if (viewMode === 'dashboard') {
      return yearFilteredData.filter(d => 
        (selectedMonth === 'all' || d.month === selectedMonth) &&
        (selectedTeam === 'all' || d.team === selectedTeam)
      );
    } else {
      return yearFilteredData; // heatmap uses all teams and all months in the year
    }
  }, [yearFilteredData, viewMode, selectedMonth, selectedTeam]);

  // Compare Chart Data (by Team)
  const compareChartData = useMemo(() => {
    const filtered = yearFilteredData.filter(d => selectedMonth === 'all' || d.month === selectedMonth);
    const teamMap = new Map<string, any>();
    filtered.forEach(d => {
      if (!teamMap.has(d.team)) {
        teamMap.set(d.team, { name: d.team, load: 0, humanCapacity: 0, machineCapacity: 0 });
      }
      const entry = teamMap.get(d.team)!;
      entry.load += d.human.load;
      entry.humanCapacity += d.human.capacity;
      entry.machineCapacity += d.machine.capacity;
    });
    return sortTeams(Array.from(teamMap.values()).map(v => v.name), settings?.teamOrder).map(name => teamMap.get(name)!);
  }, [yearFilteredData, selectedMonth, settings?.teamOrder]);

  // Trend Chart Data (by Month)
  const trendChartData = useMemo(() => {
    const filtered = yearFilteredData.filter(d => selectedTeam === 'all' || d.team === selectedTeam);
    const monthMap = new Map<string, any>();
    filtered.forEach(d => {
      const monthLabel = selectedYear !== 'all' ? d.month.replace(/\d+年/, '') : d.month;
      if (!monthMap.has(monthLabel)) {
        monthMap.set(monthLabel, { name: monthLabel, load: 0, humanCapacity: 0, machineCapacity: 0, originalMonth: d.month });
      }
      const entry = monthMap.get(monthLabel)!;
      entry.load += d.human.load;
      entry.humanCapacity += d.human.capacity;
      entry.machineCapacity += d.machine.capacity;
    });
    return Array.from(monthMap.values()).sort((a, b) => a.originalMonth.localeCompare(b.originalMonth));
  }, [yearFilteredData, selectedTeam, selectedYear]);

  // Heatmap Data Preparation
  const heatmapData = useMemo(() => {
    if (viewMode !== 'heatmap') return { months: [], teams: [], matrix: {} as Record<string, any> };
    
    const months = Array.from(new Set(activeData.map(d => d.month))).sort();
    const teams = sortTeams(Array.from(new Set(activeData.map(d => d.team))), settings?.teamOrder);
    
    const matrix: Record<string, Record<string, { 
      human: { load: number, capacity: number, utilization: number },
      machine: { load: number, capacity: number, utilization: number }
    }>> = {};
    
    teams.forEach(t => {
      matrix[t] = {};
      months.forEach(m => {
        const entry = activeData.find(d => d.team === t && d.month === m);
        if (entry) {
          matrix[t][m] = {
            human: {
              load: entry.human.load,
              capacity: entry.human.capacity,
              utilization: entry.human.utilization
            },
            machine: {
              load: entry.machine.load,
              capacity: entry.machine.capacity,
              utilization: entry.machine.utilization
            }
          };
        } else {
          matrix[t][m] = { 
            human: { load: 0, capacity: 0, utilization: 0 },
            machine: { load: 0, capacity: 0, utilization: 0 }
          };
        }
      });
    });
    
    return { months, teams, matrix };
  }, [activeData, viewMode, settings?.teamOrder]);

  // Metrics Calculation
  const totalDemandLoad = activeData.reduce((acc, d) => acc + d.human.load, 0);
  const totalCapacity = activeData.reduce((acc, d) => acc + d.human.capacity, 0);
  
  // 计算每一行人力和设备负荷率的最小值，然后取平均值
  const totalMinUtilization = activeData.reduce((acc, d) => {
    const minUtil = Math.min(d.human.utilization, d.machine.utilization);
    return acc + minUtil;
  }, 0);
  const avgLoadRate = activeData.length > 0 ? (totalMinUtilization / activeData.length) : 0;
  
  const bottleneckCount = useMemo(() => {
    let count = 0;
    activeData.forEach(d => {
      // 只要人力或设备其中一个超负荷（>120%），即计为一个瓶颈
      if (d.human.utilization > 120 || d.machine.utilization > 120) {
        count++;
      }
    });
    return count;
  }, [activeData]);

  const currentWorkingDays = useMemo(() => {
    if (viewMode === 'dashboard' && selectedMonth !== 'all') {
      const monthData = activeData.find(m => m.month === selectedMonth);
      return monthData ? monthData.workingDays : 0;
    }
    // Sum up unique months in activeData
    const uniqueMonthsInActive = Array.from(new Set(activeData.map(d => d.month)));
    if (uniqueMonthsInActive.length === 1) {
      const m = activeData.find(d => d.month === uniqueMonthsInActive[0]);
      return m ? m.workingDays : 0;
    }
    return data.totalWorkingDays;
  }, [activeData, viewMode, selectedMonth, data.totalWorkingDays]);

  const getChartTitle = () => {
    if (data.monthlyTeamData.length === 0) {
      return '产能分析看板';
    }

    if (viewMode === 'dashboard') {
      const yearLabel = selectedYear === 'all' ? '全部年份' : `${selectedYear}年`;
      
      // Use actual valid team for title, even if state hasn't updated yet
      const actualTeam = selectedTeam !== 'all' && uniqueTeams.includes(selectedTeam) ? selectedTeam : 'all';
      
      if (actualTeam !== 'all') {
        return `${actualTeam} - ${yearLabel}月度负荷趋势`;
      } else {
        if (selectedMonth === 'all') {
          return `${yearLabel}全年 - 各班组产能负荷对比`;
        } else {
          // selectedMonth already contains the year (e.g., "2026年03月")
          return `${selectedMonth} - 各班组产能负荷对比`;
        }
      }
    } else {
      const yearLabel = selectedYear === 'all' ? '全部年份' : `${selectedYear}年`;
      return `${yearLabel} - 全局产能负荷热力图`;
    }
  };

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    
    const addHeatmapSheet = (category: 'human' | 'machine') => {
      const { months, teams, matrix } = heatmapData;
      const sheetName = category === 'human' ? '人力负荷' : '设备负荷';
      const worksheet = workbook.addWorksheet(sheetName);
      
      // Header Row
      const headerRow = ['班组 \\ 月份', ...months.map(m => m.replace(/\d+年/, ''))];
      const header = worksheet.addRow(headerRow);
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.fill = { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: category === 'human' ? 'FF4F46E5' : 'FFD97706' } // Indigo 600 or Amber 600
      };
      header.alignment = { horizontal: 'center', vertical: 'middle' };

      // Data Rows
      teams.forEach(team => {
        const rowData = [team];
        months.forEach(month => {
          const cell = matrix[team][month][category];
          rowData.push(cell.utilization > 0 ? `${cell.utilization.toFixed(1)}%` : '-');
        });
        const row = worksheet.addRow(rowData);
        
        // Style cells based on utilization
        row.eachCell((cell, colNumber) => {
          if (colNumber === 1) {
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; // Slate 50
            return;
          }
          
          const monthIndex = colNumber - 2;
          const month = months[monthIndex];
          const dataCell = matrix[team][month][category];
          const util = dataCell.utilization;
          
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          
          if (util === 0) {
            cell.font = { color: { argb: 'FF94A3B8' } }; // Slate 400
          } else if (util < 90) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Emerald 100
            cell.font = { color: { argb: 'FF065F46' } }; // Emerald 800
          } else if (util <= 120) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Amber 100
            cell.font = { color: { argb: 'FF92400E' } }; // Amber 800
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Red 100
            cell.font = { color: { argb: 'FF991B1B' }, bold: true }; // Red 800
          }
        });
      });

      // Column widths
      worksheet.getColumn(1).width = 20;
      for (let i = 2; i <= months.length + 1; i++) {
        worksheet.getColumn(i).width = 12;
      }
    };

    if (viewMode === 'heatmap') {
      addHeatmapSheet('human');
      addHeatmapSheet('machine');
    } else {
      // Standard Export - Transposed Data
      const worksheet = workbook.addWorksheet('产能分析明细');
      
      const exportMonths = Array.from(new Set(activeData.map(d => d.month))).sort();
      const exportTeams = sortTeams(Array.from(new Set(activeData.map(d => d.team))), settings?.teamOrder);

      // Header Row
      const headerRow = ['', '', ...exportMonths.map(m => m.replace(/\d+年/, ''))];
      const header = worksheet.addRow(headerRow);
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      header.alignment = { horizontal: 'center', vertical: 'middle' };
      
      header.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      let currentRowIndex = 2;
      exportTeams.forEach(team => {
        const teamData = activeData.filter(d => d.team === team);
        
        const metrics = [
          { name: '需求工时', key: 'load' },
          { name: '人力可用产能', key: 'humanCap' },
          { name: '人力负荷率', key: 'humanUtil' },
          { name: '设备可用产能', key: 'machineCap' },
          { name: '设备负荷率', key: 'machineUtil' },
          { name: '缺口', key: 'gap' },
        ];

        const startRow = currentRowIndex;

        metrics.forEach(metric => {
          const rowData: any[] = [team, metric.name];
          exportMonths.forEach(month => {
            const monthData = teamData.find(d => d.month === month);
            if (monthData) {
              if (metric.key === 'load') rowData.push(Math.round(monthData.human.load));
              else if (metric.key === 'humanCap') rowData.push(Math.round(monthData.human.capacity));
              else if (metric.key === 'humanUtil') rowData.push(`${monthData.human.utilization.toFixed(2)}%`);
              else if (metric.key === 'machineCap') rowData.push(Math.round(monthData.machine.capacity));
              else if (metric.key === 'machineUtil') rowData.push(`${monthData.machine.utilization.toFixed(2)}%`);
              else if (metric.key === 'gap') rowData.push(Math.round(monthData.machine.capacity - monthData.human.load));
            } else {
              rowData.push('-');
            }
          });
          const row = worksheet.addRow(rowData);
          
          row.eachCell((cell, colNumber) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            if (colNumber === 1) {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else if (colNumber === 2) {
              cell.alignment = { horizontal: 'left', vertical: 'middle' };
            } else {
              cell.alignment = { horizontal: 'right', vertical: 'middle' };
            }
          });
          
          currentRowIndex++;
        });

        worksheet.mergeCells(startRow, 1, currentRowIndex - 1, 1);
        const teamCell = worksheet.getCell(startRow, 1);
        teamCell.value = team;
        teamCell.font = { bold: true };
        teamCell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      worksheet.getColumn(1).width = 15;
      worksheet.getColumn(2).width = 20;
      for (let i = 3; i <= exportMonths.length + 2; i++) {
        worksheet.getColumn(i).width = 12;
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${getChartTitle()}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const HeatmapView = ({ hData }: { hData: typeof heatmapData }) => {
    if (hData.months.length === 0 || hData.teams.length === 0) {
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
                {hData.months.map(m => (
                  <th key={m} className="p-3 text-center font-bold text-slate-500 border-b border-slate-200 min-w-[100px]">
                    {m.replace(/\d+年/, '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hData.teams.map(team => (
                <tr key={team} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 font-bold text-slate-700 sticky left-0 bg-white/90 backdrop-blur-sm z-10">{team}</td>
                  {hData.months.map(month => {
                    const cell = hData.matrix[team][month][heatmapCategory];
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
  };

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit shadow-inner">
        <button 
          onClick={() => setViewMode('dashboard')} 
          className={cn("px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", viewMode === 'dashboard' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          <BarChart3 size={18} /> 产能分析看板
        </button>
        <button 
          onClick={() => setViewMode('heatmap')} 
          className={cn("px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all", viewMode === 'heatmap' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
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
                    month: 'all' // Reset month when year changes
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
          <button 
            onClick={handleExport}
            className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-all"
          >
            <Download size={16} />
            导出结果
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      {viewMode !== 'heatmap' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">总需求工时</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-3xl font-bold text-slate-900">{formatNumber(totalDemandLoad)}</h3>
                <span className="text-slate-400 text-sm font-normal">h</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Database size={24} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">计算范围正常</span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500/10 group-hover:bg-indigo-500/30 transition-colors" />
        </div>

        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">总可用产能</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-3xl font-bold text-slate-900">{formatNumber(totalCapacity)}</h3>
                <span className="text-slate-400 text-sm font-normal">h</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users size={24} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Calendar size={10} /> 工作天数: {currentWorkingDays} 天
            </span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/10 group-hover:bg-emerald-500/30 transition-colors" />
        </div>

        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">平均负荷率</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-3xl font-bold text-slate-900">{formatNumber(avgLoadRate)}</h3>
                <span className="text-slate-400 text-sm font-normal">%</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
              <Activity size={24} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
              avgLoadRate > 120 ? "bg-red-50 text-red-600" : 
              avgLoadRate > 90 ? "bg-amber-50 text-amber-600" :
              "bg-blue-50 text-blue-600"
            )}>
              {avgLoadRate > 120 ? "资源严重超负荷" : 
               avgLoadRate > 90 ? "资源负荷较高" : 
               "资源分配均衡"}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/10 group-hover:bg-blue-500/30 transition-colors" />
        </div>

        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">瓶颈资源数</p>
              <div className="flex items-baseline gap-1">
                <h3 className="text-3xl font-bold text-slate-900">{bottleneckCount}</h3>
                <span className="text-slate-400 text-sm font-normal">个班组</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-brand-red/5 flex items-center justify-center text-brand-red">
              <AlertTriangle size={24} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
              bottleneckCount > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
            )}>
              {bottleneckCount > 0 ? "存在产能瓶颈" : "无明显瓶颈"}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-brand-red/10 group-hover:bg-brand-red/30 transition-colors" />
        </div>
      </div>
      )}

      {/* Chart Section */}
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-xl font-bold text-slate-800">{getChartTitle()}</h3>
          {viewMode === 'heatmap' ? (
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-slate-50 border border-slate-200" />
                <span className="text-slate-500">无任务</span>
              </div>
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
          ) : (
            <div className="flex items-center gap-6 text-xs font-medium">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-indigo-500 border-t-2 border-dashed border-indigo-600" />
                <span className="text-slate-500">可用产能 (人力)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-amber-500 border-t-2 border-dashed border-amber-600" />
                <span className="text-slate-500">可用产能 (设备)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                <span className="text-slate-500">需求工时</span>
              </div>
            </div>
          )}
        </div>

        {viewMode === 'heatmap' ? (
          <HeatmapView hData={heatmapData} />
        ) : (
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <div style={{ minWidth: (selectedTeam !== 'all' ? trendChartData.length : compareChartData.length) > 10 ? `${(selectedTeam !== 'all' ? trendChartData.length : compareChartData.length) * 80}px` : '100%' }} className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                  data={selectedTeam !== 'all' ? trendChartData : compareChartData} 
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                    interval={0}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickFormatter={(value) => Math.round(value).toString()}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => Math.round(value)}
                  />
                  <Bar 
                    dataKey="load" 
                    name="需求工时"
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                    onClick={(data: any) => {
                      if (selectedTeam !== 'all') {
                        setSelectedBarData({ team: selectedTeam, month: data.originalMonth });
                      } else {
                        setSelectedBarData({ team: data.name, month: selectedMonth });
                      }
                    }}
                    cursor="pointer"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="humanCapacity" 
                    name="可用产能 (人力)"
                    stroke="#6366f1" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="machineCapacity" 
                    name="可用产能 (设备)"
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Team Analysis Table */}
      {viewMode !== 'heatmap' && (
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
                    onClick={() => setSelectedBarData({ team: item.team, month: item.month })}
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
                    {/* Demand Load (Shared) */}
                    <td className="py-4 px-6 text-sm text-slate-600 text-right border-l border-slate-100 font-mono font-semibold bg-slate-50/20">
                      {formatNumber(item.human.load)}
                    </td>
                    {/* Human Data */}
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
                    {/* Machine Data */}
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
      )}

      {/* Top Demands Modal */}
      {selectedBarData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {selectedBarData.team !== 'all' ? selectedBarData.team : '全部班组'} 
                    {selectedBarData.month !== 'all' ? ` - ${selectedBarData.month}` : ' - 全年'} 
                    生产需求明细
                  </h3>
                  <p className="text-sm text-slate-500">需求工时最长的前10个工单</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBarData(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-16 text-center border-b border-slate-200">排名</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">工单号</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">组件物料编码</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">工序</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">交付日期</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200">未完成数量</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200">需求工时(H)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topDemands.length > 0 ? topDemands.map((demand, idx) => {
                    const isTop3 = idx < 3;
                    const rankColors = [
                      'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 border-amber-200 shadow-sm', // 1st
                      'bg-gradient-to-br from-slate-200 to-slate-100 text-slate-700 border-slate-300 shadow-sm', // 2nd
                      'bg-gradient-to-br from-orange-100 to-orange-50 text-orange-700 border-orange-200 shadow-sm' // 3rd
                    ];
                    const rankColor = isTop3 ? rankColors[idx] : 'bg-slate-50 text-slate-400 border-slate-100';
                    const rowBg = idx === 0 ? 'bg-amber-50/10' : idx === 1 ? 'bg-slate-50/30' : idx === 2 ? 'bg-orange-50/10' : 'bg-white';

                    return (
                      <tr key={`${demand.id}-${idx}`} className={cn("group hover:bg-slate-50/80 transition-all duration-200", rowBg)}>
                        <td className="py-4 px-6 text-center">
                          <div className={cn("w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold border", rankColor)}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-slate-800">{demand.orderNo}</td>
                        <td className="py-4 px-6 text-sm font-mono font-medium text-slate-600">{demand.componentCode}</td>
                        <td className="py-4 px-6 text-sm text-slate-500">{demand.opDesc}</td>
                        <td className="py-4 px-6 text-sm text-slate-500 font-mono">{demand.dueDate}</td>
                        <td className="py-4 px-6 text-sm text-slate-600 text-right font-mono">{formatNumber(demand.uncompletedQty, 0)}</td>
                        <td className="py-4 px-6 text-sm font-bold text-blue-600 text-right font-mono">{formatNumber(demand.pendingHours, 2)}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                        暂无需求数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
