'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  eachDayOfInterval,
  endOfISOWeek,
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfISOWeek,
  startOfMonth,
  startOfYear
} from 'date-fns'
import { toast } from 'react-hot-toast'
import { PageShell } from '@/components/page-shell'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Editor } from '@/components/editor'
import { SaveStatus } from '@/components/save-status'
import { useAutoSave } from '@/lib/use-auto-save'
import { DIALOG_TEXT, PAGE_TEXT, REPORT_FILTER_OPTIONS, REPORT_OPTIONS } from '@/lib/constants'
import { formatDateTime, formatRangeLabel } from '@/lib/utils'
import { downloadBatchReportPdf, downloadReportPdf } from '@/lib/pdf'
import { downloadMarkdown } from '@/lib/download-markdown'
import {
  Check,
  CheckSquare,
  Copy,
  Download,
  FileDown,
  Loader2,
  MoreHorizontal,
  Plus,
  Square,
  Wand2
} from 'lucide-react'
import { useReportStore } from '@/stores/use-report-store'
import { useLogStore } from '@/stores/use-log-store'
import { type GenerateReportPayload, type Report, type ReportFilter, type ReportPeriod } from '@/types'
import { cn } from '@/lib/utils'

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

const periodLabel: Record<ReportPeriod, string> = {
  week: PAGE_TEXT.reportWeekLabel,
  month: PAGE_TEXT.reportMonthLabel,
  year: PAGE_TEXT.reportYearLabel
}

const reportState = (item: Report) => {
  if (item.status === 'failed') return { label: PAGE_TEXT.reportFailed, dot: 'bg-red-500' }
  if (item.status === 'queued' || item.status === 'processing') return { label: PAGE_TEXT.reportProcessing, dot: 'bg-amber-500' }
  if (item.confirmed) return { label: PAGE_TEXT.confirmed, dot: 'bg-emerald-500' }
  return { label: PAGE_TEXT.unconfirmed, dot: 'bg-gray-400' }
}

type ExportDialogProps = {
  open: boolean
  onClose: () => void
  reports: Report[]
}

