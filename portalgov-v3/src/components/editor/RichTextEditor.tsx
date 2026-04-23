"use client";

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Link as LinkIcon 
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const ToolbarButton = ({ onClick, isActive, title, children }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-all flex items-center justify-center hover:bg-white hover:shadow-sm ${
        isActive ? 'bg-white shadow-sm text-primary' : 'text-muted'
      }`}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className="content-editor-toolbar">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Negrito"
      >
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Itálico"
      >
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Sublinhado"
      >
        <UnderlineIcon size={16} />
      </ToolbarButton>
      
      <div className="w-px h-4 bg-border-soft mx-1 self-center" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Título 2"
      >
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Título 3"
      >
        <Heading3 size={16} />
      </ToolbarButton>

      <div className="w-px h-4 bg-border-soft mx-1 self-center" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Lista"
      >
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Lista Numerada"
      >
        <ListOrdered size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => {
          const url = window.prompt('URL do Link:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        isActive={editor.isActive('link')}
        title="Adicionar Link"
      >
        <LinkIcon size={16} />
      </ToolbarButton>
    </div>
  );
};

export const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Underline,
      Image,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="content-editor-wrapper">
      <MenuBar editor={editor} />
      <EditorContent 
        editor={editor} 
        className="prose prose-slate prose-sm max-w-none focus:outline-none content-editor-area min-h-[350px]"
      />
      <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between rounded-b-xl">
        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
          Área de Edição Rica
        </span>
        <span className="text-[10px] font-medium text-slate-400">
          Tiptap Engine v2.0
        </span>
      </div>
    </div>
  );
};
