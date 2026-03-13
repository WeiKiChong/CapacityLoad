import React from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Trash2, 
  Upload, 
  Download, 
  Plus, 
  LayoutGrid, 
  AlertCircle, 
  RotateCcw, 
  X, 
  Filter, 
  Check 
} from 'lucide-react';
import { cn } from '../utils';
import { ProductionResource } from '../types';
import Combobox from './Combobox';

interface ResourceManagementProps {
  resources: ProductionResource[];
  setResources: React.Dispatch<React.SetStateAction<ProductionResource[]>>;
  selectedTeams: string[];
  setSelectedTeams: React.Dispatch<React.SetStateAction<string[]>>;
  uniqueTeams: string[];
  isConfirmingClearResources: boolean;
  setIsConfirmingClearResources: (val: boolean) => void;
  isRowModified: (item: any) => boolean;
  isFieldModified: (item: any, field: string) => boolean;
  restoreRow: (idx: number, type: 'standard' | 'resource' | 'demand') => void;
  addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function ResourceManagement({
  resources,
  setResources,
  selectedTeams,
  setSelectedTeams,
  uniqueTeams,
  isConfirmingClearResources,
  setIsConfirmingClearResources,
  isRowModified,
  isFieldModified,
  restoreRow,
  addNotification
}: ResourceManagementProps) {
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
}
