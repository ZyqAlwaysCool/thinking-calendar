'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { eachDayOfInterval, endOfISOWeek, endOfMonth, endOfYear, format, parseISO, startOfISOWeek, startOfMonth, startOfYear } from 'date-fns'
import { toast } from 'react-hot-toast'
import { PageShell } from '@/components/page-shell'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Editor } from '@/components/editor'
import { SaveStatus } from '@/components/save-status'
import { useAutoSave } from '@/lib/use-auto-save'
import { DIALOG_TEXT, NAV_LABELS, PAGE_TEXT, REPORT_FILTER_OPTIONS, REPORT_OPTIONS } from '@/lib/constants'
import { formatDateTime, formatRangeLabel } from '@/lib/utils'
import { downloadBatchReportPdf, downloadReportPdf } from '@/lib/pdf'
import { downloadMarkdown } from '@/lib/download-markdown'
import { CheckSquare, FileDown, Loader2, Sparkles, Square } from 'lucide-react'
import { Copy, Check } from 'lucide'
import { MorphIcon } from 'morphicons/react'
import { useReportStore } from '@/stores/use-report-store'
import { useLogStore } from '@/stores/use-log-store'
import { type GenerateReportPayload, type Report, type ReportFilter } from '@/types'

const buildRange = (period: Report['period'], base?: string) => {
  const baseDate = base ? parseISO(base) : new Date()
  if (period === 'week') {
    return {
      startDate: format(startOfISOWeek(baseDate), 'yyyy-MM-dd'),
      endDate: format(endOfISOWeek(baseDate), 'yyyy-MM-dd')
    }
  }
  if (period === 'month') {
    return {
      startDate: format(startOfMonth(baseDate), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(baseDate), 'yyyy-MM-dd')
    }
  }
  return {
    startDate: format(startOfYear(baseDate), 'yyyy-MM-dd'),
    endDate: format(endOfYear(baseDate), 'yyyy-MM-dd')
  }
}

// ---- 报告列表卡片（无勾选框） ----
const ReportCard = ({ item, selected, onSelect }: { item: Report; selected: boolean; onSelect: (item: Report) => void }) => (
  <Card
    className={`cursor-pointer space-y-1 border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800 ${selected ? 'ring-2 ring-gray-800 dark:ring-gray-200' : ''}`}
    role="button"
    tabIndex={0}
    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(item) }}
    onClick={() => onSelect(item)}
  >
    <div className="flex items-center justify-between">
      <div className="font-semibold text-gray-900 dark:text-gray-50 truncate">{item.title}</div>
      <span
        className={
          item.confirmed
            ? 'whitespace-nowrap shrink-0 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-50 dark:bg-gray-100 dark:text-gray-900'
            : 'whitespace-nowrap shrink-0 rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200'
        }
      >
        {item.status === 'failed'
          ? PAGE_TEXT.reportFailed
          : item.status === 'queued' || item.status === 'processing'
            ? PAGE_TEXT.reportProcessing
            : item.confirmed ? PAGE_TEXT.confirmed : PAGE_TEXT.unconfirmed}
      </span>
    </div>
    <div className="text-xs text-gray-300 dark:text-gray-300">{formatRangeLabel(item.startDate, item.endDate)}</div>
    <div className="text-xs text-gray-300 dark:text-gray-300">
      {`${PAGE_TEXT.lastUpdatedRecent}：${formatDateTime(item.updatedAt || item.createdAt)}`}
    </div>
  </Card>
)

// ---- 批量导出弹窗 ----
type ExportDialogProps = {
  open: boolean
  onClose: () => void
  reports: Report[]
}

const typeLabel: Record<string, string> = {
  week: PAGE_TEXT.reportWeekLabel,
  month: PAGE_TEXT.reportMonthLabel,
  year: PAGE_TEXT.reportYearLabel
}

