import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import remarkStringify from 'remark-stringify'
import rehypeParse from 'rehype-parse'
import rehypeRemark from 'rehype-remark'
import rehypeStringify from 'rehype-stringify'

const toSafeString = (value?: string) => (typeof value === 'string' ? value : '')

const looksLikeHtml = (value: string) => {
  const trimmed = toSafeString(value).trim()
  if (!trimmed) return false
  return /^<\/?[a-z][\s\S]*>$/i.test(trimmed)
}

const mdToHtmlProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype).use(rehypeStringify)

const htmlToMdProcessor = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeRemark)
  .use(remarkGfm)
  .use(remarkStringify, { bullet: '-', listItemIndent: 'one' })

const collapseBlankLines = (text: string) =>
  text
    .replaceAll('\r\n', '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

export const normalizeRichText = (value?: string) => {
  const safe = toSafeString(value)
  if (looksLikeHtml(safe)) return safe
  return markdownToHtml(safe)
}

export const normalizeMarkdown = (value?: string) => {
  const safe = toSafeString(value)
  if (looksLikeHtml(safe)) return htmlToMarkdown(safe)
  return safe
}

export const markdownToHtml = (markdown: string) => {
  const safe = toSafeString(markdown)
  return String(mdToHtmlProcessor.processSync(safe)).trim()
}

export const htmlToMarkdown = (html: string) => {
  const safe = toSafeString(html)
  const result = String(htmlToMdProcessor.processSync(safe))
  return collapseBlankLines(result)
}
