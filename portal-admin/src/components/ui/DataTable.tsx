"use client";

import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { Trash2, AlertCircle } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  onDeleteSelected?: (ids: string[]) => void;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  onDeleteSelected,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [showConfirm, setShowConfirm] = React.useState(false);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const confirmDelete = () => {
    const ids = selectedRows.map((r: any) => r.original.id);
    onDeleteSelected?.(ids);
    setRowSelection({});
    setShowConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-50/50 rounded-xl border border-gray-100 animate-pulse">
        <p className="text-gray-400 font-medium">Sincronizando com o banco...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 relative">
      {/* Barra de Ações em Massa */}
      {hasSelection && (
        <div className="sticky top-4 z-20 flex items-center justify-between bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
             <div className="bg-white/20 px-2 py-1 rounded text-xs font-bold">{selectedRows.length} selecionados</div>
             <p className="text-sm font-medium">O que deseja fazer com esses registros?</p>
          </div>
          
          <div className="flex items-center gap-3">
            {showConfirm ? (
              <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                <span className="text-xs text-red-400 font-bold flex items-center gap-1">
                  <AlertCircle size={14} /> Tem certeza?
                </span>
                <button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded-lg text-xs font-bold transition-all">
                  Sim, Deletar
                </button>
                <button onClick={() => setShowConfirm(false)} className="bg-white/10 hover:bg-white/20 px-4 py-1 rounded-lg text-xs font-bold transition-all">
                  Cancelar
                </button>
              </div>
            ) : (
              <button 
                onClick={handleDeleteClick}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-red-500/20"
              >
                <Trash2 size={16} />
                Excluir em Massa
              </button>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm transition-all hover:shadow-md">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gray-50/80 border-b border-gray-200">
                {/* Coluna Checkbox Header */}
                <th className="px-6 py-4 w-10">
                   <input 
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={table.getIsAllRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                   />
                </th>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-900 transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={`group border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors cursor-pointer ${row.getIsSelected() ? 'bg-blue-50/50' : ''}`}
                >
                  {/* Coluna Checkbox Body */}
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={row.getIsSelected()}
                      onChange={row.getToggleSelectedHandler()}
                    />
                  </td>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 text-sm text-gray-600">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + 1} className="h-32 text-center text-gray-400 text-sm">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between px-2 py-1">
        <div className="text-sm text-gray-500">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            Anterior
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
