import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { Notification } from '../types';
import { cn } from '../utils';

interface Props {
  notifications: Notification[];
}

export function Header({ notifications }: Props) {
  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4 bg-slate-100/50 px-4 py-2 rounded-xl border border-slate-200/50 w-96 group focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
        <Search size={18} className="text-slate-400 group-focus-within:text-indigo-500" />
        <input 
          type="text" 
          placeholder="Search analytics, reports..." 
          className="bg-transparent border-none outline-none text-sm w-full text-slate-600 placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group cursor-pointer">
          <div className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all relative">
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            )}
          </div>
          
          {/* Notifications Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50 overflow-hidden">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm">Notifications</h4>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {notifications.length} New
              </span>
            </div>
            <div className="max-h-96 overflow-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-400">No new notifications</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                      n.type === 'success' ? "bg-emerald-500" : n.type === 'error' ? "bg-red-500" : "bg-indigo-500"
                    )} />
                    <div>
                      <p className="text-sm text-slate-700 leading-snug">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">Just now</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900 leading-none mb-1">Admin User</p>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Production Manager</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <User size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}
