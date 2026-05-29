"use client";

import { type ColumnDef } from "@/types/common";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loadingRows?: number;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  rowKey,
  onRowClick,
  emptyMessage = "No results found.",
  loadingRows = 8,
  selectedIds,
  onSelectionChange,
}: DataTableProps<T>) {
  const isAllSelected = data.length > 0 && selectedIds?.length === data.length;
  const isSomeSelected = !!(
    selectedIds &&
    selectedIds.length > 0 &&
    selectedIds.length < data.length
  );

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange(data.map((row) => rowKey(row)));
      } else {
        onSelectionChange([]);
      }
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (onSelectionChange && selectedIds) {
      if (checked) {
        onSelectionChange([...selectedIds, id]);
      } else {
        onSelectionChange(selectedIds.filter((itemId) => itemId !== id));
      }
    }
  };

  return (
    <div className="w-full overflow-auto rounded-md  border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-table-header">
            {onSelectionChange && (
              <th className="h-12 w-10 px-4 py-0 align-middle">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "h-12 px-4 py-0 align-middle text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-30",
                  col.width,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {isLoading ? (
            Array.from({ length: loadingRows }).map((_, i) => (
              <tr key={i}>
                {onSelectionChange && (
                  <td className="h-14 px-4 py-0 align-middle">
                    <Skeleton className="h-4 w-4" />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="h-14 px-4 py-0 align-middle">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (onSelectionChange ? 1 : 0)}
                className="py-16 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => {
              const id = rowKey(row);
              const isSelected = selectedIds?.includes(id);
              return (
                <tr
                  key={id}
                  className={cn(
                    "transition-colors hover:bg-muted/40",
                    onRowClick && "cursor-pointer",
                    isSelected && "bg-muted/30",
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {onSelectionChange && (
                    <td
                      className="h-14 px-4 py-0 align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(id, e.target.checked)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="h-14 px-4 py-0 align-middle">
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
