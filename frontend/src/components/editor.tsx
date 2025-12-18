'use client'

import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Heading2, Heading3, Italic, List, ListOrdered } from 'lucide-react'
import { PAGE_TEXT } from '@/lib/constants'
import { htmlToMarkdown, markdownToHtml } from '@/lib/markdown'
import { Button } from './ui/button'

type EditorProps = {
  value: string
  onChange: (val: string) => void
  minHeight?: string
}

export const Editor = ({ value, onChange, minHeight = 'calc(100vh - 220px)' }: EditorProps) => {
  const settingRef = useRef(false)
  const localChangeRef = useRef(false)
  const lastValueRef = useRef(value)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder: PAGE_TEXT.editorPlaceholder
      })
    ],
    content: markdownToHtml(value),
    editorProps: {
      attributes: {
        class:
          'prose prose-gray max-w-none min-h-[200px] text-gray-800 focus:outline-none dark:prose-invert dark:text-gray-100'
      }
    },
    onUpdate({ editor }) {
      if (settingRef.current) return
      const markdown = htmlToMarkdown(editor.getHTML())
      localChangeRef.current = true
      lastValueRef.current = markdown
      onChange(markdown)
    }
  })

  useEffect(() => {
    if (!editor) return
    const isLocalSync = localChangeRef.current && value === lastValueRef.current
    if (isLocalSync) {
      localChangeRef.current = false
      return
    }
    const nextHtml = markdownToHtml(value || '')
    if (nextHtml !== editor.getHTML()) {
      settingRef.current = true
      editor.commands.setContent(nextHtml)
      settingRef.current = false
      lastValueRef.current = value
    }
  }, [editor, value])

  if (!editor) {
    return null
  }

  const toolbarButtons = [
    { icon: <Bold className="h-4 w-4" />, action: () => editor.chain().focus().toggleBold().run(), key: 'bold' },
    { icon: <Italic className="h-4 w-4" />, action: () => editor.chain().focus().toggleItalic().run(), key: 'italic' },
    { icon: <List className="h-4 w-4" />, action: () => editor.chain().focus().toggleBulletList().run(), key: 'bullet' },
    { icon: <ListOrdered className="h-4 w-4" />, action: () => editor.chain().focus().toggleOrderedList().run(), key: 'ordered' },
    { icon: <Heading2 className="h-4 w-4" />, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), key: 'h2' },
    { icon: <Heading3 className="h-4 w-4" />, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), key: 'h3' }
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {toolbarButtons.map(item => (
          <Button
            key={item.key}
            variant="outline"
            size="sm"
            className="rounded-lg border-gray-200 px-3"
            type="button"
            onClick={item.action}
          >
            {item.icon}
          </Button>
        ))}
      </div>
      <div
        className="rounded-xl border border-gray-200 bg-gray-100 p-4 transition-all duration-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} className="tiptap-content min-h-[200px]" />
      </div>
    </div>
  )
}
