import React, { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Row,
} from "@tanstack/react-table";

export interface DataTableProps<T extends object> {
  data: T[];
  columns: ColumnDef<T, any>[];
  initialPageSize?: number;
  renderExpandedRow?: (row: Row<T>) => React.ReactNode;
}

function DataTable<T extends object>({
  data,
  columns,
  initialPageSize = 10,
  renderExpandedRow,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowCanExpand: () => !!renderExpandedRow,
    initialState: { pagination: { pageIndex: 0, pageSize: initialPageSize } },
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-gray-500">
        <thead className="bg-gray-100 text-xs text-gray-700 uppercase">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} scope="col" className="px-4 py-3">
                  <div
                    className={
                      header.column.getCanSort()
                        ? "flex cursor-pointer items-center gap-2 select-none"
                        : ""
                    }
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {{ asc: "🔼", desc: "🔽" }[
                      header.column.getIsSorted() as string
                    ] ?? null}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <React.Fragment key={row.id}>
              <tr className="border-b hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-4 py-3 font-medium text-gray-900"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              {renderExpandedRow && row.getIsExpanded() && (
                <tr className="border-b">
                  <td colSpan={columns.length} className="bg-gray-50 p-0">
                    {renderExpandedRow(row)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between py-3 text-sm">
          <div>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex gap-2">
            <button
              className="rounded border px-2 py-1 disabled:opacity-50"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Prev
            </button>
            <button
              className="rounded border px-2 py-1 disabled:opacity-50"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
