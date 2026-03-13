import React from 'react';
import { Settings as SettingsIcon, Database, Shield, Bell, Save } from 'lucide-react';

export function Settings() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <SettingsIcon size={22} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">系统设置</h3>
            <p className="text-sm text-slate-500">管理您的偏好与系统配置</p>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Database size={18} className="text-slate-400" />
              <h4 className="font-bold text-slate-800">数据管理</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <p className="text-sm font-bold text-slate-700 mb-1">自动保存</p>
                <p className="text-xs text-slate-500 mb-3">修改后自动同步到本地存储</p>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-5 bg-indigo-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                  </div>
                  <span className="text-xs font-bold text-indigo-600">已开启</span>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <p className="text-sm font-bold text-slate-700 mb-1">数据备份</p>
                <p className="text-xs text-slate-500 mb-3">每24小时自动导出备份文件</p>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-5 bg-slate-200 rounded-full relative cursor-pointer">
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
                  </div>
                  <span className="text-xs font-bold text-slate-400">已关闭</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} className="text-slate-400" />
              <h4 className="font-bold text-slate-800">通知偏好</h4>
            </div>
            <div className="space-y-3">
              {[
                { label: '产能预警通知', desc: '当班组负载率超过90%时发送提醒' },
                { label: '导入导出成功提醒', desc: '完成数据操作后显示成功提示' },
                { label: '系统更新公告', desc: '接收新功能上线与维护通知' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-slate-700">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <div className="w-10 h-5 bg-indigo-600 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
              <Save size={18} />
              保存设置
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card p-8 border-red-100 bg-red-50/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <Shield size={22} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-red-900">危险区域</h3>
            <p className="text-sm text-red-600/70">这些操作不可撤销，请谨慎操作</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-white">
          <div>
            <p className="text-sm font-bold text-slate-900">重置所有数据</p>
            <p className="text-xs text-slate-500">删除所有标准工时、资源与需求记录</p>
          </div>
          <button className="px-4 py-2 text-red-600 font-bold text-xs border border-red-200 rounded-lg hover:bg-red-50 transition-all">
            立即重置
          </button>
        </div>
      </div>
    </div>
  );
}
