"use client";

import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MS_PER_DAY } from "@/lib/constants";

export interface DateRange {
  from: Date | null;
  to: Date | null;
  label: string;
}

const PRESETS: DateRange[] = [
  { label: "Last 24h", from: new Date(Date.now() - MS_PER_DAY), to: new Date() },
  { label: "Last 7d", from: new Date(Date.now() - 7 * MS_PER_DAY), to: new Date() },
  { label: "Last 30d", from: new Date(Date.now() - 30 * MS_PER_DAY), to: new Date() },
  { label: "Last 90d", from: new Date(Date.now() - 90 * MS_PER_DAY), to: new Date() },
  { label: "All time", from: null, to: null },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground"
        onClick={() => setOpen(!open)}
      >
        <Calendar className="h-3 w-3" />
        {value.label}
        <ChevronDown className="h-3 w-3" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border bg-card shadow-xl p-1.5 animate-slide-up">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                  value.label === preset.label
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                onClick={() => {
                  onChange(preset);
                  setOpen(false);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}
