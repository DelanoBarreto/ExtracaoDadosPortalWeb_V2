"use client";

import React from 'react';
import { Trash2, Archive, CheckCircle2, X, Eye } from 'lucide-react';

interface BulkActionsBarProps {
  count:        number;
  onPublish?:   () => void;
  onArchive?:   () => void;
  onDelete:     () => void;
  onClear:      () => void;
  loading?:     boolean;
}

export function BulkActionsBar({
  count,
  onPublish,
  onArchive,
  onDelete,
  onClear,
  loading = false,
}: BulkActionsBarProps) {
  return (
    <div className="bulk-bar">
      {/* Contador */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        paddingRight: '1rem',
        borderRight: '1px solid #1e293b'
      }}>
        <div style={{
          width: 24, height: 24,
          background: '#f97316',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', fontWeight: 800, color: '#fff'
        }}>
          {count}
        </div>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
          {count === 1 ? 'item selecionado' : 'itens selecionados'}
        </span>
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {onPublish && (
          <button
            onClick={onPublish}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.4rem 0.875rem',
              background: '#16a34a',
              border: 'none', borderRadius: 8,
              fontSize: '0.8rem', fontWeight: 600, color: '#fff',
              cursor: 'pointer', opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.15s'
            }}
          >
            <CheckCircle2 size={14} />
            Publicar
          </button>
        )}

        {onArchive && (
          <button
            onClick={onArchive}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem',
              padding: '0.4rem 0.875rem',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8',
              cursor: 'pointer', opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.15s, background 0.15s'
            }}
          >
            <Archive size={14} />
            Arquivar
          </button>
        )}

        <button
          onClick={onDelete}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.4rem 0.875rem',
            background: '#dc2626',
            border: 'none', borderRadius: 8,
            fontSize: '0.8rem', fontWeight: 600, color: '#fff',
            cursor: 'pointer', opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.15s'
          }}
        >
          <Trash2 size={14} />
          Excluir
        </button>
      </div>

      {/* Limpar seleção */}
      <button
        onClick={onClear}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '50%',
          cursor: 'pointer',
          color: '#64748b',
          flexShrink: 0,
          transition: 'color 0.15s, background 0.15s'
        }}
        title="Limpar seleção"
      >
        <X size={14} />
      </button>
    </div>
  );
}
