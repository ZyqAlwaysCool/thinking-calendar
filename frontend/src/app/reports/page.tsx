'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { endOfISOWeek, endOfMonth, endOfYear, format, parseISO, startOfISOWeek, startOfMonth, startOfYear } from 'date-fns'
import { toast } from 'react-hot-toast'
import { PageShell } from '@/components/page-shell'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Editor } from '@/components/editor'
import { NAV_LABELS, PAGE_TEXT, REPORT_OPTIONS } from '@/lib/constants'
import { formatDateTime, formatRangeLabel } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useReportStore } from '@/stores/use-report-store'
import { type GenerateReportPayload, type Report } from '@/types'

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

const ReportsPage = () => {
  const { reports, fetchReports, loading, generateReport, generating, confirmReport, markUnconfirmed } = useReportStore()
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

  useEffect(() => {
    void fetchReports().catch(() => {})
  }, [fetchReports])

  useEffect(() => {
    if (reports.length && !selectedReport) {
      setSelectedReport(reports[0])
      setEditorContent(reports[0].content)
    }
  }, [reports, selectedReport])

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => (a.endDate < b.endDate ? 1 : -1)),
    [reports]
  )
  const grouped = useMemo(() => {
    const week = sortedReports.filter(item => item.period === 'week')
    const month = sortedReports.filter(item => item.period === 'month')
    const year = sortedReports.filter(item => item.period === 'year')
    return { week, month, year }
  }, [sortedReports])

  const rangeLabel = formatRangeLabel(form.startDate, form.endDate)
  const currentKey = useMemo(() => `${form.period}|${form.template}|${form.startDate}|${form.endDate}`, [form])
  const matchSelected =
    selectedReport &&
    selectedReport.period === form.period &&
    selectedReport.startDate === form.startDate &&
    selectedReport.endDate === form.endDate &&
    selectedReport.template === form.template
  const isRegenerate = currentKey === lastGeneratedKey || !!matchSelected

  const startTyping = (content: string) => {
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
          if (selectedReport && selectedReport.confirmed) {
            setSelectedReport({ ...selectedReport, confirmed: false })
            markUnconfirmed(selectedReport.id)
          }
          setTyping(false)
        }
      }, 20)
    }, 800)
    typingTimer.current = delay as unknown as NodeJS.Timeout
  }

  useEffect(() => {
    return () => {
      if (typingTimer.current) {
        clearInterval(typingTimer.current)
      }
    }
  }, [])

  const handleGenerate = async () => {
    try {
      const created = await generateReport(form)
      setSelectedReport(created)
      setRangeAnchor(created.startDate)
      startTyping(created.content)
      setLastGeneratedKey(currentKey)
    } catch {
      // 已有提示
    }
  }

  const handleConfirm = async () => {
    if (!selectedReport) return
    try {
      const updated = await confirmReport({ id: selectedReport.id, content: editorContent })
      setSelectedReport(updated)
    } catch {
      // 已有提示
    }
  }

  const handleCopy = async () => {
    if (!editorContent) return
    try {
      await navigator.clipboard.writeText(editorContent)
      toast.success(PAGE_TEXT.copySuccess)
    } catch (error) {
      toast.error(PAGE_TEXT.copyFail)
    }
  }

  const handleExport = () => {
    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) throw new Error(PAGE_TEXT.exportFail)
      printWindow.document.write(`<pre style="font-family: system-ui; white-space: pre-wrap;">${editorContent}</pre>`)
      printWindow.document.close()
      printWindow.print()
      toast.success(PAGE_TEXT.exportSuccess)
    } catch (error) {
      toast.error(PAGE_TEXT.exportFail)
    }
  }

  const onSelectReport = (report: Report) => {
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
    const nextKey = `${report.period}|${form.template}|${report.startDate}|${report.endDate}`
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
            <div className="rounded-xl border border-gray-200 bg-gray-100 p-4 shadow-card dark:border-gray-800 dark:bg-gray-900">
              <Accordion type="single" collapsible defaultValue="week">
                <AccordionItem value="week">
                  <AccordionTrigger>{PAGE_TEXT.reportWeekLabel}</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    {grouped.week.map(item => (
                      <Card
                        key={item.id}
                        className="cursor-pointer space-y-1 border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                        onClick={() => onSelectReport(item)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-gray-900 dark:text-gray-50">{item.title}</div>
                          <span
                            className={
                              item.confirmed
                                ? 'rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-50 dark:bg-gray-100 dark:text-gray-900'
                                : 'rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200'
                            }
                          >
                            {item.confirmed ? PAGE_TEXT.confirmed : PAGE_TEXT.unconfirmed}
                          </span>
                        </div>
                        <div className="text-xs text-gray-300 dark:text-gray-300">{formatRangeLabel(item.startDate, item.endDate)}</div>
                        <div className="text-xs text-gray-300 dark:text-gray-300">
                          {`${PAGE_TEXT.lastUpdatedRecent}：${formatDateTime(item.updatedAt || item.createdAt)}`}
                        </div>
                      </Card>
                    ))}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="month">
                  <AccordionTrigger>{PAGE_TEXT.reportMonthLabel}</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    {grouped.month.map(item => (
                      <Card
                        key={item.id}
                        className="cursor-pointer space-y-1 border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                        onClick={() => onSelectReport(item)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-gray-900 dark:text-gray-50">{item.title}</div>
                          <span
                            className={
                              item.confirmed
                                ? 'rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-50 dark:bg-gray-100 dark:text-gray-900'
                                : 'rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200'
                            }
                          >
                            {item.confirmed ? PAGE_TEXT.confirmed : PAGE_TEXT.unconfirmed}
                          </span>
                        </div>
                        <div className="text-xs text-gray-300 dark:text-gray-300">{formatRangeLabel(item.startDate, item.endDate)}</div>
                        <div className="text-xs text-gray-300 dark:text-gray-300">
                          {`${PAGE_TEXT.lastUpdatedRecent}：${formatDateTime(item.updatedAt || item.createdAt)}`}
                        </div>
                      </Card>
                    ))}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="year">
                  <AccordionTrigger>{PAGE_TEXT.reportYearLabel}</AccordionTrigger>
                  <AccordionContent className="space-y-2">
                    {grouped.year.map(item => (
                      <Card
                        key={item.id}
                        className="cursor-pointer space-y-1 border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800"
                        onClick={() => onSelectReport(item)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-gray-900 dark:text-gray-50">{item.title}</div>
                          <span
                            className={
                              item.confirmed
                                ? 'rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-gray-50 dark:bg-gray-100 dark:text-gray-900'
                                : 'rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200'
                            }
                          >
                            {item.confirmed ? PAGE_TEXT.confirmed : PAGE_TEXT.unconfirmed}
                          </span>
                        </div>
                        <div className="text-xs text-gray-300 dark:text-gray-300">{formatRangeLabel(item.startDate, item.endDate)}</div>
                        <div className="text-xs text-gray-300 dark:text-gray-300">
                          {`${PAGE_TEXT.lastUpdatedRecent}：${formatDateTime(item.updatedAt || item.createdAt)}`}
                        </div>
                      </Card>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

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
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleGenerate} disabled={generating || typing} size="lg" className="flex items-center gap-2">
                    {(generating || typing) && <Loader2 className="h-4 w-4 animate-spin" />}
                    {generating || typing ? PAGE_TEXT.generating : isRegenerate ? PAGE_TEXT.generateAgain : PAGE_TEXT.generateNow}
                  </Button>
                  {(generating || typing) && (
                    <div className="text-sm text-gray-400 dark:text-gray-500">{PAGE_TEXT.reportGeneratingHint}</div>
                  )}
                  <Button variant="outline" size="lg" className="flex items-center gap-2">
                    {PAGE_TEXT.exportBatch}
                  </Button>
                </div>
              </Card>

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
                  onChange={(val) => {
                    setEditorContent(val)
                    if (selectedReport && selectedReport.confirmed) {
                      setSelectedReport({ ...selectedReport, confirmed: false })
                      markUnconfirmed(selectedReport.id)
                    }
                  }}
                  minHeight="300px"
                />
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={handleCopy}>
                    {PAGE_TEXT.copyReport}
                  </Button>
                  <Button variant="outline" onClick={handleExport}>
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
    </PageShell>
  )
}

export default ReportsPage
