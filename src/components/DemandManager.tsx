import React from 'react';
import { ShoppingCart, Trash2, Upload, Download, Plus, LayoutGrid, AlertCircle, RotateCcw, X } from 'lucide-react';
import { cn } from '../utils';
import { Demand } from '../types';
import * as XLSX from 'xlsx';

interface Props {
  demands: Demand[];
  setDemands: (val: Demand[]) => void;
  isConfirmingClear: boolean;
  setIsConfirmingClear: (val: boolean) => void;
  addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
  isRowModified: (item: Demand) => boolean;
  isFieldModified: (item: Demand, field: keyof NonNullable<Demand['original']>) => boolean;
  restoreRow: (idx: number, type: 'demand') => void;
}

export function DemandManager({
  demands,
  setDemands,
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
          const requiredKeywords = ['订单', '物料', '工序', '需求'];
          
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
            addNotification('error', '验证失败：未找到包含“订单”、“物料”、“工序”、“需求”等关键词的表头。');
            return;
          }

          const dataRows = rawRows.slice(headerIndex + 1);
          const validRows = dataRows.filter(row => row && row.length > 0 && row[0] !== undefined && String(row[0]).trim() !== '');
          
          if (validRows.length === 0) {
            addNotification('error', '未检测到有效的需求数据行');
            return;
          }

          const formattedData = validRows.map((row, index) => {
            const data = {
              id: `import-${Date.now()}-${index}`,
              orderNo: String(row[0]).trim() || '未知订单',
              componentCode: String(row[1]).trim() || '',
              componentDesc: String(row[2]).trim() || '',
              opNo: String(row[3]).trim() || '',
              opCode: String(row[4]).trim() || '',
              opDesc: String(row[5]).trim() || '',
              resourceGroupId: String(row[6]).trim() || '',
              dueDate: String(row[7]).trim() || '',
              requiredQty: parseFloat(row[8]) || 0,
              completedQty: parseFloat(row[9]) || 0,
              rejectedQty: parseFloat(row[10]) || 0,
              actualHours: parseFloat(row[11]) || 0
            };
            return {
              ...data,
              original: {
                orderNo: data.orderNo,
                componentCode: data.componentCode,
                componentDesc: data.componentDesc,
                opNo: data.opNo,
                opCode: data.opCode,
                opDesc: data.opDesc,
                resourceGroupId: data.resourceGroupId,
                dueDate: data.dueDate,
                requiredQty: data.requiredQty,
                completedQty: data.completedQty,
                rejectedQty: data.rejectedQty,
                actualHours: data.actualHours
              }
            };
          });

          setDemands(formattedData);
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
    const exportData = demands.map(item => ({
      '订单号': item.orderNo,
      '物料编码': item.componentCode,
      '物料描述': item.componentDesc,
      '工序号': item.opNo,
      '工序编码': item.opCode,
      '工序描述': item.opDesc,
      '资源组': item.resourceGroupId,
      '截止日期': item.dueDate,
      '需求数量': item.requiredQty,
      '完成数量': item.completedQty,
      '报废数量': item.rejectedQty,
      '实际工时': item.actualHours
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "生产需求");
    XLSX.writeFile(workbook, "生产需求明细.xlsx");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingCart size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">生产需求列表</h3>
              <p className="text-sm text-slate-500">共 {demands.length} 条记录</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (isConfirmingClear) {
                  setDemands([]);
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
                setDemands([{ 
                  id: newId, 
                  orderNo: '', 
                  componentCode: '', 
                  componentDesc: '', 
                  opNo: '', 
                  opCode: '', 
                  opDesc: '', 
                  resourceGroupId: '', 
                  dueDate: '', 
                  requiredQty: '' as any, 
                  completedQty: '' as any, 
                  rejectedQty: '' as any, 
                  actualHours: '' as any 
                }, ...demands]);
              }}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 text-sm"
            >
              <Plus size={18} />
              添加需求
            </button>
          </div>
        </div>

        <div className="overflow-auto max-h-[650px] border border-slate-200 rounded-2xl shadow-sm bg-white">
          <table className="w-full text-sm text-left border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50">
                <th className="py-4 px-4 font-bold text-slate-600 border-b border-r border-slate-200 min-w-[150px] sticky left-0 z-30 bg-slate-50">订单号</th>
                <th className="py-4 px-4 font-bold text-slate-600 border-b border-r border-slate-200 min-w-[120px]">物料编码</th>
                <th className="py-4 px-4 font-bold text-slate-600 border-b border-r border-slate-200 min-w-[150px]">物料描述</th>
                <th className="py-4 px-4 font-bold text-slate-600 border-b border-r border-slate-200 text-center">工序</th>
                <th className="py-4 px-4 font-bold text-slate-600 border-b border-r border-slate-200">资源组</th>
                <th className="py-4 px-4 font-bold text-slate-600 border-b border-r border-slate-200 text-center">需求数量</th>
                <th className="py-4 px-4 font-bold text-slate-600 border-b border-r border-slate-200 text-center">截止日期</th>
                <th className="py-4 px-4 w-14 border-b border-r border-slate-200 bg-slate-50"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demands.map((item, idx) => {
                const rowModified = isRowModified(item);
                return (
                  <tr key={item.id} className={cn(
                    "group transition-all duration-200",
                    rowModified ? "bg-amber-50/30 hover:bg-amber-50/50" : "hover:bg-indigo-50/20"
                  )}>
                    <td className={cn(
                      "py-3 px-4 font-semibold border-r border-slate-100 sticky left-0 z-10 transition-colors",
                      rowModified ? "bg-amber-50/50 group-hover:bg-amber-50/60" : "bg-white group-hover:bg-indigo-50/30",
                      isFieldModified(item, 'orderNo') ? "text-amber-600" : "text-slate-700"
                    )}>
                      <input 
                        type="text" 
                        value={item.orderNo}
                        onChange={(e) => {
                          const newDemands = [...demands];
                          newDemands[idx].orderNo = e.target.value;
                          setDemands(newDemands);
                        }}
                        className="bg-transparent border-none focus:ring-2 focus:ring-indigo-500/20 rounded px-2 py-1 w-full font-semibold outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 border-r border-slate-100">
                      <input 
                        type="text" 
                        value={item.componentCode}
                        onChange={(e) => {
                          const newDemands = [...demands];
                          newDemands[idx].componentCode = e.target.value;
                          setDemands(newDemands);
                        }}
                        className="bg-transparent border-none focus:ring-2 focus:ring-indigo-500/20 rounded px-2 py-1 w-full outline-none text-slate-600"
                      />
                    </td>
                    <td className="py-3 px-4 border-r border-slate-100">
                      <input 
                        type="text" 
                        value={item.componentDesc}
                        onChange={(e) => {
                          const newDemands = [...demands];
                          newDemands[idx].componentDesc = e.target.value;
                          setDemands(newDemands);
                        }}
                        className="bg-transparent border-none focus:ring-2 focus:ring-indigo-500/20 rounded px-2 py-1 w-full outline-none text-slate-600"
                      />
                    </td>
                    <td className="py-3 px-4 border-r border-slate-100 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <span className="text-[10px] text-slate-400 font-mono">{item.opNo}</span>
                        <span className="text-xs font-bold text-indigo-600">{item.opCode}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 border-r border-slate-100">
                      <input 
                        type="text" 
                        value={item.resourceGroupId}
                        onChange={(e) => {
                          const newDemands = [...demands];
                          newDemands[idx].resourceGroupId = e.target.value;
                          setDemands(newDemands);
                        }}
                        className="bg-transparent border-none focus:ring-2 focus:ring-indigo-500/20 rounded px-2 py-1 w-full outline-none text-slate-600 font-medium"
                      />
                    </td>
                    <td className="py-3 px-4 border-r border-slate-100 text-center">
                      <input 
                        type="number" 
                        value={item.requiredQty === '' as any ? '' : item.requiredQty}
                        onChange={(e) => {
                          const newDemands = [...demands];
                          newDemands[idx].requiredQty = e.target.value === '' ? '' as any : parseFloat(e.target.value) || 0;
                          setDemands(newDemands);
                        }}
                        className="bg-transparent border-none text-center focus:ring-2 focus:ring-indigo-500/20 rounded py-1 w-full font-mono font-bold text-slate-700 outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 border-r border-slate-100 text-center">
                      <input 
                        type="date" 
                        value={item.dueDate}
                        onChange={(e) => {
                          const newDemands = [...demands];
                          newDemands[idx].dueDate = e.target.value;
                          setDemands(newDemands);
                        }}
                        className="bg-transparent border-none text-center focus:ring-2 focus:ring-indigo-500/20 rounded py-1 w-full text-xs text-slate-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-4 text-right border-r border-slate-100">
                      <div className="flex items-center justify-end gap-1">
                        {rowModified && (
                          <button 
                            onClick={() => restoreRow(idx, 'demand')}
                            className="p-1.5 text-amber-500 hover:bg-amber-100 rounded-lg transition-all"
                            title="恢复原始数据"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                        <button 
                          onClick={() => setDemands(demands.filter(d => d.id !== item.id))}
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
