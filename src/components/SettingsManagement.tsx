import React from 'react';
import { 
  Shield, 
  Database, 
  RotateCcw, 
  Trash2, 
  ListOrdered, 
  AlertCircle, 
  Save 
} from 'lucide-react';
import { cn } from '../utils';
import { SystemSettings } from '../types';
import { DraggableTeamList } from './DraggableTeamList';

interface SettingsManagementProps {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  DEFAULT_TEAM_ORDER: string[];
  handleBackup: () => void;
  handleClearCache: () => void;
  addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  setActiveTab: (tab: any) => void;
}

export default function SettingsManagement({
  settings,
  setSettings,
  DEFAULT_TEAM_ORDER,
  handleBackup,
  handleClearCache,
  addNotification,
  setActiveTab
}: SettingsManagementProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-end justify-between mb-2">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">系统设置</h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
          <Shield size={12} />
          <span>数据已加密存储于浏览器本地</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 数据与安全 */}
        <div className="glass-card p-6">
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

        {/* 班组排序设置 */}
        <div className="glass-card p-6 md:col-span-2">
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

      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={() => {
            addNotification('success', '系统配置已成功保存并应用');
            setActiveTab('analysis');
          }}
          className="flex items-center gap-2 bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 group"
        >
          <Save size={20} className="group-hover:scale-110 transition-transform" />
          保存所有配置
        </button>
      </div>
    </div>
  );
}