const ExportDialog = ({ open, onClose, reports }: ExportDialogProps) => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['week', 'month', 'year']))
  const [exporting, setExporting] = useState(false)

  const grouped = useMemo(() => {
    const map: Record<string, Report[]> = { week: [], month: [], year: [] }
    reports.forEach(item => {
      map[item.period]?.push(item)
    })
    return map
  }, [reports])

  const toggle = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleType = (type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const selectAllType = (type: string) => {
    const ids = (grouped[type] || []).map(item => item.id)
    setCheckedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
  }

  const deselectAllType = (type: string) => {
    const ids = (grouped[type] || []).map(item => item.id)
    setCheckedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.delete(id))
      return next
    })
  }

  const handleExport = async () => {
    const selected = reports.filter(item => checkedIds.has(item.id))
    if (selected.length === 0) {
      toast.error('请至少勾选一项')
      return
    }
    setExporting(true)
    try {
      const payload = selected.map(item => ({
        title: item.title,
        content: item.content,
        dateRange: formatRangeLabel(item.startDate, item.endDate)
      }))
      await downloadBatchReportPdf(payload)
      toast.success(PAGE_TEXT.exportSuccess)
      onClose()
    } catch {
      toast.error(PAGE_TEXT.exportFail)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {PAGE_TEXT.exportBatch}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-1 overflow-y-auto py-2">
          {(['week', 'month', 'year'] as const).map(type => {
            const items = grouped[type] || []
            if (items.length === 0) return null
            const allChecked = items.every(item => checkedIds.has(item.id))
            const someChecked = items.some(item => checkedIds.has(item.id))
            const expanded = expandedTypes.has(type)

            return (
              <div key={type} className="rounded-lg border border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  onClick={() => toggleType(type)}
                >
                  <span>{typeLabel[type]}（{items.length}）</span>
                  <span className="text-xs text-gray-400">{expanded ? '▾' : '▸'}</span>
                </button>
                {expanded && (
                  <div className="border-t border-gray-200 px-3 py-1 dark:border-gray-800">
                    <div className="mb-1 flex items-center gap-2">
                      <button
                        type="button"
                        className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        onClick={() => allChecked ? deselectAllType(type) : selectAllType(type)}
                      >
                        {allChecked ? PAGE_TEXT.exportDeselectAll : PAGE_TEXT.exportSelectAll}
                      </button>
                    </div>
                    {items.map(item => (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <button
                          type="button"
                          className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          onClick={() => toggle(item.id)}
                        >
                          {checkedIds.has(item.id)
                            ? <CheckSquare className="h-4 w-4" />
                            : <Square className="h-4 w-4" />}
                        </button>
                        <span className="truncate text-gray-600 dark:text-gray-300">
                          {formatRangeLabel(item.startDate, item.endDate)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            {PAGE_TEXT.exportCancel}
          </Button>
          <Button size="sm" onClick={handleExport} disabled={checkedIds.size === 0 || exporting} className="flex items-center gap-2">
            {exporting && <Loader2 className="h-4 w-4 animate-spin" />}
            {PAGE_TEXT.exportSelected}（{checkedIds.size}）
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const ReportsPage = () => {
  const { reports, fetchReports, loading, generateReport, generating, refineReport, refining, confirmReport, saveDraft, markUnconfirmed } = useReportStore()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const today = format(new Date(), 'yyyy-MM-dd')
  const [form, setForm] = useState<GenerateReportPayload>({
    period: 'week',
    template: 'formal',
    ...buildRange('week', today)
  })
  const [rangeAnchor, setRangeAnchor] = useState(today)
  const [lastGeneratedKey, setLastGeneratedKey] = useState<string | null>(null)
  const [typing, setTyping] = useState(false)
  const typingTimer = useRef<NodeJS.Timeout | null>(null)
  const [feedback, setFeedback] = useState('')
  const [showFeedbackInput, setShowFeedbackInput] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { logs, fetchLogs } = useLogStore()

  useEffect(() => {
    void fetchReports().catch(() => {})
    void fetchLogs().catch(() => {})
  }, [fetchReports, fetchLogs])

  useEffect(() => {
    if (reports.length && !selectedReport) {
      setSelectedReport(reports[0])
      setEditorContent(reports[0].content)
    }
  }, [reports, selectedReport])

  const reportAutoSave = useAutoSave({
    value: editorContent,
    savedValue: selectedReport?.content ?? '',
    enabled: !!selectedReport && selectedReport.status === 'ready' && !typing && !generating && !refining,
    canSave: (value) => value.trim().length > 0,
    onSave: async (nextContent) => {
      if (!selectedReport) return
      const reportId = selectedReport.id
      const updated = await saveDraft(reportId, nextContent, true)
      setSelectedReport(current => current?.id === reportId ? updated : current)
    }
  })

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => (a.endDate < b.endDate ? 1 : -1)),
    [reports]
  )
  const filteredReports = useMemo(() => sortedReports.filter(item => {
    if (reportFilter === 'pending') return item.status === 'ready' && !item.confirmed
    if (reportFilter === 'confirmed') return item.confirmed
    if (reportFilter === 'generating') return item.status === 'queued' || item.status === 'processing'
    if (reportFilter === 'failed') return item.status === 'failed'
    return true
  }), [sortedReports, reportFilter])
  const grouped = useMemo(() => {
    const week = filteredReports.filter(item => item.period === 'week')
    const month = filteredReports.filter(item => item.period === 'month')
    const year = filteredReports.filter(item => item.period === 'year')
    return { week, month, year }
  }, [filteredReports])
  const materialLogs = useMemo(
    () => logs.filter(item => item.date >= form.startDate && item.date <= form.endDate),
    [logs, form.startDate, form.endDate]
  )
  const missingDates = useMemo(() => {
    if (form.period === 'year') return []
    const recorded = new Set(materialLogs.map(item => item.date))
    return eachDayOfInterval({ start: parseISO(form.startDate), end: parseISO(form.endDate) })
      .map(day => format(day, 'yyyy-MM-dd'))
      .filter(date => date <= today && !recorded.has(date))
  }, [form.period, form.startDate, form.endDate, materialLogs, today])
  const yearSources = useMemo(
    () => reports.filter(item =>
      item.confirmed && item.period !== 'year' &&
      item.startDate >= form.startDate && item.endDate <= form.endDate
    ),
    [reports, form.startDate, form.endDate]
  )

  const rangeLabel = formatRangeLabel(form.startDate, form.endDate)
  const currentKey = useMemo(() => `${form.period}|${form.template}|${form.startDate}|${form.endDate}`, [form])
  const matchSelected =
    selectedReport &&
    selectedReport.period === form.period &&
    selectedReport.startDate === form.startDate &&
    selectedReport.endDate === form.endDate &&
    selectedReport.template === form.template
  const isRegenerate = currentKey === lastGeneratedKey || !!matchSelected

  const startTyping = (content: string, reportId: string) => {
    if (typingTimer.current) {
      clearInterval(typingTimer.current)
      typingTimer.current = null
    }
    setTyping(true)
    setEditorContent('')
    const chars = content.split('')
    let index = 0
    const delay = setTimeout(() => {
      typingTimer.current = setInterval(() => {
        index += 1
        setEditorContent(chars.slice(0, index).join(''))
        if (index >= chars.length) {
          if (typingTimer.current) clearInterval(typingTimer.current)
          setSelectedReport(prev => (prev && prev.id === reportId ? { ...prev, confirmed: false } : prev))
          markUnconfirmed(reportId)
          setTyping(false)
        }
      }, 20)
    }, 800)
    typingTimer.current = delay as unknown as NodeJS.Timeout
  }

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearInterval(typingTimer.current)
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  const performGenerate = async () => {
    if (!(await reportAutoSave.saveNow())) return
    try {
      const created = await generateReport(form)
      setSelectedReport(created)
      setRangeAnchor(created.startDate)
      startTyping(created.content, created.id)
      setLastGeneratedKey(currentKey)
    } catch {
      // 已有提示
    }
  }

  const handleGenerate = async () => {
    if (isRegenerate) {
      setRegenerateOpen(true)
      return
    }
    await performGenerate()
  }

  const handleExportPdf = async () => {
    if (!selectedReport || !(await reportAutoSave.saveNow())) return
    try {
      await downloadReportPdf(selectedReport.title, editorContent, formatRangeLabel(selectedReport.startDate, selectedReport.endDate))
      toast.success(PAGE_TEXT.exportSuccess)
    } catch {
      toast.error(PAGE_TEXT.exportFail)
    }
  }

  const handleExportMarkdown = async () => {
    if (!selectedReport || !(await reportAutoSave.saveNow())) return
    downloadMarkdown(`${selectedReport.title}.md`, editorContent)
    toast.success(PAGE_TEXT.exportSuccess)
  }

  const handleBatchExport = async () => {
    if (!(await reportAutoSave.saveNow())) return
    setExportOpen(true)
  }

  const handleRefine = async () => {
    if (!selectedReport || !feedback.trim()) return
    if (!(await reportAutoSave.saveNow())) return
    const trimmed = feedback.trim()
    if (trimmed.length < 2) {
      toast.error('反馈意见至少2个字符')
      return
    }
    try {
      const updated = await refineReport(selectedReport.id, trimmed)
      setSelectedReport(updated)
      startTyping(updated.content, updated.id)
      setFeedback('')
      setShowFeedbackInput(false)
    } catch {
      // 已在 store 中提示
    }
  }

  const handleConfirm = async () => {
    if (!selectedReport) return
    if (!(await reportAutoSave.saveNow())) return
    try {
      const updated = await confirmReport({ id: selectedReport.id })
      setSelectedReport(updated)
    } catch {
      // 已有提示
    }
  }

  const handleCopy = async () => {
    if (!editorContent) return
    try {
      await navigator.clipboard.writeText(editorContent)
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 1500)
      toast.success(PAGE_TEXT.copySuccess)
    } catch {
      toast.error(PAGE_TEXT.copyFail)
    }
  }

  const onSelectReport = async (report: Report) => {
    if (selectedReport?.id !== report.id && !(await reportAutoSave.saveNow())) return
    setSelectedReport(report)
    setEditorContent(report.content)
    setRangeAnchor(report.startDate)
    setForm(prev => ({
      ...prev,
      period: report.period,
      startDate: report.startDate,
      endDate: report.endDate,
      template: report.template
    }))
    const nextKey = `${report.period}|${report.template}|${report.startDate}|${report.endDate}`
    setLastGeneratedKey(nextKey)
  }

  const onChangeForm = (key: keyof GenerateReportPayload, value: string) => {
    if (key === 'period') {
      const nextRange = buildRange(value as Report['period'], rangeAnchor)
      setForm(prev => ({ ...prev, period: value as Report['period'], ...nextRange }))
      setLastGeneratedKey(null)
    } else {
      setForm(prev => ({ ...prev, [key]: value }))
      if (key === 'template') {
        setLastGeneratedKey(null)
      }
    }
  }

  const handlePickDate = (value: string) => {
    if (!value || form.period === 'year') return
    if (value > today) {
      toast.error(PAGE_TEXT.reportFutureDateForbidden)
      return
    }
    setRangeAnchor(value)
    const nextRange = buildRange(form.period, value)
    setForm(prev => ({ ...prev, ...nextRange }))
    setLastGeneratedKey(null)
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div className="text-3xl font-semibold text-gray-900 dark:text-gray-50">{NAV_LABELS.reports}</div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
            <Skeleton className="h-[500px] w-full" />
            <Skeleton className="h-[500px] w-full" />
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[380px,1fr]">
            {/* 左侧：报告列表 */}
            <div className="rounded-xl border border-gray-200 bg-gray-100 p-4 shadow-card dark:border-gray-800 dark:bg-gray-900">
              <Accordion type="single" collapsible defaultValue="week">
                <AccordionItem value="week">
                  <AccordionTrigger>{PAGE_TEXT.reportWeekLabel}</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    {grouped.week.length === 0 ? (
                      <div className="py-4 text-center text-sm text-gray-400">{PAGE_TEXT.noReport}</div>
                    ) : (
                      grouped.week.map(item => (
                        <ReportCard key={item.id} item={item} selected={selectedReport?.id === item.id} onSelect={onSelectReport} />
                      ))
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="month">
                  <AccordionTrigger>{PAGE_TEXT.reportMonthLabel}</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    {grouped.month.length === 0 ? (
                      <div className="py-4 text-center text-sm text-gray-400">{PAGE_TEXT.noReport}</div>
                    ) : (
                      grouped.month.map(item => (
                        <ReportCard key={item.id} item={item} selected={selectedReport?.id === item.id} onSelect={onSelectReport} />
                      ))
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="year">
                  <AccordionTrigger>{PAGE_TEXT.reportYearLabel}</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    {grouped.year.length === 0 ? (
                      <div className="py-4 text-center text-sm text-gray-400">{PAGE_TEXT.noReport}</div>
                    ) : (
                      grouped.year.map(item => (
                        <ReportCard key={item.id} item={item} selected={selectedReport?.id === item.id} onSelect={onSelectReport} />
                      ))
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* 右侧：生成 + 编辑器 */}
            <div className="space-y-4">
              <Card className="space-y-4 hover:scale-100">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{PAGE_TEXT.reportTypeLabel}</div>
                    <Select value={form.period} onValueChange={(val) => onChangeForm('period', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder={PAGE_TEXT.reportTypeLabel} />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_OPTIONS.period.map(item => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{PAGE_TEXT.templateLabel}</div>
                    <Select value={form.template} onValueChange={(val) => onChangeForm('template', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder={PAGE_TEXT.templateLabel} />
                      </SelectTrigger>
                      <SelectContent>
                        {REPORT_OPTIONS.template.map(item => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{PAGE_TEXT.timeRangeLabel}</div>
                    {form.period === 'year' ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                        {rangeLabel}
                      </div>
                    ) : (
                      <>
                        <Input
                          type="date"
                          max={today}
                          value={rangeAnchor}
                          onChange={(e) => handlePickDate(e.target.value)}
                        />
                        <div className="text-xs text-gray-500 dark:text-gray-400">{rangeLabel}</div>
                      </>
                    )}
                  </div>
                </div>

                <Accordion type="single" collapsible>
                  <AccordionItem value="materials">
                    <AccordionTrigger>
                      {PAGE_TEXT.reportMaterialTitle} · {form.period === 'year'
                        ? `${PAGE_TEXT.reportMaterialYear} ${yearSources.length}`
                        : `${PAGE_TEXT.reportMaterialCount} ${materialLogs.length}，${PAGE_TEXT.reportMaterialMissing} ${missingDates.length}`}
                    </AccordionTrigger>
                    <AccordionContent>
                      {missingDates.length === 0 ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{PAGE_TEXT.reportMaterialReady}</div>
                      ) : (
                        <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                          {missingDates.map(date => (
                            <Link key={date} href={`/history?date=${date}`} className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:scale-105 dark:border-gray-700 dark:text-gray-200 transition-all duration-200">
                              {date} · {PAGE_TEXT.sourceDateLabel}
                            </Link>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* 操作按钮行：立即生成 + 导出 PDF */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleGenerate} disabled={generating || typing} size="lg" className="flex items-center gap-2">
                    {(generating || typing) && <Loader2 className="h-4 w-4 animate-spin" />}
                    {generating || typing ? PAGE_TEXT.generating : isRegenerate ? PAGE_TEXT.generateAgain : PAGE_TEXT.generateNow}
                  </Button>

                  {sortedReports.length > 0 && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => { void handleBatchExport() }}
                      className="flex items-center gap-2"
                    >
                      <FileDown className="h-4 w-4" />
                      {PAGE_TEXT.exportBatch}
                    </Button>
                  )}

                  {(generating || typing) && (
                    <div className="text-sm text-gray-400 dark:text-gray-500">{PAGE_TEXT.reportGeneratingHint}</div>
                  )}
                </div>
              </Card>

              {/* 编辑器卡片 */}
              <Card className="space-y-4 hover:scale-100">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {selectedReport ? selectedReport.title : PAGE_TEXT.selectReportHint}
                  </div>
                  {selectedReport && (
                    <div className="text-xs text-gray-300 dark:text-gray-300">
                      {formatRangeLabel(selectedReport.startDate, selectedReport.endDate)}
                    </div>
                  )}
                </div>
                <Editor
                  value={editorContent}
                  onChange={setEditorContent}
                  minHeight="300px"
                />
                <SaveStatus status={reportAutoSave.status} onRetry={() => { void reportAutoSave.saveNow() }} />

                {/* 反馈优化区域 */}
                {selectedReport && selectedReport.status === 'ready' && (
                  <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowFeedbackInput(!showFeedbackInput); setFeedback('') }}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      {showFeedbackInput ? PAGE_TEXT.refineToggleCollapse : PAGE_TEXT.refineToggle}
                    </Button>
                    {showFeedbackInput && (
                      <div className="mt-3 space-y-3">
                        <textarea
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-gray-600 dark:focus:ring-gray-800 transition-all duration-200"
                          rows={3}
                          placeholder={PAGE_TEXT.refinePlaceholder}
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          disabled={refining || generating || typing}
                        />
                        <Button
                          onClick={handleRefine}
                          disabled={!feedback.trim() || refining || generating || typing}
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          {(refining) && <Loader2 className="h-4 w-4 animate-spin" />}
                          {refining ? PAGE_TEXT.refining : PAGE_TEXT.refineReport}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={handleCopy}>
                    <span className="flex items-center gap-2">
                      <MorphIcon icon={copied ? Check : Copy} size={16} reducedMotion="user" />
                      {PAGE_TEXT.copyReport}
                    </span>
                  </Button>
                  <Button variant="outline" onClick={() => { void handleExportMarkdown() }} disabled={!selectedReport}>
                    {PAGE_TEXT.exportMarkdown}
                  </Button>
                  <Button variant="outline" onClick={() => { void handleExportPdf() }} disabled={!selectedReport}>
                    {PAGE_TEXT.exportReport}
                  </Button>
                  <Button onClick={handleConfirm} disabled={!selectedReport || selectedReport.confirmed || selectedReport.status !== 'ready'}>
                    {selectedReport?.confirmed ? PAGE_TEXT.confirmed : PAGE_TEXT.confirmReport}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{PAGE_TEXT.generateAgain}</DialogTitle></DialogHeader>
          <div className="text-sm text-gray-600 dark:text-gray-300">{PAGE_TEXT.regenerateWarning}</div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRegenerateOpen(false)}>{DIALOG_TEXT.close}</Button>
            <Button onClick={() => { setRegenerateOpen(false); void performGenerate() }}>{PAGE_TEXT.regenerateConfirm}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 批量导出弹窗 */}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        reports={sortedReports}
      />
    </PageShell>
  )
}

export default ReportsPage
