import React from 'react';
import { 
  ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line 
} from 'recharts';
import { Card } from '../ui/Card';

interface Props {
  title: string;
  data: any[];
  onBarClick: (data: any) => void;
  viewMode: 'dashboard' | 'heatmap';
}

export function CapacityCharts({ title, data, onBarClick, viewMode }: Props) {
  if (viewMode === 'heatmap') return null;

  return (
    <Card className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        <div className="flex items-center gap-6 text-xs font-medium">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-indigo-500 border-t-2 border-dashed border-indigo-600" />
            <span className="text-slate-500">可用产能 (人力)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-amber-500 border-t-2 border-dashed border-amber-600" />
            <span className="text-slate-500">可用产能 (设备)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-slate-500">需求工时</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <div style={{ minWidth: data.length > 10 ? `${data.length * 80}px` : '100%' }} className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={data} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              onClick={onBarClick}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                dy={10}
                interval={0}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value) => Math.round(value).toString()}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => Math.round(value)}
              />
              <Bar 
                dataKey="load" 
                name="需求工时"
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                barSize={30}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={(data) => onBarClick(data)}
              />
              <Line 
                type="monotone" 
                dataKey="humanCapacity" 
                name="可用产能 (人力)"
                stroke="#6366f1" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="machineCapacity" 
                name="可用产能 (设备)"
                stroke="#f59e0b" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
