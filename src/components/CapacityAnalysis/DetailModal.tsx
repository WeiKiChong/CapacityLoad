import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, X, Database } from 'lucide-react';
import { cn, formatNumber } from '../../utils';

interface Props {
  selectedDetail: { team: string, month: string, title: string } | null;
  onClose: () => void;
  detailOrders: any[];
}

export function DetailModal({ selectedDetail, onClose, detailOrders }: Props) {
  return (
    <AnimatePresence>
      {selectedDetail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative z-10"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{selectedDetail.title}</h3>
                  <p className="text-slate-500 text-xs">展示工时需求最长的核心工单 (Top 10)</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {detailOrders.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <div className="col-span-1">#</div>
                    <div className="col-span-2">工单号</div>
                    <div className="col-span-3">物料名称</div>
                    <div className="col-span-2">工序</div>
                    <div className="col-span-2 text-right">交付日期</div>
                    <div className="col-span-2 text-right">需求工时(H)</div>
                  </div>
                  <div className="space-y-2">
                    {detailOrders.map((order, index) => (
                      <div key={order.id} className="grid grid-cols-12 gap-4 px-4 py-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                        <div className="col-span-1 flex items-center">
                          <span className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                            index < 3 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                          )}>
                            {index + 1}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center font-mono text-sm font-bold text-slate-700">
                          {order.orderNo}
                        </div>
                        <div className="col-span-3">
                          <p className="text-sm font-medium text-slate-800 truncate" title={order.componentDesc}>
                            {order.componentDesc}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">{order.componentCode}</p>
                        </div>
                        <div className="col-span-2 flex items-center">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {order.opDesc}
                          </span>
                        </div>
                        <div className="col-span-2 flex items-center justify-end text-sm text-slate-500">
                          {order.dueDate}
                        </div>
                        <div className="col-span-2 flex items-center justify-end">
                          <span className="text-sm font-bold text-blue-600 font-mono">
                            {formatNumber(order.hours)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                    <Database size={32} />
                  </div>
                  <p>该分类下暂无生产需求明细</p>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button 
                onClick={onClose}
                className="px-6 py-2 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
              >
                关闭窗口
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
