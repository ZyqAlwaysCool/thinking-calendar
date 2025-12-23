const toSafeString = (value?: string) => (typeof value === 'string' ? value : '')

const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const renderInline = (text: string) => {
  const escaped = escapeHtml(text)
  const bold = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  const italic = bold.replace(/\*(.+?)\*/g, '<em>$1</em>')
  return italic
}

const looksLikeHtml = (value: string) => {
  const trimmed = toSafeString(value).trim()
  if (!trimmed) return false
  return /^<\/?[a-z][\s\S]*>$/i.test(trimmed)
}

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
  const lines = toSafeString(markdown).replaceAll('\r\n', '\n').split('\n')
  const html: string[] = []
  let inUl = false
  let inOl = false

  const closeLists = () => {
    if (inUl) {
      html.push('</ul>')
      inUl = false
    }
    if (inOl) {
      html.push('</ol>')
      inOl = false
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      closeLists()
      continue
    }

    if (line.startsWith('### ')) {
      closeLists()
      html.push(`<h3>${renderInline(line.slice(4))}</h3>`)
      continue
    }
    if (line.startsWith('## ')) {
      closeLists()
      html.push(`<h2>${renderInline(line.slice(3))}</h2>`)
      continue
    }
    if (line.startsWith('# ')) {
      closeLists()
      html.push(`<h1>${renderInline(line.slice(2))}</h1>`)
      continue
    }

    const olMatch = line.match(/^(\d+)\.\s+(.+)$/)
    if (olMatch) {
      if (inUl) {
        html.push('</ul>')
        inUl = false
      }
      if (!inOl) {
        html.push('<ol>')
        inOl = true
      }
      html.push(`<li>${renderInline(olMatch[2])}</li>`)
      continue
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inOl) {
        html.push('</ol>')
        inOl = false
      }
      if (!inUl) {
        html.push('<ul>')
        inUl = true
      }
      html.push(`<li>${renderInline(line.slice(2))}</li>`)
      continue
    }

    closeLists()
    html.push(`<p>${renderInline(line)}</p>`)
  }

  closeLists()
  return html.join('')
}

const collapseBlankLines = (text: string) =>
  text
    .replaceAll('\r\n', '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

export const htmlToMarkdown = (html: string) => {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    const cleaned = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
    return collapseBlankLines(cleaned)
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const root = doc.body

  const toText = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent || '').replace(/\u00A0/g, ' ')
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    const children = () => Array.from(el.childNodes).map(toText).join('')

    if (tag === 'br') return '\n'
    if (tag === 'strong' || tag === 'b') return `**${children()}**`
    if (tag === 'em' || tag === 'i') return `*${children()}*`

    if (tag === 'h1') return `# ${children().trim()}\n\n`
    if (tag === 'h2') return `## ${children().trim()}\n\n`
    if (tag === 'h3') return `### ${children().trim()}\n\n`

    if (tag === 'p') return `${children().trim()}\n\n`

    if (tag === 'li') return children().trim()

    if (tag === 'ul') {
      const items = Array.from(el.children)
        .filter(child => child.tagName.toLowerCase() === 'li')
        .map(li => `- ${toText(li).trim()}`)
        .join('\n')
      return `${items}\n\n`
    }

    if (tag === 'ol') {
      const items = Array.from(el.children)
        .filter(child => child.tagName.toLowerCase() === 'li')
        .map((li, index) => `${index + 1}. ${toText(li).trim()}`)
        .join('\n')
      return `${items}\n\n`
    }

    return children()
  }

  const result = Array.from(root.childNodes).map(toText).join('')
  return collapseBlankLines(result)
}
