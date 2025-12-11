'use client'

import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { PAGE_TEXT, TOOLBAR_TEXT } from '@/lib/constants'
import { Button } from './ui/button'

type EditorProps = {
  value: string
  onChange: (val: string) => void
  minHeight?: string
}

export const Editor = ({ value, onChange, minHeight = 'calc(100vh - 220px)' }: EditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3]
        }
      }),
      Placeholder.configure({
        placeholder: PAGE_TEXT.editorPlaceholder
      })
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'prose prose-gray max-w-none min-h-[200px] text-gray-800 focus:outline-none dark:prose-invert dark:text-gray-100'
      }
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    }
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
  }, [editor, value])

  if (!editor) {
    return null
  }

  const ToolbarButton = ({
    onClick,
    label
  }: {
    onClick: () => void
    label: string
  }) => (
    <Button variant="outline" size="sm" className="rounded-lg border-gray-200 px-3" type="button" onClick={onClick}>
      {label}
    </Button>
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} label={TOOLBAR_TEXT.bold} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} label={TOOLBAR_TEXT.italic} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} label={TOOLBAR_TEXT.bullet} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} label={TOOLBAR_TEXT.ordered} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label={TOOLBAR_TEXT.h2} />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label={TOOLBAR_TEXT.h3} />
      </div>
      <div
        className="rounded-xl border border-gray-200 bg-gray-100 p-4 transition-all duration-200 hover:scale-105 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} className="min-h-[200px]" />
      </div>
    </div>
  )
}
