"use client";

import React from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

export interface Column<T> {
  key:       keyof T | string;
  label:     string;
  width?:    string;
  sortable?: boolean;
  render?:   (value: any, row: T) => React.ReactNode;
}

interface DataTableV2Props<T extends { id: string | number }> {
  data:            T[];
  columns:         Column<T>[];
  selectedIds:     (string | number)[];
  onSelectChange:  (ids: (string | number)[]) => void;
  loading?:        boolean;
  emptyMessage?:   string;
  sortKey?:        string;
  sortDir?:        'asc' | 'desc';
  onSort?:         (key: string) => void;
  onRowClick?:     (row: T) => void;
}

export function DataTableV2<T extends { id: string | number }>({
  data,
  columns,
  selectedIds,
  onSelectChange,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado.',
  sortKey,
  sortDir,
  onSort,
  onRowClick,
}: DataTableV2Props<T>) {
  const allSelected = data.length > 0 && data.every(r => selectedIds.includes(r.id));

  const toggleAll = () => {
    if (allSelected) onSelectChange([]);
    else onSelectChange(data.map(r => r.id));
  };

  const toggleOne = (id: string | number) => {
    if (selectedIds.includes(id)) onSelectChange(selectedIds.filter(s => s !== id));
    else onSelectChange([...selectedIds, id]);
  };

  const getValue = (row: T, key: string): any => {
    return key.split('.').reduce((obj: any, k) => obj?.[k], row);
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            {/* Checkbox "Selecionar todos" */}
            <th style={{ width: 44, paddingLeft: '1rem' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                style={{ accentColor: '#1d4ed8', width: 16, height: 16, cursor: 'pointer' }}
              />
            </th>

            {columns.map(col => (
              <th
                key={String(col.key)}
                style={{ width: col.width }}
                onClick={col.sortable && onSort ? () => onSort(String(col.key)) : undefined}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  cursor: col.sortable ? 'pointer' : 'default',
                  userSelect: 'none'
                }}>
                  {col.label}
                  {col.sortable && (
                    sortKey === String(col.key) ? (
                      sortDir === 'asc'
                        ? <ChevronUp size={12} color="#1d4ed8" />
                        : <ChevronDown size={12} color="#1d4ed8" />
                    ) : (
                      <ArrowUpDown size={11} color="#94a3b8" />
                    )
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            // Skeleton rows
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td><div style={{ width: 16, height: 16, borderRadius: 4, background: '#e2e8f0', animation: 'pulse 1.5s infinite' }} /></td>
                {columns.map((col, j) => (
                  <td key={j}>
                    <div style={{
                      height: 14, borderRadius: 4, background: '#e2e8f0',
                      width: j === 0 ? '70%' : '40%',
                      animation: 'pulse 1.5s infinite'
                    }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => {
              const selected = selectedIds.includes(row.id);
              return (
                <tr
                  key={row.id}
                  className={`${selected ? 'selected' : ''} ${onRowClick ? 'hover:bg-slate-50 transition-colors group' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  style={{ 
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background 0.2s' 
                  }}
                >
                  <td 
                    style={{ paddingLeft: '1rem', width: 44 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleOne(row.id)}
                      style={{ accentColor: '#1d4ed8', width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </td>
                  {columns.map(col => (
                    <td key={String(col.key)}>
                      {col.render
                        ? col.render(getValue(row, String(col.key)), row)
                        : getValue(row, String(col.key)) ?? '—'
                      }
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
