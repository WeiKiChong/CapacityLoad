import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { FixedSizeList } from 'react-window';
import { 
  LayoutGrid, 
  ClipboardList, 
  Users, 
  Timer, 
  Settings, 
  Menu,
  ChevronRight,
  ChevronDown,
  User,
  Bell,
  Calendar,
  Check,
  X,
  ListOrdered,
  Upload,
  Download,
  Trash2,
  Plus,
  MoreHorizontal,
  RotateCcw,
  AlertCircle,
  Search,
  Filter,
  Shield,
  Activity,
  Database,
  Monitor,
  Save,
  Clock,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, sortTeams, DEFAULT_TEAM_ORDER } from './utils';
import CapacityAnalysis from './components/CapacityAnalysis';
import CSVImporter from './components/CSVImporter';
import Combobox from './components/Combobox';
import { DraggableTeamList } from './components/DraggableTeamList';
import ProductionCalendar from './components/ProductionCalendar';
import { ProductionDemand, ProductionResource, StandardTime, AnalysisResult, SystemSettings, MonthlyTeamAnalysis } from './types';

type Tab = 'analysis' | 'demand' | 'resources' | 'standard-time' | 'calendar' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('analysis');
  const [dashboardFilters, setDashboardFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('aps_dashboard_filters');
      return saved ? JSON.parse(saved) : { year: 'all', month: 'all', team: 'all' };
    } catch {
      return { year: 'all', month: 'all', team: 'all' };
    }
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isConfirmingClearResources, setIsConfirmingClearResources] = useState(false);
  const [isConfirmingClearDemands, setIsConfirmingClearDemands] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; type: 'success' | 'error' | 'info'; message: string }[]>([]);
  const [demands, setDemands] = useState<ProductionDemand[]>([]);
  const [showDemandsList, setShowDemandsList] = useState<boolean>(false);
  const [searchOrderNo, setSearchOrderNo] = useState('');
  const [isImportingDemands, setIsImportingDemands] = useState(false);

  const filteredDemands = useMemo(() => {
    if (!searchOrderNo.trim()) return demands;
    const search = searchOrderNo.toLowerCase().trim();
    return demands.filter(d => (d.orderNo || '').toLowerCase().includes(search));
  }, [demands, searchOrderNo]);

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };
  const [resources, setResources] = useState<ProductionResource[]>(() => {
    try {
      const saved = localStorage.getItem('aps_resources');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch { return []; }
  });
  const [standardTimes, setStandardTimes] = useState<StandardTime[]>(() => {
    try {
      const saved = localStorage.getItem('aps_standard_times');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch { return []; }
  });

  const isRowModified = (item: StandardTime | ProductionResource | ProductionDemand) => {
    if (!item.original) return false;
    if ('team' in item) {
      // ProductionResource
      const orig = item.original as NonNullable<ProductionResource['original']>;
      return (
        item.id !== orig.id ||
        item.groupName !== orig.groupName ||
        item.team !== orig.team ||
        item.workshop !== orig.workshop
      );
    } else if ('orderNo' in item) {
      // ProductionDemand
      const orig = item.original as NonNullable<ProductionDemand['original']>;
      return (
        item.orderNo !== orig.orderNo ||
        item.componentCode !== orig.componentCode ||
        item.componentDesc !== orig.componentDesc ||
        item.opNo !== orig.opNo ||
        item.opCode !== orig.opCode ||
        item.opDesc !== orig.opDesc ||
        item.resourceGroupId !== orig.resourceGroupId ||
        item.dueDate !== orig.dueDate ||
        item.requiredQty !== orig.requiredQty ||
        item.completedQty !== orig.completedQty ||
        item.actualHours !== orig.actualHours
      );
    } else {
      // StandardTime
      const orig = item.original as NonNullable<StandardTime['original']>;
      return (
        item.groupName !== orig.groupName ||
        item.peopleCount !== orig.peopleCount ||
        item.peopleShifts !== orig.peopleShifts ||
        item.peopleDuration !== orig.peopleDuration ||
        item.peopleOee !== orig.peopleOee ||
        item.machineCount !== orig.machineCount ||
        item.machineShifts !== orig.machineShifts ||
        item.machineDuration !== orig.machineDuration ||
        item.machineOee !== orig.machineOee
      );
    }
  };

  const isFieldModified = <T extends StandardTime | ProductionResource | ProductionDemand>(item: T, field: keyof NonNullable<T['original']>) => {
    if (!item.original) return false;
    return item[field as keyof T] !== (item.original as any)[field];
  };

  const restoreRow = (idx: number, type: 'standard' | 'resource' | 'demand') => {
    if (type === 'standard') {
      const item = standardTimes[idx];
      if (!item.original) return;
      const newTimes = [...standardTimes];
      newTimes[idx] = { ...item, ...item.original };
      setStandardTimes(newTimes);
      addNotification('info', `已恢复班组 "${item.groupName}" 的原始数据`);
    } else if (type === 'resource') {
      const item = resources[idx];
      if (!item.original) return;
      const newResources = [...resources];
      newResources[idx] = { ...item, ...item.original };
      setResources(newResources);
      addNotification('info', `已恢复资源组 "${item.groupName}" 的原始数据`);
    } else {
      const item = demands[idx];
      if (!item.original) return;
      const newDemands = [...demands];
      newDemands[idx] = { ...item, ...item.original };
      setDemands(newDemands);
      addNotification('info', `已恢复需求 "${item.orderNo}" 的原始数据`);
    }
  };

  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('aps_settings');
      const parsed = saved ? JSON.parse(saved) || {} : {};
      return {
        restDays: parsed.restDays || 'double',
        includePublicHolidays: parsed.includePublicHolidays ?? true,
        schedulingStrategy: parsed.schedulingStrategy || 'EDD',
        enableAutoSave: parsed.enableAutoSave ?? true,
        alertThreshold: parsed.alertThreshold || 85,
        displayDensity: parsed.displayDensity || 'comfortable',
        customHolidays: Array.isArray(parsed.customHolidays) ? parsed.customHolidays.filter(Boolean) : [],
        calendarOverrides: parsed.calendarOverrides || {},
        teamOrder: Array.isArray(parsed.teamOrder) ? parsed.teamOrder.filter(Boolean) : undefined
      };
    } catch {
      return {
        restDays: 'double',
        includePublicHolidays: true,
        schedulingStrategy: 'EDD',
        enableAutoSave: true,
        alertThreshold: 85,
        displayDensity: 'comfortable',
        customHolidays: [],
        calendarOverrides: {},
        teamOrder: undefined
      };
    }
  });

  const uniqueTeams = useMemo(() => {
    return sortTeams(Array.from(new Set(resources.map(r => r?.team).filter(Boolean))), settings.teamOrder);
  }, [resources, settings.teamOrder]);

  // Auto-save to localStorage
  useEffect(() => {
    if (settings.enableAutoSave) {
      try {
        localStorage.setItem('aps_resources', JSON.stringify(resources));
        localStorage.setItem('aps_standard_times', JSON.stringify(standardTimes));
        localStorage.setItem('aps_settings', JSON.stringify(settings));
        localStorage.setItem('aps_dashboard_filters', JSON.stringify(dashboardFilters));
      } catch (e) {
        console.warn('Failed to save to localStorage, possibly due to quota limits:', e);
      }
    }
  }, [resources, standardTimes, settings, dashboardFilters]);

  const handleBackup = () => {
    const data = {
      demands,
      resources,
      standardTimes,
      settings,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aps_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addNotification('success', '系统数据备份已导出');
  };

  const handleClearCache = () => {
    if (window.confirm('确定要清空所有本地缓存数据吗？此操作不可撤销。')) {
      localStorage.clear();
      setDemands([]);
      setResources([]);
      setStandardTimes([]);
      addNotification('info', '所有本地缓存数据已清空');
    }
  };

  // Real capacity analysis calculation logic
  const analysisResult = useMemo<AnalysisResult>(() => {
    const isWorkingDay = (date: Date) => {
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      // Check manual overrides first
      if (settings.calendarOverrides?.[dateKey] !== undefined) {
        return settings.calendarOverrides[dateKey];
      }
      
      // Default rules
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isSunday = dayOfWeek === 0;
      
      let isRest = false;
      if (settings.restDays === 'double' && isWeekend) isRest = true;
      if (settings.restDays === 'single' && isSunday) isRest = true;
      
      // Check custom holidays (legacy support)
      if (settings.customHolidays?.includes(dateKey)) isRest = true;
      
      return !isRest;
    };

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    // 1. Daily Data for Chart
    const teams = Array.from(new Set(resources.map(r => (r?.team || '其他').trim())));
    if (teams.length === 0) teams.push('其他');

    const dailyData: { date: string, team: string, load: number, humanCapacity: number, machineCapacity: number }[] = [];

    // Pre-process resources into a map for O(1) lookup
    const resourceMap = new Map<string, ProductionResource>();
    resources.forEach(r => resourceMap.set(r.id, r));

    // Pre-calculate demands
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const dailyLoadMap = new Map<string, number>(); // key: "YYYY-MM-DD_team"
    const monthlyTeamMap = new Map<string, MonthlyTeamAnalysis>();

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

    uniqueDemands.forEach(demand => {
      if (!demand.dueDate) return;
      
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

      // Daily key
      const dateStr = `${(targetDate.getMonth() + 1).toString().padStart(2, '0')}-${targetDate.getDate().toString().padStart(2, '0')}`;
      const dailyKey = `${targetDate.getFullYear()}-${dateStr}_${demandTeam}`;
      dailyLoadMap.set(dailyKey, (dailyLoadMap.get(dailyKey) || 0) + pendingHours);

      // Monthly key
      const monthStr = `${targetDate.getFullYear()}年${(targetDate.getMonth() + 1).toString().padStart(2, '0')}月`;
      const monthlyKey = `${monthStr}_${demandTeam}`;
      
      if (!monthlyTeamMap.has(monthlyKey)) {
        monthlyTeamMap.set(monthlyKey, {
          month: monthStr,
          team: demandTeam,
          workingDays: 0,
          human: { load: 0, capacity: 0, utilization: 0 },
          machine: { load: 0, capacity: 0, utilization: 0 }
        });
      }
      const entry = monthlyTeamMap.get(monthlyKey)!;
      entry.human.load += pendingHours;
      entry.machine.load += pendingHours;
    });

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;
      const fullDateStr = `${currentDate.getFullYear()}-${dateStr}`;
      
      const isWorking = isWorkingDay(currentDate);

      teams.forEach(team => {
        let dailyTeamHumanCapacity = 0;
        let dailyTeamMachineCapacity = 0;
        // Find standard times for this team
        const teamResources = resources.filter(r => (r.team || '其他').trim() === team);
        const teamResourceGroupNames = teamResources.map(r => r.groupName);
        const teamStdTimes = standardTimes.filter(s => teamResourceGroupNames.includes(s.groupName));

        teamStdTimes.forEach(group => {
          if (isWorking) {
            const personCap = group.peopleCount * group.peopleShifts * group.peopleDuration * group.peopleOee;
            const machineCap = group.machineCount * group.machineShifts * group.machineDuration * group.machineOee;
            dailyTeamHumanCapacity += personCap;
            dailyTeamMachineCapacity += machineCap;
          }
        });

        const dailyKey = `${fullDateStr}_${team}`;
        const dailyTeamLoad = dailyLoadMap.get(dailyKey) || 0;

        dailyData.push({
          date: dateStr,
          team: team,
          load: dailyTeamLoad,
          humanCapacity: dailyTeamHumanCapacity,
          machineCapacity: dailyTeamMachineCapacity
        });
      });
    }

    let totalWorkingDays = 0;
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const date = new Date(currentYear, currentMonth - 1, d);
      if (isWorkingDay(date)) totalWorkingDays++;
    }

    // Calculate Capacities for Monthly Teams
    monthlyTeamMap.forEach((entry) => {
      // Extract year and month from "YYYY年MM月"
      const match = entry.month.match(/(\d+)年(\d+)月/);
      if (!match) return;
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      
      // Calculate working days for this specific month
      let workingDays = 0;
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d);
        if (isWorkingDay(date)) workingDays++;
      }
      
      entry.workingDays = workingDays;
      
      // Find all standard times for this team
      const teamStdTimes = standardTimes.filter(s => (s.groupName || '').trim() === entry.team);

      teamStdTimes.forEach(std => {
        entry.human.capacity += (std.peopleCount * std.peopleShifts * std.peopleDuration * std.peopleOee) * workingDays;
        entry.machine.capacity += (std.machineCount * std.machineShifts * std.machineDuration * std.machineOee) * workingDays;
      });

      entry.human.utilization = entry.human.capacity > 0 ? (entry.human.load / entry.human.capacity) * 100 : 0;
      entry.machine.utilization = entry.machine.capacity > 0 ? (entry.machine.load / entry.machine.capacity) * 100 : 0;
    });

    const totalLoad = dailyData.reduce((acc, d) => acc + d.load, 0);
    const totalCapacity = dailyData.reduce((acc, d) => acc + d.humanCapacity + d.machineCapacity, 0);
    const utilizationRate = totalCapacity > 0 ? (totalLoad / totalCapacity) * 100 : 0;

    return {
      totalLoad: Math.round(totalLoad),
      totalCapacity: Math.round(totalCapacity),
      utilizationRate: utilizationRate,
      dailyData: dailyData,
      monthlyTeamData: Array.from(monthlyTeamMap.values()).sort((a, b) => {
        const monthCompare = a.month.localeCompare(b.month);
        if (monthCompare !== 0) return monthCompare;
        
        // Use sortTeams logic for team sorting within same month
        const sortedTeams = sortTeams([a.team, b.team], settings.teamOrder);
        return sortedTeams[0] === a.team ? -1 : 1;
      }),
      totalWorkingDays: totalWorkingDays
    };
  }, [demands, resources, standardTimes, settings]);

  const navItems = [
    { id: 'analysis', label: '总览看板', icon: LayoutGrid },
    { id: 'demand', label: '生产需求', icon: ClipboardList },
    { id: 'resources', label: '生产资源', icon: Users },
    { id: 'standard-time', label: '标准工时', icon: Timer },
    { id: 'calendar', label: '生产日历', icon: Calendar },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'analysis':
        return (
          <CapacityAnalysis 
            data={analysisResult} 
            demands={demands} 
            resources={resources} 
            settings={settings} 
            filters={dashboardFilters}
            onFiltersChange={setDashboardFilters}
          />
        );
      case 'demand':
        return (
          <div className="space-y-6 max-w-[98%] mx-auto">
            <div className="glass-card p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ClipboardList size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">生产需求明细</h3>
                    <p className="text-sm text-slate-500">共 {demands.length} 条记录</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="搜索工单号..."
                      value={searchOrderNo}
                      onChange={(e) => setSearchOrderNo(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 w-64 transition-all outline-none"
                    />
                  </div>

                  {/* Clear Action */}
                  <button 
                    onClick={() => {
                      if (isConfirmingClearDemands) {
                        setDemands([]);
                        setIsConfirmingClearDemands(false);
                      } else {
                        setIsConfirmingClearDemands(true);
                        setTimeout(() => setIsConfirmingClearDemands(false), 3000);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all border text-sm",
                      isConfirmingClearDemands 
                        ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-100 animate-pulse" 
                        : "bg-white text-slate-400 border-slate-200 hover:text-red-500 hover:border-red-100 hover:bg-red-50"
                    )}
                  >
                    <Trash2 size={16} />
                    <span>{isConfirmingClearDemands ? '确认清空?' : '清空'}</span>
                  </button>

                  <div className="h-6 w-px bg-slate-200 mx-1" />

                  {/* Data Management Group */}
                  <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                    <button
                      onClick={() => setShowDemandsList(!showDemandsList)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-medium text-sm",
                        showDemandsList ? "text-slate-600 hover:bg-white hover:text-blue-600" : "bg-blue-100 text-blue-700"
                      )}
                      title={showDemandsList ? "隐藏列表以提升性能" : "显示列表"}
                    >
                      <LayoutGrid size={14} />
                      <span>{showDemandsList ? '隐藏' : '显示'}</span>
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.csv,.xlsx,.xls';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;

                          setIsImportingDemands(true);
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const arrayBuffer = event.target?.result as ArrayBuffer;
                              let workbook;
                              
                              if (file.name.toLowerCase().endsWith('.csv')) {
                                let text;
                                try {
                                  const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
                                  text = utf8Decoder.decode(arrayBuffer);
                                } catch (e) {
                                  const gbkDecoder = new TextDecoder('gbk');
                                  text = gbkDecoder.decode(arrayBuffer);
                                }
                                workbook = XLSX.read(text, { type: 'string' });
                              } else {
                                workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
                              }
                              
                              const sheetName = workbook.SheetNames[0];
                              const worksheet = workbook.Sheets[sheetName];
                              const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                              
                              if (rawRows.length === 0) {
                                addNotification('error', '文件内容为空');
                                setIsImportingDemands(false);
                                return;
                              }

                              let headerIndex = -1;
                              const requiredKeywords = ['工单', '物料', '工序', '资源', '日期', '数量'];
                              
                              for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
                                const row = rawRows[i];
                                if (!row) continue;
                                const rowText = row.join('|');
                                const matchCount = requiredKeywords.filter(kw => rowText.includes(kw)).length;
                                if (matchCount >= 3) {
                                  headerIndex = i;
                                  break;
                                }
                              }

                              if (headerIndex === -1) {
                                addNotification('error', '验证失败：未找到包含“工单号”、“组件物料编码”、“工序号”等关键词的表头。');
                                setIsImportingDemands(false);
                                return;
                              }

                              const headerRow = rawRows[headerIndex];
                              const getColIndex = (keywords: string[]) => {
                                // First try exact match (case-insensitive and trimmed)
                                const exactIdx = headerRow.findIndex(cell => 
                                  cell && keywords.some(kw => String(cell).trim().toLowerCase() === kw.toLowerCase())
                                );
                                if (exactIdx !== -1) return exactIdx;

                                // Then try includes
                                return headerRow.findIndex(cell => 
                                  cell && keywords.some(kw => String(cell).includes(kw))
                                );
                              };

                              const colMap = {
                                orderNo: getColIndex(['工单号', '工单']),
                                componentCode: getColIndex(['组件物料编码', '物料编码', '组件代码']),
                                componentDesc: getColIndex(['组件描述', '物料描述']),
                                opNo: getColIndex(['工序号', '工序序号', '序号']),
                                opCode: getColIndex(['工序代码', '工序编号']),
                                opDesc: getColIndex(['工序描述', '工序名称']),
                                resourceGroupId: getColIndex(['资源组ID', '资源组']),
                                dueDate: getColIndex(['交货日期', '截止日期', '需求日期']),
                                requiredQty: getColIndex(['需求数量', '订单数量']),
                                completedQty: getColIndex(['完成数量', '已完工数量']),
                                rejectedQty: getColIndex(['不合格数量', '废品数量']),
                                actualHours: getColIndex(['实际工时', '实绩工时'])
                              };

                              const dataRows = rawRows.slice(headerIndex + 1);
                              const validRows = dataRows.filter(row => row && row.length > 0 && row[0] !== undefined && String(row[0]).trim() !== '');
                              
                              const formatExcelDate = (val: any) => {
                                if (!val) return '';
                                if (typeof val === 'number') {
                                  // Excel date serial to JS date
                                  const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                                  if (isNaN(date.getTime())) return '';
                                  return date.toISOString().split('T')[0];
                                }
                                return String(val).trim();
                              };

                              // Process in chunks to avoid blocking the UI
                              const chunkSize = 5000;
                              let processedCount = 0;
                              const allFormattedData: any[] = [];

                              const processChunk = () => {
                                const chunk = validRows.slice(processedCount, processedCount + chunkSize);
                                if (chunk.length === 0) {
                                  setDemands(allFormattedData);
                                  addNotification('success', `导入成功！已成功验证并导入 ${allFormattedData.length} 行数据。`);
                                  setIsImportingDemands(false);
                                  return;
                                }

                                const formattedChunk = chunk.map((row, index) => {
                                  const getValue = (colIdx: number) => colIdx !== -1 ? row[colIdx] : undefined;
                                  
                                  // Store raw row as object for full export
                                  const rawRow: any = {};
                                  headerRow.forEach((header, i) => {
                                    if (header !== undefined && header !== null) {
                                      rawRow[String(header)] = row[i];
                                    }
                                  });

                                  const data = {
                                    id: `dem-import-${Date.now()}-${processedCount + index}`,
                                    orderNo: String(getValue(colMap.orderNo) ?? '').trim(),
                                    componentCode: String(getValue(colMap.componentCode) ?? '').trim(),
                                    componentDesc: String(getValue(colMap.componentDesc) ?? '').trim(),
                                    opNo: String(getValue(colMap.opNo) ?? '').trim(),
                                    opCode: String(getValue(colMap.opCode) ?? '').trim(),
                                    opDesc: String(getValue(colMap.opDesc) ?? '').trim(),
                                    resourceGroupId: String(getValue(colMap.resourceGroupId) ?? '').trim(),
                                    dueDate: formatExcelDate(getValue(colMap.dueDate)),
                                    requiredQty: parseFloat(getValue(colMap.requiredQty)) || 0,
                                    completedQty: parseFloat(getValue(colMap.completedQty)) || 0,
                                    rejectedQty: parseFloat(getValue(colMap.rejectedQty)) || 0,
                                    actualHours: parseFloat(getValue(colMap.actualHours)) || 0,
                                    rawRow
                                  };
                                  return {
                                    ...data,
                                    original: { ...data }
                                  };
                                });

                                allFormattedData.push(...formattedChunk);
                                processedCount += chunk.length;
                                
                                // Schedule next chunk
                                requestAnimationFrame(processChunk);
                              };

                              // Start processing
                              processChunk();
                            } catch (err) {
                              console.error('Import failed:', err);
                              addNotification('error', '导入失败，请检查文件格式');
                              setIsImportingDemands(false);
                            }
                          };
                          reader.readAsArrayBuffer(file);
                        };
                        input.click();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded-lg transition-all font-medium text-sm"
                    >
                      <Upload size={14} />
                      <span>导入</span>
                    </button>
                    <button 
                      onClick={() => {
                        const exportData = demands.map(item => {
                          if (item.rawRow) {
                            return item.rawRow;
                          }
                          return {
                            '工单号': item.orderNo,
                            '组件物料编码': item.componentCode,
                            '组件描述': item.componentDesc,
                            '工序号': item.opNo,
                            '工序代码': item.opCode,
                            '工序描述': item.opDesc,
                            '资源组ID': item.resourceGroupId,
                            '交货日期': item.dueDate,
                            '需求数量': item.requiredQty,
                            '完成数量': item.completedQty,
                            '不合格数量': item.rejectedQty || 0,
                            '实际工时': item.actualHours
                          };
                        });
                        
                        const worksheet = XLSX.utils.json_to_sheet(exportData);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, "生产需求");
                        XLSX.writeFile(workbook, "生产需求明细.xlsx");
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded-lg transition-all font-medium text-sm"
                    >
                      <Download size={14} />
                      <span>导出</span>
                    </button>
                  </div>
                </div>
              </div>

                <div className="border border-slate-200 rounded-2xl shadow-sm bg-white overflow-hidden relative">
                  {isImportingDemands && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-slate-600 font-medium">正在导入大规模数据，请稍候...</p>
                    </div>
                  )}
                  
                  {!showDemandsList ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                      <LayoutGrid size={48} className="mb-4 opacity-20" />
                      <p>列表已隐藏以提升系统性能</p>
                      <p className="text-sm mt-2">共 {filteredDemands.length} 条数据</p>
                      <button 
                        onClick={() => setShowDemandsList(true)}
                        className="mt-6 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        显示列表
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                      <div className="w-fit">
                        {/* Header */}
                        <div className="flex bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                          <div className="w-[140px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">工单号</div>
                          <div className="w-[200px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">组件物料编码</div>
                          <div className="w-[250px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">组件描述</div>
                          <div className="w-[100px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">工序号</div>
                          <div className="w-[150px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">工序代码</div>
                          <div className="w-[200px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">工序描述</div>
                          <div className="w-[150px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">资源组ID</div>
                          <div className="w-[140px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">交货日期</div>
                          <div className="w-[100px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200 text-right">需求数量</div>
                          <div className="w-[100px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200 text-right">完成数量</div>
                          <div className="w-[120px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200 text-right">实际工时</div>
                          {/* Scrollbar spacer */}
                          <div className="w-[15px] shrink-0 bg-slate-50"></div>
                        </div>

                        <FixedSizeList
                          height={600}
                          itemCount={filteredDemands.length}
                          itemSize={48}
                          width={1665}
                          className="custom-scrollbar"
                        >
                          {({ index, style }) => {
                            const item = filteredDemands[index];
                            return (
                              <div style={style} className="flex border-b border-slate-100 group hover:bg-blue-50/10 transition-colors text-sm">
                                <div className="w-[140px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                                  {item.orderNo}
                                </div>
                                <div className="w-[200px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                                  {item.componentCode}
                                </div>
                                <div className="w-[250px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                                  {item.componentDesc}
                                </div>
                                <div className="w-[100px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                                  {item.opNo}
                                </div>
                                <div className="w-[150px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                                  {item.opCode}
                                </div>
                                <div className="w-[200px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                                  {item.opDesc}
                                </div>
                                <div className="w-[150px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                                  {item.resourceGroupId}
                                </div>
                                <div className="w-[140px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                                  {item.dueDate}
                                </div>
                                <div className="w-[100px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 text-right truncate">
                                  {item.requiredQty}
                                </div>
                                <div className="w-[100px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 text-right truncate">
                                  {item.completedQty}
                                </div>
                                <div className="w-[120px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 text-right truncate">
                                  {item.actualHours}
                                </div>
                              </div>
                            );
                          }}
                        </FixedSizeList>
                      </div>
                    </div>
                  )}
                </div>

            </div>
          </div>
        );
      case 'resources':
        return (
          <div className="flex gap-6 max-w-7xl mx-auto items-start">
            <div className="flex-1 glass-card p-8 overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Users size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">资源分组</h3>
                    <p className="text-sm text-slate-500">共 {resources.length} 条记录</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Clear Action */}
                  <button 
                    onClick={() => {
                      if (isConfirmingClearResources) {
                        setResources([]);
                        setIsConfirmingClearResources(false);
                      } else {
                        setIsConfirmingClearResources(true);
                        setTimeout(() => setIsConfirmingClearResources(false), 3000);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all border text-sm",
                      isConfirmingClearResources 
                        ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-100 animate-pulse" 
                        : "bg-white text-slate-400 border-slate-200 hover:text-red-500 hover:border-red-100 hover:bg-red-50"
                    )}
                  >
                    <Trash2 size={16} />
                    <span>{isConfirmingClearResources ? '确认清空?' : '清空'}</span>
                  </button>

                  <div className="h-6 w-px bg-slate-200 mx-1" />

                  {/* Data Management Group */}
                  <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.csv,.xlsx,.xls';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const arrayBuffer = event.target?.result as ArrayBuffer;
                              let workbook;
                              
                              if (file.name.toLowerCase().endsWith('.csv')) {
                                let text;
                                try {
                                  const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
                                  text = utf8Decoder.decode(arrayBuffer);
                                } catch (e) {
                                  const gbkDecoder = new TextDecoder('gbk');
                                  text = gbkDecoder.decode(arrayBuffer);
                                }
                                workbook = XLSX.read(text, { type: 'string' });
                              } else {
                                workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
                              }
                              
                              const sheetName = workbook.SheetNames[0];
                              const worksheet = workbook.Sheets[sheetName];
                              const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                              
                              if (rawRows.length === 0) {
                                addNotification('error', '文件内容为空');
                                return;
                              }

                              let headerIndex = -1;
                              const requiredKeywords = ['资源组ID', '资源组名称', '班组', '车间'];
                              
                              for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
                                const row = rawRows[i];
                                if (!row) continue;
                                const rowText = row.join('|');
                                const matchCount = requiredKeywords.filter(kw => rowText.includes(kw)).length;
                                if (matchCount >= 2) {
                                  headerIndex = i;
                                  break;
                                }
                              }

                              if (headerIndex === -1) {
                                addNotification('error', '验证失败：未找到包含“资源组ID”、“资源组名称”、“班组”或“车间”等关键词的表头。');
                                return;
                              }

                              const dataRows = rawRows.slice(headerIndex + 1);
                              const validRows = dataRows.filter(row => row && row.length > 0 && row[0] !== undefined && String(row[0]).trim() !== '');
                              
                              if (validRows.length === 0) {
                                addNotification('error', '未检测到有效的资源数据行');
                                return;
                              }

                              const formattedData = validRows.map((row, index) => {
                                const data = {
                                  id: String(row[0]).trim() || `res-import-${Date.now()}-${index}`,
                                  groupName: String(row[1]).trim() || '未知资源组',
                                  team: String(row[2]).trim() || '',
                                  workshop: String(row[3]).trim() || ''
                                };
                                return {
                                  ...data,
                                  original: {
                                    id: data.id,
                                    groupName: data.groupName,
                                    team: data.team,
                                    workshop: data.workshop
                                  }
                                };
                              });

                              setResources(formattedData);
                              addNotification('success', `导入成功！已成功验证并导入 ${formattedData.length} 行数据。`);
                            } catch (err) {
                              console.error('Import failed:', err);
                              addNotification('error', '导入失败，请检查文件格式');
                            }
                          };
                          reader.readAsArrayBuffer(file);
                        };
                        input.click();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-emerald-600 rounded-lg transition-all font-medium text-sm"
                    >
                      <Upload size={14} />
                      <span>导入</span>
                    </button>
                    <button 
                      onClick={() => {
                        const exportData = resources.map(item => ({
                          '资源组ID': item.id,
                          '资源组名称': item.groupName,
                          '班组': item.team,
                          '车间': item.workshop
                        }));
                        
                        const worksheet = XLSX.utils.json_to_sheet(exportData);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, "生产资源");
                        XLSX.writeFile(workbook, "生产资源明细.xlsx");
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-emerald-600 rounded-lg transition-all font-medium text-sm"
                    >
                      <Download size={14} />
                      <span>导出</span>
                    </button>
                  </div>

                  {/* Primary Action */}
                  <button 
                    onClick={() => {
                      setResources([{ 
                        id: '', 
                        groupName: '', 
                        team: '',
                        workshop: ''
                      }, ...resources]);
                    }}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 text-sm"
                  >
                    <Plus size={18} />
                    添加资源组
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[650px] border border-slate-200 rounded-2xl shadow-sm bg-white">
                <table className="w-full text-sm text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-50">
                      <th className="py-4 px-4 font-bold text-left border-b border-r border-slate-200 text-slate-700 w-1/4">
                        <div className="flex items-center gap-2">
                          <LayoutGrid size={16} className="text-slate-400" />
                          资源组ID
                        </div>
                      </th>
                      <th className="py-4 px-4 font-bold text-left border-b border-r border-slate-200 text-slate-700 w-1/4">
                        <div className="flex items-center gap-2">
                          <LayoutGrid size={16} className="text-slate-400" />
                          资源组名称
                        </div>
                      </th>
                      <th className="py-4 px-4 font-bold text-left border-b border-r border-slate-200 text-slate-700 w-1/4">
                        <div className="flex items-center gap-2">
                          <LayoutGrid size={16} className="text-slate-400" />
                          班组
                        </div>
                      </th>
                      <th className="py-4 px-4 font-bold text-left border-b border-r border-slate-200 text-slate-700 w-1/4">
                        <div className="flex items-center gap-2">
                          <LayoutGrid size={16} className="text-slate-400" />
                          车间
                        </div>
                      </th>
                      <th className="py-4 px-4 w-14 border-b border-r border-slate-200 bg-slate-50"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resources.map((item, idx) => ({ item, idx }))
                      .filter(({ item }) => 
                        selectedTeams.length === 0 || selectedTeams.includes(item.team || '')
                      ).map(({ item, idx }) => {
                      const rowModified = isRowModified(item);
                      return (
                        <tr key={item.id} className={cn(
                          "group transition-all duration-200",
                          rowModified ? "bg-amber-50/30 hover:bg-amber-50/50" : "hover:bg-emerald-50/10"
                        )}>
                          <td className={cn(
                            "py-3 px-4 font-semibold border-r border-slate-100 transition-colors",
                            rowModified ? "bg-amber-50/50 group-hover:bg-amber-50/60" : "bg-white group-hover:bg-emerald-50/20",
                            isFieldModified(item, 'id') ? "text-amber-600" : "text-slate-700"
                          )}>
                            <div className="flex items-center gap-2">
                              {isFieldModified(item, 'id') && <AlertCircle size={12} className="text-amber-500 shrink-0" />}
                              <input 
                                type="text" 
                                value={item.id}
                                onChange={(e) => {
                                  const newRes = [...resources];
                                  newRes[idx].id = e.target.value;
                                  setResources(newRes);
                                }}
                                placeholder="资源组ID"
                                className="bg-transparent border-none focus:ring-2 focus:ring-emerald-500/20 rounded px-2 py-1 w-full font-semibold transition-all outline-none placeholder:text-slate-400 placeholder:font-normal"
                                title={item.original ? `原始值: ${item.original.id}` : undefined}
                              />
                            </div>
                          </td>
                          <td className={cn(
                            "py-3 px-4 font-semibold border-r border-slate-100 transition-colors",
                            isFieldModified(item, 'groupName') ? "bg-amber-50/50 text-amber-600" : "text-slate-700"
                          )}>
                            <div className="flex items-center gap-2">
                              {isFieldModified(item, 'groupName') && <AlertCircle size={12} className="text-amber-500 shrink-0" />}
                              <input 
                                type="text" 
                                value={item.groupName}
                                onChange={(e) => {
                                  const newRes = [...resources];
                                  newRes[idx].groupName = e.target.value;
                                  setResources(newRes);
                                }}
                                placeholder="资源组名称"
                                className="bg-transparent border-none focus:ring-2 focus:ring-emerald-500/20 rounded px-2 py-1 w-full font-semibold transition-all outline-none placeholder:text-slate-400 placeholder:font-normal"
                                title={item.original ? `原始值: ${item.original.groupName}` : undefined}
                              />
                            </div>
                          </td>
                          <td className={cn(
                            "py-3 px-4 font-semibold border-r border-slate-100 transition-colors",
                            isFieldModified(item, 'team') ? "bg-amber-50/50 text-amber-600" : "text-slate-700"
                          )}>
                            <div className="flex items-center gap-2">
                              {isFieldModified(item, 'team') && <AlertCircle size={12} className="text-amber-500 shrink-0" />}
                              <Combobox 
                                value={item.team}
                                onChange={(val) => {
                                  const newRes = [...resources];
                                  newRes[idx].team = val;
                                  setResources(newRes);
                                }}
                                options={Array.from(new Set(resources.map(r => r.team).filter(Boolean)))}
                                title={item.original ? `原始值: ${item.original.team}` : undefined}
                                placeholder="班组"
                              />
                            </div>
                          </td>
                          <td className={cn(
                            "py-3 px-4 font-semibold border-r border-slate-100 transition-colors",
                            isFieldModified(item, 'workshop') ? "bg-amber-50/50 text-amber-600" : "text-slate-700"
                          )}>
                            <div className="flex items-center gap-2">
                              {isFieldModified(item, 'workshop') && <AlertCircle size={12} className="text-amber-500 shrink-0" />}
                              <Combobox 
                                value={item.workshop}
                                onChange={(val) => {
                                  const newRes = [...resources];
                                  newRes[idx].workshop = val;
                                  setResources(newRes);
                                }}
                                options={Array.from(new Set(resources.map(r => r.workshop).filter(Boolean)))}
                                title={item.original ? `原始值: ${item.original.workshop}` : undefined}
                                placeholder="车间"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right border-r border-slate-100">
                            <div className="flex items-center justify-end gap-1">
                              {rowModified && (
                                <button 
                                  onClick={() => restoreRow(idx, 'resource')}
                                  className="p-1.5 text-amber-500 hover:bg-amber-100 rounded-lg transition-all"
                                  title="恢复原始数据"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              )}
                              <button 
                                onClick={() => setResources(resources.filter(t => t.id !== item.id))}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="删除资源组"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Sidebar - Team Filter */}
            <div className="w-64 shrink-0 glass-card p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Filter size={18} className="text-emerald-600" />
                  班组筛选
                </h3>
                {selectedTeams.length > 0 && (
                  <button 
                    onClick={() => setSelectedTeams([])}
                    className="text-xs text-slate-500 hover:text-emerald-600 transition-colors"
                  >
                    清除
                  </button>
                )}
              </div>
              
              <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
                {uniqueTeams.length === 0 ? (
                  <div className="text-sm text-slate-500 text-center py-4">暂无班组数据</div>
                ) : (
                  uniqueTeams.map(team => (
                    <label key={team} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded-sm checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer"
                          checked={selectedTeams.includes(team)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeams(prev => [...prev, team]);
                            } else {
                              setSelectedTeams(prev => prev.filter(t => t !== team));
                            }
                          }}
                        />
                        <Check size={12} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" strokeWidth={3} />
                      </div>
                      <span className="text-sm text-slate-700 group-hover:text-slate-900">{team || '未命名班组'}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      case 'standard-time':
        return (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="glass-card p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Timer size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">标准工时列表</h3>
                    <p className="text-sm text-slate-500">共 {standardTimes.length} 条记录</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Clear Action */}
                  <button 
                    onClick={() => {
                      if (isConfirmingClear) {
                        setStandardTimes([]);
                        setIsConfirmingClear(false);
                      } else {
                        setIsConfirmingClear(true);
                        setTimeout(() => setIsConfirmingClear(false), 3000);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all border text-sm",
                      isConfirmingClear 
                        ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-100 animate-pulse" 
                        : "bg-white text-slate-400 border-slate-200 hover:text-red-500 hover:border-red-100 hover:bg-red-50"
                    )}
                  >
                    <Trash2 size={16} />
                    <span>{isConfirmingClear ? '确认清空?' : '清空'}</span>
                  </button>

                  <div className="h-6 w-px bg-slate-200 mx-1" />

                  {/* Data Management Group */}
                  <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.csv,.xlsx,.xls';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const arrayBuffer = event.target?.result as ArrayBuffer;
                              let workbook;
                              
                              if (file.name.toLowerCase().endsWith('.csv')) {
                                let text;
                                try {
                                  const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
                                  text = utf8Decoder.decode(arrayBuffer);
                                } catch (e) {
                                  const gbkDecoder = new TextDecoder('gbk');
                                  text = gbkDecoder.decode(arrayBuffer);
                                }
                                workbook = XLSX.read(text, { type: 'string' });
                              } else {
                                workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
                              }
                              
                              const sheetName = workbook.SheetNames[0];
                              const worksheet = workbook.Sheets[sheetName];
                              const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                              
                              if (rawRows.length === 0) {
                                addNotification('error', '文件内容为空');
                                return;
                              }

                              // 1. Find Header Row and Validate
                              let headerIndex = -1;
                              const requiredKeywords = ['班组', '人员', '设备'];
                              
                              for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
                                const row = rawRows[i];
                                if (!row) continue;
                                
                                const rowText = row.join('|');
                                const matchCount = requiredKeywords.filter(kw => rowText.includes(kw)).length;
                                
                                // If at least 2 keywords match, we consider this the header row
                                if (matchCount >= 2) {
                                  headerIndex = i;
                                  break;
                                }
                              }

                              if (headerIndex === -1) {
                                addNotification('error', '验证失败：未找到包含“班组”、“人员”、“设备”等关键词的表头。');
                                return;
                              }

                              // 2. Extract Data
                              const dataRows = rawRows.slice(headerIndex + 1);
                              const validRows = dataRows.filter(row => row && row.length > 0 && row[0] !== undefined && String(row[0]).trim() !== '');
                              
                              if (validRows.length === 0) {
                                addNotification('error', '未检测到有效的班组数据行');
                                return;
                              }

                              const formattedData = validRows.map((row, index) => {
                                const data = {
                                  id: `import-${Date.now()}-${index}`,
                                  groupName: String(row[0]).trim() || '未知班组',
                                  peopleCount: parseFloat(row[1]) || 0,
                                  peopleShifts: parseFloat(row[2]) || 1,
                                  peopleDuration: parseFloat(row[3]) || 8,
                                  peopleOee: parseFloat(row[4]) || 0.85,
                                  machineCount: parseFloat(row[5]) || 0,
                                  machineShifts: parseFloat(row[6]) || 1,
                                  machineDuration: parseFloat(row[7]) || 8,
                                  machineOee: parseFloat(row[8]) || 0.85
                                };
                                return {
                                  ...data,
                                  original: {
                                    groupName: data.groupName,
                                    peopleCount: data.peopleCount,
                                    peopleShifts: data.peopleShifts,
                                    peopleDuration: data.peopleDuration,
                                    peopleOee: data.peopleOee,
                                    machineCount: data.machineCount,
                                    machineShifts: data.machineShifts,
                                    machineDuration: data.machineDuration,
                                    machineOee: data.machineOee
                                  }
                                };
                              });

                              setStandardTimes(formattedData);
                              addNotification('success', `导入成功！已成功验证并导入 ${formattedData.length} 行数据。`);
                            } catch (err) {
                              console.error('Import failed:', err);
                              addNotification('error', '导入失败，请检查文件格式');
                            }
                          };
                          reader.readAsArrayBuffer(file);
                        };
                        input.click();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-indigo-600 rounded-lg transition-all font-medium text-sm"
                    >
                      <Upload size={14} />
                      <span>导入</span>
                    </button>
                    <button 
                      onClick={() => {
                        const exportData = standardTimes.map(item => ({
                          '班组名称': item.groupName,
                          '人员数量': item.peopleCount,
                          '人员班次': item.peopleShifts,
                          '人员时长(H)': item.peopleDuration,
                          '人员OEE': item.peopleOee,
                          '设备数量': item.machineCount,
                          '设备班次': item.machineShifts,
                          '设备时长(H)': item.machineDuration,
                          '设备OEE': item.machineOee
                        }));
                        
                        const worksheet = XLSX.utils.json_to_sheet(exportData);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, "标准工时");
                        XLSX.writeFile(workbook, "标准工时明细.xlsx");
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-indigo-600 rounded-lg transition-all font-medium text-sm"
                    >
                      <Download size={14} />
                      <span>导出</span>
                    </button>
                  </div>

                  {/* Primary Action */}
                  <button 
                    onClick={() => {
                      const newId = Math.random().toString(36).substr(2, 9);
                      setStandardTimes([{ 
                        id: newId, 
                        groupName: '', 
                        peopleCount: '' as any, 
                        peopleShifts: '' as any, 
                        peopleDuration: '' as any, 
                        peopleOee: '' as any,
                        machineCount: '' as any,
                        machineShifts: '' as any,
                        machineDuration: '' as any,
                        machineOee: '' as any
                      }, ...standardTimes]);
                    }}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 text-sm"
                  >
                    <Plus size={18} />
                    添加班组
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[650px] border border-slate-200 rounded-2xl shadow-sm bg-white">
                <table className="w-full text-sm text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-50">
                      <th rowSpan={2} className="py-5 px-4 font-bold text-slate-600 border-b border-r border-slate-200 min-w-[160px] sticky left-0 z-30 bg-slate-50">
                        <div className="flex items-center gap-2">
                          <LayoutGrid size={16} className="text-slate-400" />
                          <span>班组名称</span>
                        </div>
                      </th>
                      <th colSpan={4} className="py-3 font-bold text-center border-b border-r border-slate-200 text-indigo-600 bg-indigo-50/50">
                        人员 <span className="text-xs font-normal opacity-60 ml-1">Personnel</span>
                      </th>
                      <th colSpan={4} className="py-3 font-bold text-center border-b border-r border-slate-200 text-emerald-600 bg-emerald-50/50">
                        设备 <span className="text-xs font-normal opacity-60 ml-1">Equipment</span>
                      </th>
                      <th rowSpan={2} className="py-5 px-4 w-14 border-b border-r border-slate-200 bg-slate-50"></th>
                    </tr>
                    <tr className="bg-slate-50">
                      <th className="py-3 px-2 font-bold text-center border-b border-r border-slate-200 text-slate-500 bg-slate-50">数量</th>
                      <th className="py-3 px-2 font-bold text-center border-b border-r border-slate-200 text-slate-500 bg-slate-50">班次</th>
                      <th className="py-3 px-2 font-bold text-center border-b border-r border-slate-200 text-slate-500 bg-slate-50">时长(H)</th>
                      <th className="py-3 px-2 font-bold text-center border-b border-r border-slate-200 text-slate-500 bg-slate-50">OEE</th>
                      <th className="py-3 px-2 font-bold text-center border-b border-r border-slate-200 text-slate-500 bg-slate-50">数量</th>
                      <th className="py-3 px-2 font-bold text-center border-b border-r border-slate-200 text-slate-500 bg-slate-50">班次</th>
                      <th className="py-3 px-2 font-bold text-center border-b border-r border-slate-200 text-slate-500 bg-slate-50">时长(H)</th>
                      <th className="py-3 px-2 font-bold text-center border-b border-r border-slate-200 text-slate-500 bg-slate-50">OEE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {standardTimes.map((item, idx) => {
                      const rowModified = isRowModified(item);
                      return (
                        <tr key={item.id} className={cn(
                          "group transition-all duration-200",
                          rowModified ? "bg-amber-50/30 hover:bg-amber-50/50" : "hover:bg-indigo-50/20"
                        )}>
                          <td className={cn(
                            "py-3 px-4 font-semibold border-r border-slate-100 sticky left-0 z-10 transition-colors",
                            rowModified ? "bg-amber-50/50 group-hover:bg-amber-50/60" : "bg-white group-hover:bg-indigo-50/30",
                            isFieldModified(item, 'groupName') ? "text-amber-600" : "text-slate-700"
                          )}>
                            <div className="flex items-center gap-2">
                              {isFieldModified(item, 'groupName') && <AlertCircle size={12} className="text-amber-500 shrink-0" />}
                              <input 
                                type="text" 
                                value={item.groupName}
                                onChange={(e) => {
                                  const newTimes = [...standardTimes];
                                  newTimes[idx].groupName = e.target.value;
                                  setStandardTimes(newTimes);
                                }}
                                placeholder="班组名称"
                                className="bg-transparent border-none focus:ring-2 focus:ring-indigo-500/20 rounded px-2 py-1 w-full font-semibold transition-all outline-none placeholder:text-slate-400 placeholder:font-normal"
                                title={item.original ? `原始值: ${item.original.groupName}` : undefined}
                              />
                            </div>
                          </td>
                          {/* People Section */}
                          <td className={cn("py-3 px-1 border-r border-slate-100", isFieldModified(item, 'peopleCount') && "bg-amber-50/50")}>
                            <input 
                              type="number" 
                              value={item.peopleCount === '' as any ? '' : item.peopleCount}
                              onChange={(e) => {
                                const newTimes = [...standardTimes];
                                newTimes[idx].peopleCount = e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0;
                                setStandardTimes(newTimes);
                              }}
                              placeholder="数量"
                              className={cn(
                                "w-full bg-transparent border-none text-center focus:ring-2 focus:ring-indigo-500/20 rounded py-1 font-mono transition-all outline-none placeholder:text-slate-300 placeholder:font-sans",
                                isFieldModified(item, 'peopleCount') ? "text-amber-600 font-bold" : "text-slate-600"
                              )}
                              title={item.original ? `原始值: ${item.original.peopleCount}` : undefined}
                            />
                          </td>
                          <td className={cn("py-3 px-1 border-r border-slate-100", isFieldModified(item, 'peopleShifts') && "bg-amber-50/50")}>
                            <input 
                              type="number" 
                              value={item.peopleShifts === '' as any ? '' : item.peopleShifts}
                              onChange={(e) => {
                                const newTimes = [...standardTimes];
                                newTimes[idx].peopleShifts = e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0;
                                setStandardTimes(newTimes);
                              }}
                              placeholder="班次"
                              className={cn(
                                "w-full bg-transparent border-none text-center focus:ring-2 focus:ring-indigo-500/20 rounded py-1 font-mono transition-all outline-none placeholder:text-slate-300 placeholder:font-sans",
                                isFieldModified(item, 'peopleShifts') ? "text-amber-600 font-bold" : "text-slate-600"
                              )}
                              title={item.original ? `原始值: ${item.original.peopleShifts}` : undefined}
                            />
                          </td>
                          <td className={cn("py-3 px-1 border-r border-slate-100", isFieldModified(item, 'peopleDuration') && "bg-amber-50/50")}>
                            <input 
                              type="number" 
                              value={item.peopleDuration === '' as any ? '' : item.peopleDuration}
                              onChange={(e) => {
                                const newTimes = [...standardTimes];
                                newTimes[idx].peopleDuration = e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0;
                                setStandardTimes(newTimes);
                              }}
                              placeholder="时长"
                              className={cn(
                                "w-full bg-transparent border-none text-center focus:ring-2 focus:ring-indigo-500/20 rounded py-1 font-mono transition-all outline-none placeholder:text-slate-300 placeholder:font-sans",
                                isFieldModified(item, 'peopleDuration') ? "text-amber-600 font-bold" : "text-slate-600"
                              )}
                              title={item.original ? `原始值: ${item.original.peopleDuration}` : undefined}
                            />
                          </td>
                          <td className={cn("py-3 px-1 border-r border-slate-100", isFieldModified(item, 'peopleOee') && "bg-amber-50/50")}>
                            <input 
                              type="number" 
                              step="0.01"
                              value={item.peopleOee === '' as any ? '' : item.peopleOee}
                              onChange={(e) => {
                                const newTimes = [...standardTimes];
                                newTimes[idx].peopleOee = e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0;
                                setStandardTimes(newTimes);
                              }}
                              placeholder="OEE"
                              className={cn(
                                "w-full bg-transparent border-none text-center focus:ring-2 focus:ring-indigo-500/20 rounded py-1 font-mono transition-all outline-none placeholder:text-slate-300 placeholder:font-sans",
                                isFieldModified(item, 'peopleOee') ? "text-amber-600 font-bold" : "text-indigo-600 font-medium"
                              )}
                              title={item.original ? `原始值: ${item.original.peopleOee}` : undefined}
                            />
                          </td>
                          {/* Machine Section */}
                          <td className={cn("py-3 px-1 border-r border-slate-100 bg-emerald-50/5 group-hover:bg-emerald-50/10 transition-colors", isFieldModified(item, 'machineCount') && "bg-amber-50/50")}>
                            <input 
                              type="number" 
                              value={item.machineCount === '' as any ? '' : item.machineCount}
                              onChange={(e) => {
                                const newTimes = [...standardTimes];
                                newTimes[idx].machineCount = e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0;
                                setStandardTimes(newTimes);
                              }}
                              placeholder="数量"
                              className={cn(
                                "w-full bg-transparent border-none text-center focus:ring-2 focus:ring-emerald-500/20 rounded py-1 font-mono transition-all outline-none placeholder:text-slate-300 placeholder:font-sans",
                                isFieldModified(item, 'machineCount') ? "text-amber-600 font-bold" : "text-slate-600"
                              )}
                              title={item.original ? `原始值: ${item.original.machineCount}` : undefined}
                            />
                          </td>
                          <td className={cn("py-3 px-1 border-r border-slate-100 bg-emerald-50/5 group-hover:bg-emerald-50/10 transition-colors", isFieldModified(item, 'machineShifts') && "bg-amber-50/50")}>
                            <input 
                              type="number" 
                              value={item.machineShifts === '' as any ? '' : item.machineShifts}
                              onChange={(e) => {
                                const newTimes = [...standardTimes];
                                newTimes[idx].machineShifts = e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0;
                                setStandardTimes(newTimes);
                              }}
                              placeholder="班次"
                              className={cn(
                                "w-full bg-transparent border-none text-center focus:ring-2 focus:ring-emerald-500/20 rounded py-1 font-mono transition-all outline-none placeholder:text-slate-300 placeholder:font-sans",
                                isFieldModified(item, 'machineShifts') ? "text-amber-600 font-bold" : "text-slate-600"
                              )}
                              title={item.original ? `原始值: ${item.original.machineShifts}` : undefined}
                            />
                          </td>
                          <td className={cn("py-3 px-1 border-r border-slate-100 bg-emerald-50/5 group-hover:bg-emerald-50/10 transition-colors", isFieldModified(item, 'machineDuration') && "bg-amber-50/50")}>
                            <input 
                              type="number" 
                              value={item.machineDuration === '' as any ? '' : item.machineDuration}
                              onChange={(e) => {
                                const newTimes = [...standardTimes];
                                newTimes[idx].machineDuration = e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0;
                                setStandardTimes(newTimes);
                              }}
                              placeholder="时长"
                              className={cn(
                                "w-full bg-transparent border-none text-center focus:ring-2 focus:ring-emerald-500/20 rounded py-1 font-mono transition-all outline-none placeholder:text-slate-300 placeholder:font-sans",
                                isFieldModified(item, 'machineDuration') ? "text-amber-600 font-bold" : "text-slate-600"
                              )}
                              title={item.original ? `原始值: ${item.original.machineDuration}` : undefined}
                            />
                          </td>
                          <td className={cn("py-3 px-1 border-r border-slate-100 bg-emerald-50/5 group-hover:bg-emerald-50/10 transition-colors", isFieldModified(item, 'machineOee') && "bg-amber-50/50")}>
                            <input 
                              type="number" 
                              step="0.01"
                              value={item.machineOee === '' as any ? '' : item.machineOee}
                              onChange={(e) => {
                                const newTimes = [...standardTimes];
                                newTimes[idx].machineOee = e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0;
                                setStandardTimes(newTimes);
                              }}
                              placeholder="OEE"
                              className={cn(
                                "w-full bg-transparent border-none text-center focus:ring-2 focus:ring-emerald-500/20 rounded py-1 font-mono transition-all outline-none placeholder:text-slate-300 placeholder:font-sans",
                                isFieldModified(item, 'machineOee') ? "text-amber-600 font-bold" : "text-emerald-600 font-medium"
                              )}
                              title={item.original ? `原始值: ${item.original.machineOee}` : undefined}
                            />
                          </td>
                          <td className="py-3 px-4 text-right border-r border-slate-100">
                            <div className="flex items-center justify-end gap-1">
                              {rowModified && (
                                <button 
                                  onClick={() => restoreRow(idx, 'standard')}
                                  className="p-1.5 text-amber-500 hover:bg-amber-100 rounded-lg transition-all"
                                  title="恢复原始数据"
                                >
                                  <RotateCcw size={14} />
                                </button>
                              )}
                              <button 
                                onClick={() => setStandardTimes(standardTimes.filter(t => t.id !== item.id))}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="删除班组"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'calendar':
        return <ProductionCalendar settings={settings} onSettingsChange={setSettings} />;
      case 'settings':
        return (
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">系统设置</h2>
              </div>
              <button
                onClick={() => {
                  addNotification('success', '系统配置已成功保存并应用');
                  setActiveTab('analysis');
                }}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 group text-sm"
              >
                <Save size={16} className="group-hover:scale-110 transition-transform" />
                保存所有配置
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 items-start gap-6">
              {/* 班组排序设置 */}
              <div className="glass-card p-6 lg:col-span-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                    <ListOrdered size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">班组展示优先级</h3>
                    <p className="text-xs text-slate-500">自定义班组在图表和表格中的显示顺序（从高到低，每行一个班组）</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <DraggableTeamList 
                      teams={settings.teamOrder || DEFAULT_TEAM_ORDER}
                      onChange={(newOrder) => setSettings({ ...settings, teamOrder: newOrder })}
                    />
                    <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      提示：系统会根据上述关键词匹配班组名称。未匹配到的班组将按拼音顺序排在最后。
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setSettings({ ...settings, teamOrder: DEFAULT_TEAM_ORDER })}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      恢复默认排序
                    </button>
                  </div>
                </div>
              </div>

              {/* 数据与安全 */}
              <div className="glass-card p-6 lg:col-span-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                    <Database size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">数据管理</h3>
                    <p className="text-xs text-slate-500">管理浏览器本地持久化数据与备份</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">自动保存更改</span>
                    <button
                      onClick={() => setSettings({ ...settings, enableAutoSave: !settings.enableAutoSave })}
                      className={cn(
                        "w-10 h-5 rounded-full transition-colors relative",
                        settings.enableAutoSave ? "bg-emerald-500" : "bg-slate-200"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                        settings.enableAutoSave ? "left-5.5" : "left-0.5"
                      )} />
                    </button>
                  </div>
                  <button 
                    onClick={handleBackup}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    <RotateCcw size={14} />
                    导出数据备份 (JSON)
                  </button>
                  <button 
                    onClick={handleClearCache}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-all"
                  >
                    <Trash2 size={14} />
                    清空浏览器缓存
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      default:
        return <div className="p-8 text-center text-slate-400">功能开发中...</div>;
    }
  };

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-brand-dark text-white flex items-center justify-between px-6 sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-4">
          <Menu 
            className="text-slate-400 cursor-pointer hover:text-white transition-colors" 
            size={20} 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          />
          <div className="flex items-center gap-3">
            <div className="h-10 flex items-center">
              <img 
                src="/logo.png" 
                alt="Hongshi Logo" 
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  // Fallback to stylized H if image not found
                  e.currentTarget.style.display = 'none';
                  const placeholder = document.createElement('div');
                  placeholder.className = "w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center font-bold text-lg shadow-inner";
                  placeholder.innerText = "H";
                  e.currentTarget.parentElement!.appendChild(placeholder);
                }}
              />
            </div>
            <div className="w-px h-6 bg-white/20 mx-1"></div>
            <div>
              <h1 className="text-lg font-bold leading-none tracking-tight">产能负荷分析</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Capacity Load Analysis</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-slate-400">
            <Bell size={18} className="cursor-pointer hover:text-white transition-colors" />
          </div>
          <div className="flex items-center gap-3 pl-6 border-l border-slate-700">
            <div className="text-right">
              <p className="text-sm font-semibold">管理员</p>
              <p className="text-[10px] text-slate-500">生产计划部</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
              <User size={20} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "bg-white border-r border-slate-200 flex flex-col shadow-sm z-40 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64" : "w-20"
        )}>
          <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={cn(
                  "w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group",
                  activeTab === item.id 
                    ? "bg-brand-red/5 text-brand-red shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                  !isSidebarOpen && "justify-center px-0"
                )}
              >
                <div className={cn("flex items-center gap-3", !isSidebarOpen && "gap-0")}>
                  <item.icon size={20} className={cn(
                    "transition-transform duration-200 shrink-0",
                    activeTab === item.id ? "scale-110" : "group-hover:scale-110"
                  )} />
                  <AnimatePresence>
                    {isSidebarOpen && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="text-sm font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {isSidebarOpen && activeTab === item.id && <ChevronRight size={14} className="opacity-50 shrink-0 ml-auto" />}
              </button>
            ))}
          </nav>
          
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('settings')}
              className={cn(
                "w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group",
                activeTab === 'settings' 
                  ? "bg-slate-100 text-slate-900" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                !isSidebarOpen && "justify-center px-0"
              )}
            >
              <div className={cn("flex items-center gap-3", !isSidebarOpen && "gap-0")}>
                <Settings size={20} className="shrink-0" />
                <AnimatePresence>
                  {isSidebarOpen && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      系统设置
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {/* Notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border min-w-[300px]",
                n.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                n.type === 'error' ? "bg-red-50 border-red-100 text-red-800" :
                "bg-indigo-50 border-indigo-100 text-indigo-800"
              )}
            >
              {n.type === 'success' ? <Check size={18} className="text-emerald-500" /> :
               n.type === 'error' ? <X size={18} className="text-red-500" /> :
               <Bell size={18} className="text-indigo-500" />}
              <span className="font-medium text-sm">{n.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
