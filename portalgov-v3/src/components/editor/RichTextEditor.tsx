"use client";

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

  return (
    <div className="flex flex-wrap gap-2 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg text-gray-600">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive('bold') ? 'bg-white shadow-sm text-pg-orange' : ''}`}
        title="Negrito"
      >
        <Bold size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive('italic') ? 'bg-white shadow-sm text-pg-orange' : ''}`}
        title="Itálico"
      >
        <Italic size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive('underline') ? 'bg-white shadow-sm text-pg-orange' : ''}`}
        title="Sublinhado"
      >
        <UnderlineIcon size={18} />
      </button>
      
      <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive('heading', { level: 2 }) ? 'bg-white shadow-sm text-pg-orange' : ''}`}
        title="Título 2"
      >
        <Heading2 size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive('heading', { level: 3 }) ? 'bg-white shadow-sm text-pg-orange' : ''}`}
        title="Título 3"
      >
        <Heading3 size={18} />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive('bulletList') ? 'bg-white shadow-sm text-pg-orange' : ''}`}
        title="Lista"
      >
        <List size={18} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive('orderedList') ? 'bg-white shadow-sm text-pg-orange' : ''}`}
        title="Lista Numerada"
      >
        <ListOrdered size={18} />
      </button>

      <button
        type="button"
        onClick={() => {
          const url = window.prompt('URL do Link:');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        className={`p-1.5 rounded hover:bg-white hover:shadow-sm transition-all ${editor.isActive('link') ? 'bg-white shadow-sm text-pg-orange' : ''}`}
        title="Adicionar Link"
      >
        <LinkIcon size={18} />
      </button>
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

  return (
    <div className="border border-gray-100 rounded-3xl bg-gray-50/50 overflow-hidden focus-within:ring-2 focus-within:ring-pg-orange/10 transition-all">
      <MenuBar editor={editor} />
      <EditorContent 
        editor={editor} 
        className="prose prose-emerald prose-sm max-w-none p-6 min-h-[350px] focus:outline-none"
      />
    </div>
  );
};
