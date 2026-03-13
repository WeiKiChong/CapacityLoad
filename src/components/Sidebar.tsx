import React from 'react';
import { LayoutDashboard, Timer, Users, ShoppingCart, Settings } from 'lucide-react';
import { cn } from '../utils';

type Tab = 'dashboard' | 'standard' | 'resource' | 'demand' | 'settings';

interface Props {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

export function Sidebar({ activeTab, setActiveTab }: Props) {
  const menuItems: { id: Tab; icon: any; label: string; desc: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: '产能看板', desc: 'Capacity Overview' },
    { id: 'standard', icon: Timer, label: '标准工时', desc: 'Standard Time' },
    { id: 'resource', icon: Users, label: '资源明细', desc: 'Resource Details' },
    { id: 'demand', icon: ShoppingCart, label: '需求明细', desc: 'Demand Details' },
    { id: 'settings', icon: Settings, label: '系统设置', desc: 'Settings' },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen z-40">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Capacity Pro</h1>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest opacity-70">Production Analysis</p>
          </div>
        </div>

        <nav className="space-y-1.5">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
                activeTab === item.id 
                  ? "bg-indigo-50 text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {activeTab === item.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-full" />
              )}
              <item.icon size={20} className={cn(
                "transition-transform duration-300",
                activeTab === item.id ? "scale-110" : "group-hover:scale-110"
              )} />
              <div className="text-left">
                <p className="font-bold text-sm leading-none mb-1">{item.label}</p>
                <p className={cn(
                  "text-[10px] font-medium uppercase tracking-wider opacity-50",
                  activeTab === item.id ? "text-indigo-400" : "text-slate-400"
                )}>{item.desc}</p>
              </div>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6">
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">System Status</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            All systems operational. Data synchronized with local storage.
          </p>
        </div>
      </div>
    </aside>
  );
}
