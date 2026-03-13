import React from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '../../utils';

interface Props {
  month: {
    index: number;
    name: string;
    daysInMonth: number;
    firstDayOfWeek: number;
  };
  selectedYear: number;
  isWorkingDay: (year: number, month: number, day: number) => boolean;
  toggleDay: (year: number, month: number, day: number) => void;
  batchAction: (type: 'weekends-single' | 'weekends-double' | 'all-working', monthIndex: number) => void;
  stats: {
    workingDays: number;
    restDays: number;
  };
}

export function CalendarMonth({ 
  month, 
  selectedYear, 
  isWorkingDay, 
  toggleDay, 
  batchAction, 
  stats 
}: Props) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: month.index * 0.05 }}
      className="glass-card overflow-hidden flex flex-col"
    >
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h4 className="font-bold text-slate-800">{month.name}</h4>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">工作天数</p>
          <p className="text-sm font-black text-blue-600">{stats.workingDays} 天</p>
        </div>
      </div>
      
      <div className="p-4 flex-1">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">
              {d}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: month.firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {Array.from({ length: month.daysInMonth }).map((_, i) => {
            const day = i + 1;
            const working = isWorkingDay(selectedYear, month.index, day);
            return (
              <button
                key={day}
                onClick={() => toggleDay(selectedYear, month.index, day)}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative group",
                  working 
                    ? "bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100" 
                    : "bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100"
                )}
              >
                <span className="text-xs font-bold">{day}</span>
                <div className={cn(
                  "w-1 h-1 rounded-full mt-0.5 transition-all",
                  working ? "bg-blue-500 scale-100" : "bg-transparent scale-0"
                )} />
                
                <div className={cn(
                  "absolute top-1 right-1 w-3 h-3 rounded-sm border flex items-center justify-center transition-all",
                  working 
                    ? "bg-blue-500 border-blue-500" 
                    : "bg-white border-slate-200 opacity-0 group-hover:opacity-100"
                )}>
                  {working && <Check size={8} className="text-white" strokeWidth={4} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-3 border-t border-slate-100 flex items-center justify-center gap-2 bg-slate-50/30">
        <button onClick={() => batchAction('weekends-single', month.index)} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:border-blue-300">单休</button>
        <button onClick={() => batchAction('weekends-double', month.index)} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:border-blue-300">双休</button>
        <button onClick={() => batchAction('all-working', month.index)} className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:border-blue-300">无休</button>
      </div>
    </motion.div>
  );
}
