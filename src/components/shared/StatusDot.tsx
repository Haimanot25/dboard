import { cn } from "@/lib/utils";

interface StatusDotProps {
  status: "online" | "offline" | "warning" | "pending";
  size?: "sm" | "md" | "lg";
  label?: string;
  animated?: boolean;
}

const colorMap = {
  online: "bg-green-500",
  offline: "bg-destructive",
  warning: "bg-warning",
  pending: "bg-muted-foreground/30",
};

const sizeMap = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5",
};

export function StatusDot({
  status,
  size = "md",
  label,
  animated = true,
}: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex shrink-0">
        <span
          className={cn(
            colorMap[status],
            sizeMap[size],
            "rounded-full",
            animated && status === "online" && "animate-pulse-dot"
          )}
        />
      </span>
      {label && (
        <span className="text-xs text-muted-foreground/70">{label}</span>
      )}
    </span>
  );
}
