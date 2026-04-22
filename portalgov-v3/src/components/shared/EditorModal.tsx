"use client";

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, AlertTriangle, ExternalLink, Info, CheckCircle } from 'lucide-react';

interface EditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
  table: string;
}

export function EditorModal({ isOpen, onClose, item, table }: EditorModalProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<any>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(item);
      setShowConfirmDelete(false);
    }
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const res = await fetch('/api/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, table, data: updatedData }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/items?id=${item.id}&table=${table}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [table] });
      onClose();
    },
  });

  const handleSave = () => {
    // Removemos id e outros campos fixos do update
    const { id, created_at, municipio_id, ...dataToUpdate } = formData;
    updateMutation.mutate(dataToUpdate);
  };

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-[200]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl z-[201] overflow-hidden flex flex-col border border-white/20"
          >
            {/* Minimal Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Info size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">Editor Universal</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{table.replace('tab_', '')} ID: {item.id.slice(0, 8)}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Título do Conteúdo</label>
                <textarea 
                  value={formData.titulo || ''}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium resize-none min-h-[100px] transition-all"
                  placeholder="Digite o título editorial..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Data de Publicação</label>
                  <input 
                    type="date"
                    value={formData.data_publicacao ? formData.data_publicacao.split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, data_publicacao: e.target.value })}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium transition-all"
                  />
                </div>
                <div className="space-y-2">
                   {formData.categoria !== undefined ? (
                     <>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Categoria</label>
                        <input 
                          type="text"
                          value={formData.categoria || ''}
                          onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 font-medium transition-all"
                        />
                     </>
                   ) : (
                      <div className="opacity-20 pointer-events-none">
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">ID Município</label>
                         <div className="p-4 bg-gray-100 rounded-2xl text-xs">{item.municipio_id}</div>
                      </div>
                   )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Link de Origem / PDF</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={formData.url_origem || formData.file_url || ''}
                    readOnly
                    className="flex-1 p-4 bg-gray-100 border border-gray-100 rounded-2xl text-gray-500 text-sm font-mono truncate"
                  />
                  <a 
                    href={formData.url_origem || formData.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all flex items-center justify-center"
                  >
                    <ExternalLink size={20} />
                  </a>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-8 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
              <div className="relative">
                 {showConfirmDelete ? (
                   <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                      <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                        <AlertTriangle size={14} /> Confirmar?
                      </span>
                      <button 
                        onClick={() => deleteMutation.mutate()}
                        className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 shadow-lg shadow-red-200"
                        disabled={deleteMutation.isPending}
                      >
                         {deleteMutation.isPending ? '...' : 'Deletar Agora'}
                      </button>
                      <button onClick={() => setShowConfirmDelete(false)} className="text-xs font-bold text-gray-400 hover:text-gray-900 px-2 transition-colors">Cancelar</button>
                   </div>
                 ) : (
                   <button 
                    onClick={() => setShowConfirmDelete(true)}
                    className="flex items-center gap-2 text-gray-300 hover:text-red-500 transition-all group"
                   >
                    <div className="p-2 group-hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={20} />
                    </div>
                    <span className="text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">Excluir Permanente</span>
                  </button>
                 )}
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50"
                >
                  {updateMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
