'use client'

import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Heading2, Heading3, Italic, List, ListOrdered } from 'lucide-react'
import { PAGE_TEXT, TOOLBAR_TEXT } from '@/lib/constants'
import { htmlToMarkdown, markdownToHtml } from '@/lib/markdown'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'

type EditorProps = {
  value: string
  onChange: (val: string) => void
  minHeight?: string
  quiet?: boolean
}

export const Editor = ({ value, onChange, minHeight = 'calc(100vh - 260px)', quiet = false }: EditorProps) => {
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
          'prose prose-gray max-w-none min-h-[200px] text-[15px] text-gray-800 focus:outline-none dark:prose-invert dark:text-gray-100'
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

  if (!editor) return null

  const toolbarButtons = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), key: 'bold', label: TOOLBAR_TEXT.bold, active: editor.isActive('bold') },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), key: 'italic', label: TOOLBAR_TEXT.italic, active: editor.isActive('italic') },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), key: 'h2', label: TOOLBAR_TEXT.h2, active: editor.isActive('heading', { level: 2 }) },
    { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), key: 'h3', label: TOOLBAR_TEXT.h3, active: editor.isActive('heading', { level: 3 }) },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), key: 'bullet', label: TOOLBAR_TEXT.bullet, active: editor.isActive('bulletList') },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), key: 'ordered', label: TOOLBAR_TEXT.ordered, active: editor.isActive('orderedList') }
  ]

  return (
    <div className={cn('overflow-hidden rounded-xl', quiet ? '' : 'border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950')}>
      <div className={cn('flex flex-wrap items-center gap-1 px-3 py-2', quiet ? 'border-b border-gray-200 dark:border-gray-800' : 'border-b border-gray-100 dark:border-gray-900')}>
        {toolbarButtons.map(item => {
          const Icon = item.icon
          return (
            <Button
              key={item.key}
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 p-0',
                item.active
                  ? 'bg-gray-100 text-gray-950 dark:bg-gray-800 dark:text-gray-50'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              )}
              type="button"
              onClick={item.action}
              aria-label={item.label}
              aria-pressed={item.active}
            >
              <Icon className="h-4 w-4" />
            </Button>
          )
        })}
      </div>
      <div className={cn(quiet ? 'px-1 py-5' : 'px-5 py-4')} style={{ minHeight }}>
        <EditorContent editor={editor} className="tiptap-content min-h-[200px]" />
      </div>
    </div>
  )
}
