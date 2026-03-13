import React from 'react';
import * as XLSX from 'xlsx';
import { FixedSizeList } from 'react-window';
import { 
  ClipboardList, 
  Search, 
  Trash2, 
  LayoutGrid, 
  Upload, 
  Download 
} from 'lucide-react';
import { cn } from '../utils';
import { ProductionDemand } from '../types';

interface DemandManagementProps {
  demands: ProductionDemand[];
  setDemands: React.Dispatch<React.SetStateAction<ProductionDemand[]>>;
  searchOrderNo: string;
  setSearchOrderNo: (val: string) => void;
  showDemandsList: boolean;
  setShowDemandsList: (val: boolean) => void;
  isImportingDemands: boolean;
  setIsImportingDemands: (val: boolean) => void;
  isConfirmingClearDemands: boolean;
  setIsConfirmingClearDemands: (val: boolean) => void;
  addNotification: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function DemandManagement({
  demands,
  setDemands,
  searchOrderNo,
  setSearchOrderNo,
  showDemandsList,
  setShowDemandsList,
  isImportingDemands,
  setIsImportingDemands,
  isConfirmingClearDemands,
  setIsConfirmingClearDemands,
  addNotification
}: DemandManagementProps) {
  const filteredDemands = React.useMemo(() => {
    if (!searchOrderNo.trim()) return demands;
    const search = searchOrderNo.toLowerCase().trim();
    return demands.filter(d => (d.orderNo || '').toLowerCase().includes(search));
  }, [demands, searchOrderNo]);

  return (
    <div className="space-y-6 max-w-[98%] mx-auto">
      <div className="glass-card p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardList size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">生产需求明细</h3>
              <p className="text-sm text-slate-500">共 {demands.length} 条记录</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="搜索工单号..."
                value={searchOrderNo}
                onChange={(e) => setSearchOrderNo(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 w-64 transition-all outline-none"
              />
            </div>

            <button 
              onClick={() => {
                if (isConfirmingClearDemands) {
                  setDemands([]);
                  setIsConfirmingClearDemands(false);
                } else {
                  setIsConfirmingClearDemands(true);
                  setTimeout(() => setIsConfirmingClearDemands(false), 3000);
                }
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all border text-sm",
                isConfirmingClearDemands 
                  ? "bg-red-600 text-white border-red-600 shadow-lg shadow-red-100 animate-pulse" 
                  : "bg-white text-slate-400 border-slate-200 hover:text-red-500 hover:border-red-100 hover:bg-red-50"
              )}
            >
              <Trash2 size={16} />
              <span>{isConfirmingClearDemands ? '确认清空?' : '清空'}</span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
              <button
                onClick={() => setShowDemandsList(!showDemandsList)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-medium text-sm",
                  showDemandsList ? "text-slate-600 hover:bg-white hover:text-blue-600" : "bg-blue-100 text-blue-700"
                )}
                title={showDemandsList ? "隐藏列表以提升性能" : "显示列表"}
              >
                <LayoutGrid size={14} />
                <span>{showDemandsList ? '隐藏' : '显示'}</span>
              </button>
              <div className="w-px h-4 bg-slate-300 mx-1" />
              <button 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.csv,.xlsx,.xls';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;

                    setIsImportingDemands(true);
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
                          setIsImportingDemands(false);
                          return;
                        }

                        let headerIndex = -1;
                        const requiredKeywords = ['工单', '物料', '工序', '资源', '日期', '数量'];
                        
                        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
                          const row = rawRows[i];
                          if (!row) continue;
                          const rowText = row.join('|');
                          const matchCount = requiredKeywords.filter(kw => rowText.includes(kw)).length;
                          if (matchCount >= 3) {
                            headerIndex = i;
                            break;
                          }
                        }

                        if (headerIndex === -1) {
                          addNotification('error', '验证失败：未找到包含“工单号”、“组件物料编码”、“工序号”等关键词的表头。');
                          setIsImportingDemands(false);
                          return;
                        }

                        const headerRow = rawRows[headerIndex];
                        const getColIndex = (keywords: string[]) => {
                          const exactIdx = headerRow.findIndex(cell => 
                            cell && keywords.some(kw => String(cell).trim().toLowerCase() === kw.toLowerCase())
                          );
                          if (exactIdx !== -1) return exactIdx;
                          return headerRow.findIndex(cell => 
                            cell && keywords.some(kw => String(cell).includes(kw))
                          );
                        };

                        const colMap = {
                          orderNo: getColIndex(['工单号', '工单']),
                          componentCode: getColIndex(['组件物料编码', '物料编码', '组件代码']),
                          componentDesc: getColIndex(['组件描述', '物料描述']),
                          opNo: getColIndex(['工序号', '工序序号', '序号']),
                          opCode: getColIndex(['工序代码', '工序编号']),
                          opDesc: getColIndex(['工序描述', '工序名称']),
                          resourceGroupId: getColIndex(['资源组ID', '资源组']),
                          dueDate: getColIndex(['交货日期', '截止日期', '需求日期']),
                          requiredQty: getColIndex(['需求数量', '订单数量']),
                          completedQty: getColIndex(['完成数量', '已完工数量']),
                          rejectedQty: getColIndex(['不合格数量', '废品数量']),
                          actualHours: getColIndex(['实际工时', '实绩工时'])
                        };

                        const dataRows = rawRows.slice(headerIndex + 1);
                        const validRows = dataRows.filter(row => row && row.length > 0 && row[0] !== undefined && String(row[0]).trim() !== '');
                        
                        const formatExcelDate = (val: any) => {
                          if (!val) return '';
                          if (typeof val === 'number') {
                            const date = new Date(Math.round((val - 25569) * 86400 * 1000));
                            if (isNaN(date.getTime())) return '';
                            return date.toISOString().split('T')[0];
                          }
                          return String(val).trim();
                        };

                        const chunkSize = 5000;
                        let processedCount = 0;
                        const allFormattedData: any[] = [];

                        const processChunk = () => {
                          const chunk = validRows.slice(processedCount, processedCount + chunkSize);
                          if (chunk.length === 0) {
                            setDemands(allFormattedData);
                            addNotification('success', `导入成功！已成功验证并导入 ${allFormattedData.length} 行数据。`);
                            setIsImportingDemands(false);
                            return;
                          }

                          const formattedChunk = chunk.map((row, index) => {
                            const getValue = (colIdx: number) => colIdx !== -1 ? row[colIdx] : undefined;
                            const rawRow: any = {};
                            headerRow.forEach((header, i) => {
                              if (header !== undefined && header !== null) {
                                rawRow[String(header)] = row[i];
                              }
                            });

                            const data = {
                              id: `dem-import-${Date.now()}-${processedCount + index}`,
                              orderNo: String(getValue(colMap.orderNo) ?? '').trim(),
                              componentCode: String(getValue(colMap.componentCode) ?? '').trim(),
                              componentDesc: String(getValue(colMap.componentDesc) ?? '').trim(),
                              opNo: String(getValue(colMap.opNo) ?? '').trim(),
                              opCode: String(getValue(colMap.opCode) ?? '').trim(),
                              opDesc: String(getValue(colMap.opDesc) ?? '').trim(),
                              resourceGroupId: String(getValue(colMap.resourceGroupId) ?? '').trim(),
                              dueDate: formatExcelDate(getValue(colMap.dueDate)),
                              requiredQty: parseFloat(getValue(colMap.requiredQty)) || 0,
                              completedQty: parseFloat(getValue(colMap.completedQty)) || 0,
                              rejectedQty: parseFloat(getValue(colMap.rejectedQty)) || 0,
                              actualHours: parseFloat(getValue(colMap.actualHours)) || 0,
                              rawRow
                            };
                            return {
                              ...data,
                              original: { ...data }
                            };
                          });

                          allFormattedData.push(...formattedChunk);
                          processedCount += chunk.length;
                          requestAnimationFrame(processChunk);
                        };

                        processChunk();
                      } catch (err) {
                        console.error('Import failed:', err);
                        addNotification('error', '导入失败，请检查文件格式');
                        setIsImportingDemands(false);
                      }
                    };
                    reader.readAsArrayBuffer(file);
                  };
                  input.click();
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded-lg transition-all font-medium text-sm"
              >
                <Upload size={14} />
                <span>导入</span>
              </button>
              <button 
                onClick={() => {
                  const exportData = demands.map(item => {
                    if (item.rawRow) {
                      return item.rawRow;
                    }
                    return {
                      '工单号': item.orderNo,
                      '组件物料编码': item.componentCode,
                      '组件描述': item.componentDesc,
                      '工序号': item.opNo,
                      '工序代码': item.opCode,
                      '工序描述': item.opDesc,
                      '资源组ID': item.resourceGroupId,
                      '交货日期': item.dueDate,
                      '需求数量': item.requiredQty,
                      '完成数量': item.completedQty,
                      '不合格数量': item.rejectedQty || 0,
                      '实际工时': item.actualHours
                    };
                  });
                  
                  const worksheet = XLSX.utils.json_to_sheet(exportData);
                  const workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(workbook, worksheet, "生产需求");
                  XLSX.writeFile(workbook, "生产需求明细.xlsx");
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-white hover:text-blue-600 rounded-lg transition-all font-medium text-sm"
              >
                <Download size={14} />
                <span>导出</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl shadow-sm bg-white overflow-hidden relative">
          {isImportingDemands && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-slate-600 font-medium">正在导入大规模数据，请稍候...</p>
            </div>
          )}
          
          {!showDemandsList ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <LayoutGrid size={48} className="mb-4 opacity-20" />
              <p>列表已隐藏以提升系统性能</p>
              <p className="text-sm mt-2">共 {filteredDemands.length} 条数据</p>
              <button 
                onClick={() => setShowDemandsList(true)}
                className="mt-6 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                显示列表
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <div className="w-fit">
                <div className="flex bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
                  <div className="w-[140px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">工单号</div>
                  <div className="w-[200px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">组件物料编码</div>
                  <div className="w-[250px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">组件描述</div>
                  <div className="w-[100px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">工序号</div>
                  <div className="w-[150px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">工序代码</div>
                  <div className="w-[200px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">工序描述</div>
                  <div className="w-[150px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">资源组ID</div>
                  <div className="w-[140px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200">交货日期</div>
                  <div className="w-[100px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200 text-right">需求数量</div>
                  <div className="w-[100px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200 text-right">完成数量</div>
                  <div className="w-[120px] shrink-0 py-4 px-4 font-bold text-slate-700 border-r border-slate-200 text-right">实际工时</div>
                  <div className="w-[15px] shrink-0 bg-slate-50"></div>
                </div>

                <FixedSizeList
                  height={600}
                  itemCount={filteredDemands.length}
                  itemSize={48}
                  width={1665}
                  className="custom-scrollbar"
                >
                  {({ index, style }) => {
                    const item = filteredDemands[index];
                    return (
                      <div style={style} className="flex border-b border-slate-100 group hover:bg-blue-50/10 transition-colors text-sm">
                        <div className="w-[140px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                          {item.orderNo}
                        </div>
                        <div className="w-[200px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                          {item.componentCode}
                        </div>
                        <div className="w-[250px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                          {item.componentDesc}
                        </div>
                        <div className="w-[100px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                          {item.opNo}
                        </div>
                        <div className="w-[150px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                          {item.opCode}
                        </div>
                        <div className="w-[200px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                          {item.opDesc}
                        </div>
                        <div className="w-[150px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                          {item.resourceGroupId}
                        </div>
                        <div className="w-[140px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 truncate">
                          {item.dueDate}
                        </div>
                        <div className="w-[100px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 text-right truncate">
                          {item.requiredQty}
                        </div>
                        <div className="w-[100px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 text-right truncate">
                          {item.completedQty}
                        </div>
                        <div className="w-[120px] shrink-0 px-4 py-3 font-semibold border-r border-slate-100 text-slate-700 text-right truncate">
                          {item.actualHours}
                        </div>
                      </div>
                    );
                  }}
                </FixedSizeList>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
