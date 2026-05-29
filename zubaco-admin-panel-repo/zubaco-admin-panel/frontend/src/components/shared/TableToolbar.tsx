"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterOption {
  value: string;
  label: string;
}

interface TableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters?: {
    key: string;
    placeholder: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
  }[];
  actions?: React.ReactNode;
  total?: number;
}

export function TableToolbar({
  search,
  onSearchChange,
  filters,
  actions,
}: TableToolbarProps) {
  const hasActiveFilters = filters?.some(
    (f) => f.value !== "all" && f.value !== "",
  );

  const handleClearAll = () => {
    onSearchChange("");
    filters?.forEach((f) => f.onChange("all"));
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Filters */}
        {filters?.map((filter) => (
          <Select
            key={filter.key}
            value={filter.value}
            onValueChange={filter.onChange}
          >
            <SelectTrigger className="h-8 w-auto min-w-30 text-sm">
              <SelectValue placeholder={filter.placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{filter.placeholder}</SelectItem>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-8 text-xs gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* {total !== undefined && (
          <span className="text-xs font-medium text-muted-foreground">
            {total} {total === 1 ? "item" : "items"}
          </span>
        )} */}
        <div className="flex items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}
