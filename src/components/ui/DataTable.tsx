import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ApiClientError } from "@/api/apiError";
import { cn } from "@/utils/cn";
import { formatNumber } from "@/utils/format";
import { Button } from "./Button";
import { EmptyState, ErrorState, SkeletonTable } from "./Feedback";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption?: string;
  isLoading?: boolean;
  error?: ApiClientError | null;
  onRetry?: () => void;
  empty?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  isLoading = false,
  error = null,
  onRetry,
  empty,
}: DataTableProps<T>) {
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (isLoading) {
    return <SkeletonTable rows={5} />;
  }

  if (rows.length === 0) {
    return <>{empty ?? <EmptyState title="Nothing here yet" message="Records will appear once they are created." />}</>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={column.align === "right" ? "text-right" : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    column.align === "right" && "table__cell--actions",
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  isDisabled?: boolean;
}

export function Pagination({ page, totalPages, total, onPageChange, isDisabled }: PaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1);

  return (
    <div className="pagination">
      <span>
        Page {formatNumber(page)} of {formatNumber(safeTotalPages)} · {formatNumber(total)} total
      </span>
      <div className="pagination__controls">
        <Button
          variant="secondary"
          size="sm"
          iconOnly
          aria-label="Previous page"
          disabled={isDisabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="pagination__page">
          {page} / {safeTotalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          iconOnly
          aria-label="Next page"
          disabled={isDisabled || page >= safeTotalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
