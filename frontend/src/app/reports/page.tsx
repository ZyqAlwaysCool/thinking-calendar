'use client'

import { useEffect, useMemo, useState } from 'react'
import { endOfISOWeek, endOfMonth, endOfYear, format, startOfISOWeek, startOfMonth, startOfYear } from 'date-fns'
import { toast } from 'react-hot-toast'
import { PageShell } from '@/components/page-shell'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Editor } from '@/components/editor'
import { NAV_LABELS, PAGE_TEXT, REPORT_OPTIONS } from '@/lib/constants'
import { formatDateLabel, formatRangeLabel, formatTime } from '@/lib/utils'
import { useReportStore } from '@/stores/use-report-store'
import { type GenerateReportPayload, type Report } from '@/types'

const buildRange = (period: Report['period']) => {
  const now = new Date()
  if (period === 'week') {
    return {
      startDate: format(startOfISOWeek(now), 'yyyy-MM-dd'),
      endDate: format(endOfISOWeek(now), 'yyyy-MM-dd')
    }
  }
  if (period === 'month') {
    return {
      startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd')
    }
  }
  return {
    startDate: format(startOfYear(now), 'yyyy-MM-dd'),
    endDate: format(endOfYear(now), 'yyyy-MM-dd')
  }
}

const ReportsPage = () => {
  const { reports, fetchReports, loading, generateReport, generating, confirmReport } = useReportStore()
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [editorContent, setEditorContent] = useState('')
  const [form, setForm] = useState<GenerateReportPayload>({
    period: 'week',
    template: 'formal',
    ...buildRange('week')
  })

  useEffect(() => {
    void fetchReports().catch(() => {})
  }, [fetchReports])

  useEffect(() => {
    if (reports.length && !selectedReport) {
      setSelectedReport(reports[0])
      setEditorContent(reports[0].content)
    }
  }, [reports, selectedReport])

  const grouped = useMemo(() => {
    const week = reports.filter(item => item.period === 'week')
    const month = reports.filter(item => item.period === 'month')
    const year = reports.filter(item => item.period === 'year')
    return { week, month, year }
  }, [reports])

  const rangeLabel = formatRangeLabel(form.startDate, form.endDate)
  const hasConfirmedBase = reports.some(item => item.confirmed && item.period !== 'year')

  const handleGenerate = async () => {
    try {
      const created = await generateReport(form)
      setSelectedReport(created)
      setEditorContent(created.content)
    } catch {
      // 已有提示
    }
  }

  const handleConfirm = async () => {
    if (!selectedReport) return
    try {
      await confirmReport(selectedReport.id)
      setSelectedReport({ ...selectedReport, confirmed: true })
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
      if (!printWindow) throw new Error('open window failed')
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
  }

  const onChangeForm = (key: keyof GenerateReportPayload, value: string) => {
    if (key === 'period') {
      const nextRange = buildRange(value as Report['period'])
      setForm(prev => ({ ...prev, period: value as Report['period'], ...nextRange }))
    } else {
      setForm(prev => ({ ...prev, [key]: value }))
    }
  }

  const handleGenerateYearly = async () => {
    const range = buildRange('year')
    try {
      const created = await generateReport({ ...range, period: 'year', template: form.template })
      setSelectedReport(created)
      setEditorContent(created.content)
    } catch {
      // 已有提示
    }
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
                          <div className="text-xs text-gray-300 dark:text-gray-300">
                            {item.confirmed ? PAGE_TEXT.confirmed : PAGE_TEXT.unconfirmed}
                          </div>
                        </div>
                        <div className="text-xs text-gray-300 dark:text-gray-300">{formatRangeLabel(item.startDate, item.endDate)}</div>
                        <div className="text-xs text-gray-300 dark:text-gray-300">{formatTime(item.createdAt)}</div>
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
                          <div className="text-xs text-gray-300 dark:text-gray-300">
                            {item.confirmed ? PAGE_TEXT.confirmed : PAGE_TEXT.unconfirmed}
                          </div>
                        </div>
                        <div className="text-xs text-gray-300 dark:text-gray-300">{formatRangeLabel(item.startDate, item.endDate)}</div>
                        <div className="text-xs text-gray-300 dark:text-gray-300">{formatTime(item.createdAt)}</div>
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
                          <div className="text-xs text-gray-300 dark:text-gray-300">
                            {item.confirmed ? PAGE_TEXT.confirmed : PAGE_TEXT.unconfirmed}
                          </div>
                        </div>
                        <div className="text-xs text-gray-300 dark:text-gray-300">{formatRangeLabel(item.startDate, item.endDate)}</div>
                        <div className="text-xs text-gray-300 dark:text-gray-300">{formatTime(item.createdAt)}</div>
                      </Card>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            <div className="space-y-4">
              <Card className="space-y-4">
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
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
                      {rangeLabel}
                    </div>
                  </div>
                </div>
                <Button onClick={handleGenerate} disabled={generating} size="lg">
                  {generating ? PAGE_TEXT.generating : PAGE_TEXT.generateNow}
                </Button>
              </Card>

              <Card className="space-y-4">
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
                <Editor value={editorContent} onChange={setEditorContent} minHeight="300px" />
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={handleCopy}>
                    {PAGE_TEXT.copyReport}
                  </Button>
                  <Button variant="outline" onClick={handleExport}>
                    {PAGE_TEXT.exportReport}
                  </Button>
                  <Button onClick={handleConfirm} disabled={!selectedReport || selectedReport.confirmed}>
                    {selectedReport?.confirmed ? PAGE_TEXT.confirmed : PAGE_TEXT.confirmReport}
                  </Button>
                </div>
              </Card>

              <Card className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-50">{PAGE_TEXT.generateYearly}</div>
                  <div className="text-sm text-gray-300 dark:text-gray-300">{PAGE_TEXT.yearlyHint}</div>
                </div>
                <Button disabled={!hasConfirmedBase} onClick={handleGenerateYearly}>
                  {PAGE_TEXT.generateYearly}
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}

export default ReportsPage
