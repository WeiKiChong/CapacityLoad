import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { SystemSettings } from '../types';
import { CalendarMonth } from './ProductionCalendar/CalendarMonth';

interface ProductionCalendarProps {
  settings: SystemSettings;
  onSettingsChange: (newSettings: SystemSettings) => void;
}

export default function ProductionCalendar({ settings, onSettingsChange }: ProductionCalendarProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(selectedYear, i, 1);
      return {
        index: i,
        name: date.toLocaleString('zh-CN', { month: 'long' }),
        daysInMonth: new Date(selectedYear, i + 1, 0).getDate(),
        firstDayOfWeek: date.getDay()
      };
    });
  }, [selectedYear]);

  const isWorkingDay = (year: number, month: number, day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (settings.calendarOverrides?.[dateKey] !== undefined) {
      return settings.calendarOverrides[dateKey];
    }
    
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const isSunday = dayOfWeek === 0;
    
    let isRest = false;
    if (isSunday) isRest = true;
    
    if (settings.customHolidays?.includes(dateKey)) isRest = true;
    
    return !isRest;
  };

  const toggleDay = (year: number, month: number, day: number) => {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentStatus = isWorkingDay(year, month, day);
    const newStatus = !currentStatus;
    
    const newOverrides = { ...(settings.calendarOverrides || {}) };
    newOverrides[dateKey] = newStatus;
    
    onSettingsChange({
      ...settings,
      calendarOverrides: newOverrides
    });
  };

  const getMonthlyStats = (monthIndex: number) => {
    const month = months[monthIndex];
    let workingDays = 0;
    for (let d = 1; d <= month.daysInMonth; d++) {
      if (isWorkingDay(selectedYear, monthIndex, d)) workingDays++;
    }
    return {
      workingDays,
      restDays: month.daysInMonth - workingDays
    };
  };

  const batchAction = (type: 'weekends-single' | 'weekends-double' | 'all-working', monthIndex: number) => {
    const newOverrides = { ...(settings.calendarOverrides || {}) };
    const month = months[monthIndex];
    
    for (let d = 1; d <= month.daysInMonth; d++) {
      const date = new Date(selectedYear, monthIndex, d);
      const dateKey = `${selectedYear}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isSunday = dayOfWeek === 0;
      
      if (type === 'all-working') {
        newOverrides[dateKey] = true;
      } else if (type === 'weekends-single') {
        newOverrides[dateKey] = !isSunday;
      } else if (type === 'weekends-double') {
        newOverrides[dateKey] = !isWeekend;
      }
    }
    
    onSettingsChange({
      ...settings,
      calendarOverrides: newOverrides
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-red/10 text-brand-red flex items-center justify-center shadow-sm">
              <CalendarIcon size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">生产日历</h2>
              <p className="text-sm text-slate-500">配置全厂生产节拍与工作日，直接点击日期切换状态</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setSelectedYear(prev => prev - 1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-xl font-bold text-slate-800 px-4 min-w-[100px] text-center">
            {selectedYear} 年
          </span>
          <button 
            onClick={() => setSelectedYear(prev => prev + 1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {months.map((month, mIdx) => (
          <CalendarMonth
            key={month.name}
            month={month}
            selectedYear={selectedYear}
            isWorkingDay={isWorkingDay}
            toggleDay={toggleDay}
            batchAction={batchAction}
            stats={getMonthlyStats(mIdx)}
          />
        ))}
      </div>
    </div>
  );
}
