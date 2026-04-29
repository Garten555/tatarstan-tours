'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useMemo, useState } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Type,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'По умолчанию', value: '' },
  { label: 'Системный', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", Helvetica, sans-serif' },
];

const SIZE_OPTIONS: { label: string; value: string }[] = [
  { label: 'По умолчанию', value: '' },
  { label: '12 px', value: '12px' },
  { label: '14 px', value: '14px' },
  { label: '16 px', value: '16px' },
  { label: '18 px', value: '18px' },
  { label: '20 px', value: '20px' },
  { label: '24 px', value: '24px' },
  { label: '28 px', value: '28px' },
  { label: '32 px', value: '32px' },
];

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        heading: false,
        link: false,
      }),
      TextStyle,
      FontFamily,
      FontSize,
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc list-outside ml-4 space-y-1',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal list-outside ml-4 space-y-1',
        },
      }),
      ListItem.configure({
        HTMLAttributes: {
          class: 'ml-2',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Начните писать...',
      }),
    ],
    [placeholder]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[300px] max-w-none p-4',
      },
    },
  });

  const [fontFamily, setFontFamily] = useState('');
  const [fontSize, setFontSize] = useState('');

  useEffect(() => {
    if (!editor) return;

    const syncToolbar = () => {
      const attrs = editor.getAttributes('textStyle') as {
        fontFamily?: string | null;
        fontSize?: string | null;
      };
      setFontFamily(attrs.fontFamily ?? '');
      setFontSize(attrs.fontSize ?? '');
    };

    editor.on('selectionUpdate', syncToolbar);
    editor.on('transaction', syncToolbar);
    syncToolbar();

    return () => {
      editor.off('selectionUpdate', syncToolbar);
      editor.off('transaction', syncToolbar);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const url = window.prompt('Введите URL изображения:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const url = window.prompt('Введите URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const selectFontClass =
    'max-w-[min(100%,11rem)] rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30';

  const fontFamilySelectValue = FONT_OPTIONS.some((o) => o.value === fontFamily)
    ? fontFamily
    : fontFamily
      ? '__custom__'
      : '';

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bold') ? 'bg-blue-200 text-blue-700 font-bold' : ''
          }`}
          title="Жирный (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('italic') ? 'bg-blue-200 text-blue-700' : ''
          }`}
          title="Курсив (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <div className="flex items-center gap-1 px-1">
          <Type className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
          <label htmlFor="rte-font-family" className="sr-only">
            Шрифт
          </label>
          <select
            id="rte-font-family"
            className={selectFontClass}
            value={fontFamilySelectValue}
            title="Шрифт"
            onChange={(e) => {
              const v = e.target.value;
              if (v === '__custom__') return;
              const chain = editor.chain().focus();
              if (!v) {
                chain.unsetFontFamily().run();
              } else {
                chain.setFontFamily(v).run();
              }
            }}
          >
            {FONT_OPTIONS.map((o) => (
              <option key={o.label + o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {fontFamily && !FONT_OPTIONS.some((o) => o.value === fontFamily) && (
              <option value="__custom__">{`Текущий: ${fontFamily.slice(0, 28)}…`}</option>
            )}
          </select>

          <label htmlFor="rte-font-size" className="sr-only">
            Размер шрифта
          </label>
          <select
            id="rte-font-size"
            className={selectFontClass}
            value={SIZE_OPTIONS.some((o) => o.value === fontSize) ? fontSize : fontSize ? '__custom_size__' : ''}
            title="Размер шрифта"
            onChange={(e) => {
              const v = e.target.value;
              if (v === '__custom_size__') return;
              const chain = editor.chain().focus();
              if (!v) {
                chain.unsetFontSize().run();
              } else {
                chain.setFontSize(v).run();
              }
            }}
          >
            {SIZE_OPTIONS.map((o) => (
              <option key={o.label + o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {fontSize && !SIZE_OPTIONS.some((o) => o.value === fontSize) && (
              <option value="__custom_size__">{`Текущий: ${fontSize}`}</option>
            )}
          </select>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bulletList') ? 'bg-purple-200 text-purple-700' : ''
          }`}
          title="Маркированный список"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('orderedList') ? 'bg-purple-200 text-purple-700' : ''
          }`}
          title="Нумерованный список"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('blockquote') ? 'bg-orange-200 text-orange-700' : ''
          }`}
          title="Цитата"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <button
          type="button"
          onClick={addLink}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('link') ? 'bg-teal-200 text-teal-700' : ''
          }`}
          title="Вставить ссылку"
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={addImage}
          className="p-2 rounded hover:bg-gray-200 transition-colors hover:bg-teal-100"
          title="Вставить изображение"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1 self-center" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Отменить (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Повторить (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}