const ExportDialog = ({ open, onClose, reports }: ExportDialogProps) => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!open) setCheckedIds(new Set())
  }, [open])

  const toggle = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExport = async () => {
    const selected = reports.filter(item => checkedIds.has(item.id))
    if (selected.length === 0) {
      toast.error('请至少选择一项')
      return
    }
    setExporting(true)
    try {
      await downloadBatchReportPdf(selected.map(item => ({
        title: item.title,
        content: item.content,
        dateRange: formatRangeLabel(item.startDate, item.endDate)
      })))
      toast.success(PAGE_TEXT.exportSuccess)
      onClose()
    } catch {
      toast.error(PAGE_TEXT.exportFail)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={openValue => { if (!openValue) onClose() }}>
      <DialogContent className="max-w-[620px]">
        <DialogHeader>
          <DialogTitle>批量导出报告</DialogTitle>
        </DialogHeader>

        <div className="mt-3 max-h-[55vh] overflow-y-auto border-y border-gray-200 dark:border-gray-800">
          {reports.map(item => {
            const checked = checkedIds.has(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-2 py-3 text-left last:border-b-0 hover:bg-gray-50 dark:border-gray-900 dark:hover:bg-gray-900/40"
              >
                {checked ? <CheckSquare className="h-4 w-4 text-gray-900 dark:text-gray-100" /> : <Square className="h-4 w-4 text-gray-400" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</div>
                  <div className="mt-1 text-xs text-gray-400">{formatRangeLabel(item.startDate, item.endDate)}</div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-gray-400">已选择 {checkedIds.size} 项</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>{PAGE_TEXT.exportCancel}</Button>
            <Button onClick={() => { void handleExport() }} disabled={checkedIds.size === 0 || exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {PAGE_TEXT.exportSelected}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const ReportsPage = () => {
  const {
    reports,
    fetchReports,
    loading,
    generateReport,
    generating,
    refineReport,
    refining,
    confirmReport,
    saveDraft
  } = useReportStore()
  const { logs, fetchLogs } = useLogStore()

  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [listPeriod, setListPeriod] = useState<ReportPeriod>('week')
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [regenerateOpen, setRegenerateOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [showRefine, setShowRefine] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')
  const [rangeAnchor, setRangeAnchor] = useState(today)
  const [form, setForm] = useState<GenerateReportPayload>({
    period: 'week',
    template: 'formal',
    ...buildRange('week', today)
  })

  useEffect(() => {
    void fetchReports().catch(() => {})
    void fetchLogs().catch(() => {})
  }, [fetchReports, fetchLogs])

  useEffect(() => {
    if (reports.length && !selectedReport) {
      const first = reports[0]
      setSelectedReport(first)
      setEditorContent(first.content)
      setListPeriod(first.period)
    }
  }, [reports, selectedReport])

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current)
  }, [])

  const reportAutoSave = useAutoSave({
    value: editorContent,
    savedValue: selectedReport?.content ?? '',
    enabled: !!selectedReport && selectedReport.status === 'ready' && !generating && !refining,
    canSave: value => value.trim().length > 0,
    onSave: async nextContent => {
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

  const visibleReports = useMemo(() => sortedReports.filter(item => {
    if (item.period !== listPeriod) return false
    if (reportFilter === 'pending') return item.status === 'ready' && !item.confirmed
    if (reportFilter === 'confirmed') return item.confirmed
    if (reportFilter === 'generating') return item.status === 'queued' || item.status === 'processing'
    if (reportFilter === 'failed') return item.status === 'failed'
    return true
  }), [sortedReports, listPeriod, reportFilter])

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
      item.confirmed &&
      item.period !== 'year' &&
      item.startDate >= form.startDate &&
      item.endDate <= form.endDate
    ),
    [reports, form.startDate, form.endDate]
  )

  const matchReport = useMemo(
    () => reports.find(item =>
      item.period === form.period &&
      item.startDate === form.startDate &&
      item.endDate === form.endDate &&
      item.template === form.template
    ) ?? null,
    [reports, form]
  )

  const onSelectReport = async (report: Report) => {
    if (selectedReport?.id !== report.id && !(await reportAutoSave.saveNow())) return
    setSelectedReport(report)
    setEditorContent(report.content)
    setListPeriod(report.period)
    setShowRefine(false)
    setFeedback('')
  }

  const onChangePeriod = (period: ReportPeriod) => {
    setForm(prev => ({ ...prev, period, ...buildRange(period, rangeAnchor) }))
  }

  const handlePickDate = (value: string) => {
    if (!value || form.period === 'year') return
    if (value > today) {
      toast.error(PAGE_TEXT.reportFutureDateForbidden)
      return
    }
    setRangeAnchor(value)
    setForm(prev => ({ ...prev, ...buildRange(prev.period, value) }))
  }

  const performGenerate = async () => {
    if (!(await reportAutoSave.saveNow())) return
    try {
      const created = await generateReport(form)
      setSelectedReport(created)
      setEditorContent(created.content)
      setListPeriod(created.period)
      setCreateOpen(false)
      setRegenerateOpen(false)
    } catch {}
  }

  const handleGenerate = () => {
    if (matchReport) {
      setRegenerateOpen(true)
      return
    }
    void performGenerate()
  }

  const handleConfirm = async () => {
    if (!selectedReport || !(await reportAutoSave.saveNow())) return
    try {
      const updated = await confirmReport({ id: selectedReport.id })
      setSelectedReport(updated)
    } catch {}
  }

  const handleRefine = async () => {
    const trimmed = feedback.trim()
    if (!selectedReport || trimmed.length < 2) return
    if (!(await reportAutoSave.saveNow())) return
    try {
      const updated = await refineReport(selectedReport.id, trimmed)
      setSelectedReport(updated)
      setEditorContent(updated.content)
      setFeedback('')
      setShowRefine(false)
    } catch {}
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

  const handleExportPdf = async () => {
    if (!selectedReport || !(await reportAutoSave.saveNow())) return
    try {
      await downloadReportPdf(
        selectedReport.title,
        editorContent,
        formatRangeLabel(selectedReport.startDate, selectedReport.endDate)
      )
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

  return (
    <PageShell>
      <PageHeader
        eyebrow="输出"
        title="报告"
        description="浏览历史报告，必要时修改内容；新建报告时再选择周期、日期和版式。"
        action={
          <div className="flex items-center gap-2">
            {sortedReports.length > 0 ? (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setExportOpen(true)}>
                <FileDown className="h-4 w-4" />
                批量导出
              </Button>
            ) : null}
            <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              新建报告
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Skeleton className="h-[620px] w-full" />
          <Skeleton className="h-[620px] w-full" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="min-w-0">
            <div className="mb-4 grid grid-cols-3 rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
              {(['week', 'month', 'year'] as ReportPeriod[]).map(period => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setListPeriod(period)}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-xs font-medium transition-colors duration-150',
                    listPeriod === period
                      ? 'bg-white text-gray-950 shadow-sm dark:bg-gray-800 dark:text-gray-50'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                  )}
                >
                  {periodLabel[period]}
                </button>
              ))}
            </div>

            <Select value={reportFilter} onValueChange={value => setReportFilter(value as ReportFilter)}>
              <SelectTrigger className="mb-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_FILTER_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
              {visibleReports.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">{PAGE_TEXT.noReport}</div>
              ) : visibleReports.map(item => {
                const state = reportState(item)
                const active = selectedReport?.id === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { void onSelectReport(item) }}
                    className={cn(
                      'w-full px-2 py-4 text-left transition-colors duration-150',
                      active ? 'bg-gray-100/80 dark:bg-gray-900' : 'hover:bg-gray-50 dark:hover:bg-gray-900/40'
                    )}
                  >
                    <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</div>
                    <div className="mt-1 text-xs text-gray-400">{formatRangeLabel(item.startDate, item.endDate)}</div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                      <span className={cn('h-1.5 w-1.5 rounded-full', state.dot)} />
                      {state.label}
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="min-w-0">
            {!selectedReport ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-gray-200 text-sm text-gray-400 dark:border-gray-800">
                {PAGE_TEXT.selectReportHint}
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-col gap-4 border-b border-gray-200 pb-5 dark:border-gray-800 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">{selectedReport.title}</h2>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className={cn('h-1.5 w-1.5 rounded-full', reportState(selectedReport).dot)} />
                        {reportState(selectedReport).label}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                      <span>{formatRangeLabel(selectedReport.startDate, selectedReport.endDate)}</span>
                      <span>更新于 {formatDateTime(selectedReport.updatedAt || selectedReport.createdAt)}</span>
                      <SaveStatus status={reportAutoSave.status} onRetry={() => { void reportAutoSave.saveNow() }} />
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { void handleCopy() }}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {PAGE_TEXT.copyReport}
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { void handleExportPdf() }}>
                      <Download className="h-4 w-4" />
                      PDF
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => { void handleExportMarkdown() }}>
                      <MoreHorizontal className="h-4 w-4" />
                      Markdown
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => { void handleConfirm() }}
                      disabled={selectedReport.confirmed || selectedReport.status !== 'ready'}
                    >
                      {selectedReport.confirmed ? PAGE_TEXT.confirmed : PAGE_TEXT.confirmReport}
                    </Button>
                  </div>
                </div>

                {selectedReport.status === 'failed' ? (
                  <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300">
                    {selectedReport.failedReason || PAGE_TEXT.reportFailed}
                  </div>
                ) : null}

                <Editor
                  value={editorContent}
                  onChange={setEditorContent}
                  quiet
                  minHeight="min(58vh, 720px)"
                />

                {selectedReport.status === 'ready' ? (
                  <div className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-800">
                    {!showRefine ? (
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowRefine(true)}>
                        <Wand2 className="h-4 w-4" />
                        {PAGE_TEXT.refineToggle}
                      </Button>
                    ) : (
                      <div className="max-w-2xl">
                        <div className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">修改这份报告</div>
                        <textarea
                          rows={3}
                          className="w-full rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-gray-800"
                          placeholder={PAGE_TEXT.refinePlaceholder}
                          value={feedback}
                          onChange={event => setFeedback(event.target.value)}
                          disabled={refining || generating}
                        />
                        <div className="mt-2 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => { void handleRefine() }}
                            disabled={feedback.trim().length < 2 || refining || generating}
                          >
                            {refining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {refining ? PAGE_TEXT.refining : PAGE_TEXT.refineReport}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setShowRefine(false); setFeedback('') }}>
                            取消
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[640px]">
          <DialogHeader>
            <DialogTitle>新建报告</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            <div>
              <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">报告类型</div>
              <div className="grid grid-cols-3 rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
                {(['week', 'month', 'year'] as ReportPeriod[]).map(period => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => onChangePeriod(period)}
                    className={cn(
                      'rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                      form.period === period
                        ? 'bg-white text-gray-950 shadow-sm dark:bg-gray-800 dark:text-gray-50'
                        : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                    )}
                  >
                    {periodLabel[period]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{PAGE_TEXT.templateLabel}</div>
                <Select value={form.template} onValueChange={value => setForm(prev => ({ ...prev, template: value as 'formal' | 'simple' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPORT_OPTIONS.template.map(item => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{PAGE_TEXT.timeRangeLabel}</div>
                {form.period === 'year' ? (
                  <div className="flex h-10 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                    {formatRangeLabel(form.startDate, form.endDate)}
                  </div>
                ) : (
                  <Input type="date" max={today} value={rangeAnchor} onChange={event => handlePickDate(event.target.value)} />
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">生成材料</div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {form.period === 'year'
                  ? `已确认的周报 / 月报 ${yearSources.length} 份`
                  : `已有记录 ${materialLogs.length} 天，待补 ${missingDates.length} 天`}
              </div>
              {missingDates.length > 0 ? (
                <div className="mt-3 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                  {missingDates.map(date => (
                    <Link
                      key={date}
                      href={`/history?date=${date}`}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-gray-900"
                    >
                      {date} · 补写
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-gray-400">{formatRangeLabel(form.startDate, form.endDate)}</div>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {generating ? PAGE_TEXT.generating : matchReport ? PAGE_TEXT.generateAgain : PAGE_TEXT.generateNow}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{PAGE_TEXT.generateAgain}</DialogTitle></DialogHeader>
          <div className="text-sm leading-6 text-gray-600 dark:text-gray-300">{PAGE_TEXT.regenerateWarning}</div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRegenerateOpen(false)}>{DIALOG_TEXT.close}</Button>
            <Button onClick={() => { void performGenerate() }}>{PAGE_TEXT.regenerateConfirm}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} reports={sortedReports} />
    </PageShell>
  )
}

export default ReportsPage
