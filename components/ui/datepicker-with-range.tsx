"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

interface DatePickerWithRangeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  dateRange?: DateRange;
  onDateRangeChange?: (dateRange?: DateRange) => void;
  onClear?: () => void;
}

export const DatePickerWithRange = ({
  className,
  dateRange,
  onDateRangeChange,
  onClear
}: DatePickerWithRangeProps) => {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-2">
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-[300px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
            {dateRange?.from && (
              <Button
                variant="outline"
                className="w-full text-sm text-destructive hover:text-destructive/80"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear?.();
                }}
              >
                <X />
                Clear
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
          />
          {dateRange?.from && (
            <Button
              variant="ghost"
              className="w-full text-sm text-destructive hover:text-destructive/80"
              onClick={onClear}
            >
              Show All
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
