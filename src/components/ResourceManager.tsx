import React from 'react';
import { Users, Trash2, Upload, Download, Plus, LayoutGrid, AlertCircle, RotateCcw, X } from 'lucide-react';
import { cn } from '../utils';
import { Resource } from '../types';
import * as XLSX from 'xlsx';

interface Props {
  resources: Resource[];
  setResources: (val: Resource[]) => void;
  isConfirmingClear: boolean;
  setIsConfirmingClear: (val: boolean) => void;
  addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  isRowModified: (item: Resource) => boolean;
  isFieldModified: (item: Resource, field: keyof NonNullable<Resource['original']>) => boolean;
  restoreRow: (idx: number, type: 'resource') => void;
}

export function ResourceManager({
  resources,
  setResources,
  isConfirmingClear,
  setIsConfirmingClear,
  addNotification,
  isRowModified,
  isFieldModified,
  restoreRow
}: Props) {
  const handleImport = () => {
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
          const requiredKeywords = ['资源', '类型', '组别'];
          
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
            addNotification('error', '验证失败：未找到包含“资源”、“类型”、“组别”等关键词的表头。');
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
              id: `import-${Date.now()}-${index}`,
              name: String(row[0]).trim() || '未知资源',
              type: (String(row[1]).trim() === '设备' ? 'machine' : 'people') as 'people' | 'machine',
              groupName: String(row[2]).trim() || '默认组',
              capacity: parseFloat(row[3]) || 0
            };
            return {
              ...data,
              original: {
                name: data.name,
                type: data.type,
                groupName: data.groupName,
                capacity: data.capacity
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
  };

  const handleExport = () => {
    const exportData = resources.map(item => ({
      '资源名称': item.name,
      '类型': item.type === 'people' ? '人员' : '设备',
      '所属组别': item.groupName,
      '单体产能(PCS/H)': item.capacity
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "资源明细");
    XLSX.writeFile(workbook, "资源明细.xlsx");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">资源明细列表</h3>
              <p className="text-sm text-slate-500">共 {resources.length} 条记录</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (isConfirmingClear) {
                  setResources([]);
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

            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
              <button 
                onClick={handleImport}
                className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-indigo-600 rounded-lg transition-all font-medium text-sm"
              >
                <Upload size={14} />
                <span>导入</span>
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-indigo-600 rounded-lg transition-all font-medium text-sm"
              >
                <Download size={14} />
                <span>导出</span>
              </button>
            </div>

            <button 
              onClick={() => {
                const newId = Math.random().toString(36).substr(2, 9);
                setResources([{ id: newId, name: '', type: 'people', groupName: '', capacity: '' as any }, ...resources]);
              }}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 text-sm"
            >
              <Plus size={18} />
              添加资源
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[650px] border border-slate-200 rounded-2xl shadow-sm bg-white">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50">
                <th className="py-4 px-4 font-bold text-slate-600 border-b border-r border-slate-200 min-w-[180px] sticky left-0 z-30 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <LayoutGrid size={16} className="text-slate-400" />
                    <span>资源名称</span>
                  </div>
                </th>
                <th className="py-4 px-4 font-bold text-slate-600 border-b border-r border-slate-200 text-center w-32">类型</th>
                <th className="py-4 px-4 font-bold text-slate-600 border-b border-r border-slate-200">所属组别</th>
                <th className="py-4 px-4 font-bold text-slate-600 border-b border-r border-slate-200 text-center w-40">单体产能(PCS/H)</th>
                <th className="py-4 px-4 w-14 border-b border-r border-slate-200 bg-slate-50"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {resources.map((item, idx) => {
                const rowModified = isRowModified(item);
                return (
                  <tr key={item.id} className={cn(
                    "group transition-all duration-200",
                    rowModified ? "bg-amber-50/30 hover:bg-amber-50/50" : "hover:bg-indigo-50/20"
                  )}>
                    <td className={cn(
                      "py-3 px-4 font-semibold border-r border-slate-100 sticky left-0 z-10 transition-colors",
                      rowModified ? "bg-amber-50/50 group-hover:bg-amber-50/60" : "bg-white group-hover:bg-indigo-50/30",
                      isFieldModified(item, 'name') ? "text-amber-600" : "text-slate-700"
                    )}>
                      <div className="flex items-center gap-2">
                        {isFieldModified(item, 'name') && <AlertCircle size={12} className="text-amber-500 shrink-0" />}
                        <input 
                          type="text" 
                          value={item.name}
                          onChange={(e) => {
                            const newResources = [...resources];
                            newResources[idx].name = e.target.value;
                            setResources(newResources);
                          }}
                          placeholder="资源名称"
                          className="bg-transparent border-none focus:ring-2 focus:ring-indigo-500/20 rounded px-2 py-1 w-full font-semibold transition-all outline-none placeholder:text-slate-400 placeholder:font-normal"
                          title={item.original ? `原始值: ${item.original.name}` : undefined}
                        />
                      </div>
                    </td>
                    <td className={cn("py-3 px-4 border-r border-slate-100 text-center", isFieldModified(item, 'type') && "bg-amber-50/50")}>
                      <select 
                        value={item.type}
                        onChange={(e) => {
                          const newResources = [...resources];
                          newResources[idx].type = e.target.value as 'people' | 'machine';
                          setResources(newResources);
                        }}
                        className={cn(
                          "bg-slate-100/50 border-none rounded-lg px-3 py-1 text-xs font-bold transition-all outline-none cursor-pointer",
                          item.type === 'people' ? "text-indigo-600" : "text-emerald-600",
                          isFieldModified(item, 'type') ? "ring-2 ring-amber-500/30" : ""
                        )}
                        title={item.original ? `原始值: ${item.original.type === 'people' ? '人员' : '设备'}` : undefined}
                      >
                        <option value="people">人员</option>
                        <option value="machine">设备</option>
                      </select>
                    </td>
                    <td className={cn("py-3 px-4 border-r border-slate-100", isFieldModified(item, 'groupName') && "bg-amber-50/50")}>
                      <input 
                        type="text" 
                        value={item.groupName}
                        onChange={(e) => {
                          const newResources = [...resources];
                          newResources[idx].groupName = e.target.value;
                          setResources(newResources);
                        }}
                        placeholder="所属组别"
                        className={cn(
                          "w-full bg-transparent border-none focus:ring-2 focus:ring-indigo-500/20 rounded px-2 py-1 transition-all outline-none placeholder:text-slate-300",
                          isFieldModified(item, 'groupName') ? "text-amber-600 font-bold" : "text-slate-600"
                        )}
                        title={item.original ? `原始值: ${item.original.groupName}` : undefined}
                      />
                    </td>
                    <td className={cn("py-3 px-4 border-r border-slate-100", isFieldModified(item, 'capacity') && "bg-amber-50/50")}>
                      <input 
                        type="number" 
                        value={item.capacity === '' as any ? '' : item.capacity}
                        onChange={(e) => {
                          const newResources = [...resources];
                          newResources[idx].capacity = e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0;
                          setResources(newResources);
                        }}
                        placeholder="产能"
                        className={cn(
                          "w-full bg-transparent border-none text-center focus:ring-2 focus:ring-indigo-500/20 rounded py-1 font-mono transition-all outline-none placeholder:text-slate-300 placeholder:font-sans",
                          isFieldModified(item, 'capacity') ? "text-amber-600 font-bold" : "text-slate-600"
                        )}
                        title={item.original ? `原始值: ${item.original.capacity}` : undefined}
                      />
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
                          onClick={() => setResources(resources.filter(r => r.id !== item.id))}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="删除资源"
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
}
