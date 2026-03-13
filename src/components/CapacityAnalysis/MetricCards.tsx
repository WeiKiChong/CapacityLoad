import React from 'react';
import { Database, Users, Activity, AlertTriangle, Calendar } from 'lucide-react';
import { formatNumber } from '../../utils';
import { MetricCard } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface Props {
  totalDemandLoad: number;
  totalCapacity: number;
  avgLoadRate: number;
  bottleneckCount: number;
  currentWorkingDays: number;
}

export function MetricCards({ 
  totalDemandLoad, 
  totalCapacity, 
  avgLoadRate, 
  bottleneckCount, 
  currentWorkingDays 
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title="总需求工时"
        value={formatNumber(totalDemandLoad)}
        unit="h"
        icon={<Database size={24} />}
        footer={<Badge variant="success">计算范围正常</Badge>}
        accentColor="bg-indigo-500"
      />

      <MetricCard
        title="总可用产能"
        value={formatNumber(totalCapacity)}
        unit="h"
        icon={<Users size={24} />}
        iconBgColor="bg-emerald-50"
        iconColor="text-emerald-600"
        footer={
          <Badge variant="success">
            <Calendar size={10} /> 工作天数: {currentWorkingDays} 天
          </Badge>
        }
        accentColor="bg-emerald-500"
      />

      <MetricCard
        title="平均负荷率"
        value={formatNumber(avgLoadRate)}
        unit="%"
        icon={<Activity size={24} />}
        iconBgColor="bg-blue-50"
        iconColor="text-blue-500"
        footer={
          <Badge variant={avgLoadRate > 120 ? "error" : avgLoadRate > 90 ? "warning" : "info"}>
            {avgLoadRate > 120 ? "资源严重超负荷" : 
             avgLoadRate > 90 ? "资源负荷较高" : 
             "资源分配均衡"}
          </Badge>
        }
        accentColor="bg-blue-500"
      />

      <MetricCard
        title="瓶颈资源数"
        value={bottleneckCount}
        unit="个班组"
        icon={<AlertTriangle size={24} />}
        iconBgColor="bg-brand-red/5"
        iconColor="text-brand-red"
        footer={
          <Badge variant={bottleneckCount > 0 ? "error" : "success"}>
            {bottleneckCount > 0 ? "存在产能瓶颈" : "无明显瓶颈"}
          </Badge>
        }
        accentColor="bg-brand-red"
      />
    </div>
  );
}
