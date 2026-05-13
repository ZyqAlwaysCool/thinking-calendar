import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { markdownToHtml } from './markdown'

// Markdown 渲染样式 —— 确保 html2canvas 截图时有完整的排版效果
const MARKDOWN_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; }
  h1 { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 4px; padding: 0; }
  h2 { font-size: 18px; font-weight: 600; color: #1f2937; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
  h3 { font-size: 16px; font-weight: 600; color: #374151; margin: 16px 0 6px; }
  h4, h5, h6 { font-size: 15px; font-weight: 600; color: #4b5563; margin: 12px 0 4px; }
  p { margin: 0 0 10px; }
  ul, ol { margin: 0 0 10px; padding-left: 24px; }
  li { margin-bottom: 4px; }
  li::marker { color: #6b7280; }
  strong, b { font-weight: 600; color: #111827; }
  em, i { font-style: italic; }
  code { font-family: "SF Mono", "Fira Code", monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #374151; }
  pre { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; margin: 0 0 10px; overflow-x: auto; }
  pre code { background: none; padding: 0; border-radius: 0; font-size: 13px; }
  blockquote { border-left: 3px solid #d1d5db; margin: 0 0 10px; padding: 4px 0 4px 16px; color: #6b7280; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
  a { color: #374151; text-decoration: underline; }
  table { border-collapse: collapse; width: 100%; margin: 0 0 10px; }
  th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; font-size: 14px; }
  th { background: #f9fafb; font-weight: 600; }
`

/**
 * 将 markdown 渲染为 HTML → html2canvas 截图 → jsPDF 导出
 * 用浏览器原生字体渲染中文，解决 jsPDF 中文乱码问题
 */
const renderHtmlToCanvas = async (html: string): Promise<HTMLCanvasElement> => {
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '700px'
  container.style.padding = '32px'
  container.style.fontFamily = '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif'
  container.style.fontSize = '15px'
  container.style.lineHeight = '1.8'
  container.style.color = '#1f2937'
  container.style.background = '#ffffff'
  container.innerHTML = `<style>${MARKDOWN_CSS}</style>${html}`
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })
    return canvas
  } finally {
    document.body.removeChild(container)
  }
}

const addCanvasToPdf = (doc: jsPDF, canvas: HTMLCanvasElement, isFirstPage: boolean) => {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10

  const imgWidth = pageWidth - margin * 2
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  let remainingHeight = imgHeight
  let sourceY = 0

  while (remainingHeight > 0) {
    if (!isFirstPage) {
      doc.addPage()
    }
    isFirstPage = false

    const availableHeight = pageHeight - margin * 2
    const sliceHeight = Math.min(remainingHeight, availableHeight)
    const sourceHeight = (sliceHeight / imgHeight) * canvas.height

    doc.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      margin,
      margin,
      imgWidth,
      sliceHeight,
      undefined,
      'FAST'
    )

    sourceY += sourceHeight
    remainingHeight -= sliceHeight
  }
}

/**
 * 下载单个报告的 PDF
 */
export const downloadReportPdf = async (title: string, markdown: string, dateRange?: string) => {
  const headerHtml = `
    <h1 style="font-size:22px;font-weight:700;margin:0 0 4px;color:#111827;">${escapeHtml(title)}</h1>
    ${dateRange ? `<p style="font-size:12px;color:#9ca3af;margin:0 0 16px;">${escapeHtml(dateRange)}</p>` : ''}
  `
  const bodyHtml = markdownToHtml(markdown)
  const fullHtml = `<div>${headerHtml}${bodyHtml}</div>`

  const canvas = await renderHtmlToCanvas(fullHtml)

  const doc = new jsPDF('p', 'mm', 'a4')
  addCanvasToPdf(doc, canvas, true)

  const filename = `${title.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`
  doc.save(filename)
}

/**
 * 批量导出：多份报告合并为一个 PDF
 */
export const downloadBatchReportPdf = async (
  reports: Array<{ title: string; content: string; dateRange: string }>
) => {
  if (reports.length === 0) return
  if (reports.length === 1) {
    await downloadReportPdf(reports[0].title, reports[0].content, reports[0].dateRange)
    return
  }

  const doc = new jsPDF('p', 'mm', 'a4')
  let isFirstPage = true

  for (const report of reports) {
    const headerHtml = `
      <h1 style="font-size:20px;font-weight:700;margin:0 0 4px;color:#111827;">${escapeHtml(report.title)}</h1>
      <p style="font-size:12px;color:#9ca3af;margin:0 0 16px;">${escapeHtml(report.dateRange)}</p>
    `
    const bodyHtml = markdownToHtml(report.content)
    const fullHtml = `<div>${headerHtml}${bodyHtml}</div>`

    const canvas = await renderHtmlToCanvas(fullHtml)
    addCanvasToPdf(doc, canvas, isFirstPage)
    isFirstPage = false
  }

  const now = new Date()
  const dateLabel = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  doc.save(`批量导出报告_${dateLabel}.pdf`)
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
