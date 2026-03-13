import React from 'react';
import { cn } from '../../utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("glass-card", className)}>
      {children}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  footer?: React.ReactNode;
  accentColor?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  icon,
  iconBgColor = "bg-indigo-50",
  iconColor = "text-indigo-600",
  footer,
  accentColor = "bg-indigo-500",
  className
}: MetricCardProps) {
  return (
    <Card className={cn("p-6 relative overflow-hidden group", className)}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
            {unit && <span className="text-slate-400 text-sm font-normal">{unit}</span>}
          </div>
        </div>
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", iconBgColor, iconColor)}>
          {icon}
        </div>
      </div>
      {footer && <div className="flex items-center gap-2">{footer}</div>}
      <div className={cn("absolute bottom-0 left-0 w-full h-1 opacity-10 group-hover:opacity-30 transition-colors", accentColor)} />
    </Card>
  );
}
