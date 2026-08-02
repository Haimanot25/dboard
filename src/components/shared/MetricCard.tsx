"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  compact?: boolean;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  trendValue,
  className,
  compact,
  onClick,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card",
        compact ? "p-3" : "p-5",
        "transition-all duration-150",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-px",
        className
      )}
      onClick={onClick}
    >
      <div className={cn("flex items-start justify-between", compact ? "mb-1.5" : "mb-3")}>
        <p className={cn("font-medium text-muted-foreground/60 uppercase tracking-wider", compact ? "text-[9px]" : "text-xs")}>
          {title}
        </p>
        {icon && (
          <div className={cn("rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0", compact ? "w-6 h-6" : "w-8 h-8")}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className={cn("font-bold tracking-tight tabular-nums", compact ? "text-lg" : "text-2xl")}>{value}</p>
          {description && (
            <p className={cn("text-muted-foreground/60 mt-0.5", compact ? "text-[10px]" : "text-xs")}>{description}</p>
          )}
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 font-medium",
              compact ? "text-[10px]" : "text-xs",
              trend === "up" && "text-success",
              trend === "down" && "text-destructive",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trend === "up" && <TrendingUp className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />}
            {trend === "down" && <TrendingDown className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />}
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
