"use client";

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold, Italic, Underline as UnderlineIcon,
  Heading2, Heading3, List, ListOrdered,
  Link as LinkIcon, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Minus, Quote, Undo, Redo, RotateCcw, Image as ImageIcon, Highlighter
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// ── Botão da Toolbar ────────────────────────────────────────────────────────
const Btn = ({
  onClick, isActive = false, title, children, disabled = false,
}: {
  onClick: () => void; isActive?: boolean; title: string;
  children: React.ReactNode; disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      w-[30px] h-[30px] flex items-center justify-center rounded-lg transition-all
      ${isActive ? 'bg-[#004c99] text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'}
      ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    {children}
  </button>
);

const Sep = () => <div className="w-px h-5 bg-slate-300 mx-1 self-center shrink-0" />;

// ── Componente Principal ─────────────────────────────────────────────────────
export const RichTextEditor = ({
  content,
  onChange,
  placeholder = 'Comece a digitar o conteúdo aqui...',
  minHeight = '350px',
}: RichTextEditorProps) => {

  // Ref para o callback onChange — evita closure desatualizado dentro do useEditor
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Flag para distinguir mudanças vindas do editor vs props externas
  const isEditorUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank', class: 'text-blue-600 underline' },
      }),
      Image.configure({ inline: false }),
      TextAlign.configure({ 
        types: ['heading', 'paragraph'],
        defaultAlignment: '',
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Marca que a mudança veio do editor — não deve ser revertida pelo useEffect
      isEditorUpdate.current = true;
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChangeRef.current(html);
    },
    editorProps: {
      attributes: { class: 'focus:outline-none' },
    },
  });

  // Sincroniza conteúdo externo (ex: load inicial) sem sobrescrever edições do usuário
  useEffect(() => {
    if (!editor) return;

    // Se a mudança veio do próprio editor, ignora — evita loop circular
    if (isEditorUpdate.current) {
      isEditorUpdate.current = false;
      return;
    }

    // Só atualiza se o conteúdo externo for realmente diferente (load inicial / reset)
    const currentHTML = editor.getHTML();
    if (content !== currentHTML) {
      editor.commands.setContent(content || '', false);
    }
  }, [content, editor]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('URL do link:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('URL da imagem:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-all focus-within:border-[#004c99] focus-within:ring-4 focus-within:ring-blue-50"
    >
      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-slate-50/80 border-b border-slate-200">

        {/* Histórico */}
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Desfazer" disabled={!editor.can().undo()}><Undo size={14} /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Refazer" disabled={!editor.can().redo()}><Redo size={14} /></Btn>
        <Sep />

        {/* Formatação */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Negrito"><Bold size={14} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Itálico"><Italic size={14} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Sublinhado"><UnderlineIcon size={14} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')} title="Marcador / Destaque"><Highlighter size={14} /></Btn>
        <Sep />

        {/* Títulos e blocos */}
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Título H2"><Heading2 size={14} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Título H3"><Heading3 size={14} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Citação"><Quote size={14} /></Btn>
        <Sep />

        {/* Listas */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Lista"><List size={14} /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Lista Numerada"><ListOrdered size={14} /></Btn>
        <Sep />

        {/* Alinhamento */}
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Esquerda"><AlignLeft size={14} /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Centro"><AlignCenter size={14} /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Direita"><AlignRight size={14} /></Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="Justificado"><AlignJustify size={14} /></Btn>
        <Sep />

        {/* Mídia */}
        <Btn onClick={addLink} isActive={editor.isActive('link')} title="Inserir Link"><LinkIcon size={14} /></Btn>
        <Btn onClick={addImage} title="Inserir Imagem"><ImageIcon size={14} /></Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha Divisória"><Minus size={14} /></Btn>

        {/* Limpar — direita */}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all"
          title="Limpar formatação"
        >
          <RotateCcw size={12} /> Limpar
        </button>
      </div>

      {/* ── Área de Edição ────────────────────────────────────────────── */}
      <div style={{ minHeight }} className="px-6 py-4">
        <EditorContent editor={editor} />
      </div>

      {/* ── Rodapé ───────────────────────────────────────────────────── */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          Ctrl+B Negrito · Ctrl+I Itálico · Ctrl+U Sublinhado
        </span>
      </div>
    </div>
  );
};
