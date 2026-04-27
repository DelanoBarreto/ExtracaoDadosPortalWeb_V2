"use client";

import React, { useState } from 'react';
import { ChevronDown, ListChecks, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Action {
  label:   string;
  icon:    LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger';
  color?:   string;
}

interface BulkActionDropdownProps {
  selectedCount: number;
  actions:       Action[];
}

export function BulkActionDropdown({ selectedCount, actions }: BulkActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isDisabled = selectedCount === 0;

  return (
    <div className="relative">
      <button
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={`h-9 px-4 border rounded-xl text-[12px] font-bold flex items-center gap-2 transition-all shadow-sm ${
          !isDisabled
            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer'
            : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
        }`}
      >
        <ListChecks size={16} />
        Ações em Lote
        {!isDisabled && (
          <span className="ml-1 px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px] text-slate-500">
            {selectedCount}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && !isDisabled && (
          <>
            {/* Backdrop para fechar ao clicar fora */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute left-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden"
            >
              {actions.map((action, idx) => (
                <React.Fragment key={idx}>
                  {action.label === 'SEPARATOR' ? (
                    <div className="h-px bg-slate-100 my-1.5 mx-2" />
                  ) : (
                    <button
                      onClick={() => {
                        action.onClick();
                        setIsOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-[13px] font-bold flex items-center gap-3 transition-colors ${
                        action.variant === 'danger'
                          ? 'text-red-500 hover:bg-red-50'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <action.icon size={16} className={action.color} />
                      {action.label}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
