import { useMemo } from 'react';
import { ProductionDemand, ProductionResource, StandardTime, AnalysisResult, SystemSettings, MonthlyTeamAnalysis } from '../types';
import { sortTeams } from '../utils';

export function useCapacityAnalysis(
  demands: ProductionDemand[],
  resources: ProductionResource[],
  standardTimes: StandardTime[],
  settings: SystemSettings
) {
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    // 1. Daily Data for Chart
    const teams = Array.from(new Set(resources.map(r => (r?.team || '其他').trim())));
    if (teams.length === 0) teams.push('其他');

    const dailyData: { date: string, team: string, load: number, humanCapacity: number, machineCapacity: number }[] = [];

    // Pre-process resources into a map for O(1) lookup
    const resourceMap = new Map<string, ProductionResource>();
    resources.forEach(r => resourceMap.set(r.id, r));

    const dailyLoadMap = new Map<string, number>(); // key: "YYYY-MM-DD_team"
    const monthlyTeamMap = new Map<string, MonthlyTeamAnalysis>();

    demands.forEach(demand => {
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

  return analysisResult;
}
