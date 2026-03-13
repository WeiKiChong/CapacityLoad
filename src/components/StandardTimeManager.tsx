import React from 'react';
import { Timer, Trash2, Upload, Download, Plus, LayoutGrid, AlertCircle, RotateCcw, X } from 'lucide-react';
import { cn } from '../utils';
import { StandardTime } from '../types';
import * as XLSX from 'xlsx';

interface Props {
  standardTimes: StandardTime[];
  setStandardTimes: (val: StandardTime[]) => void;
  isConfirmingClear: boolean;
  setIsConfirmingClear: (val: boolean) => void;
  addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  isRowModified: (item: StandardTime) => boolean;
  isFieldModified: (item: StandardTime, field: keyof NonNullable<StandardTime['original']>) => boolean;
  restoreRow: (idx: number, type: 'standard') => void;
}

export function StandardTimeManager({
  standardTimes,
  setStandardTimes,
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
          const requiredKeywords = ['班组', '人员', '设备'];
          
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
            addNotification('error', '验证失败：未找到包含“班组”、“人员”、“设备”等关键词的表头。');
            return;
          }

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
  };

  const handleExport = () => {
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
  };

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
                          onClick={() => setStandardTimes(standardTimes.filter(s => s.id !== item.id))}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
