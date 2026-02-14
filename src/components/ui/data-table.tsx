"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data found.",
  loading = false,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-card shadow-card">
        <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
              {onRowClick && <th className="w-8" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onRowClick ? 1 : 0)}
                  className="px-5 py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={(item as any).id ?? index}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "transition-colors hover:bg-muted/30",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-5 py-3.5", col.className)}>
                      {col.render
                        ? col.render(item)
                        : String((item as any)[col.key] ?? "")}
                    </td>
                  ))}
                  {onRowClick && (
                    <td className="px-3 py-3.5 text-muted-foreground/40">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
