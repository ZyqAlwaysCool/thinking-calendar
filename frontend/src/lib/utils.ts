import { format, getISOWeek, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))

export const formatDateLabel = (dateString: string): string =>
  format(parseISO(dateString), 'yyyy年MM月dd日 EEEE', { locale: zhCN })

export const formatShortDate = (dateString: string): string =>
  format(parseISO(dateString), 'MM月dd日', { locale: zhCN })

export const formatWeekLabel = (dateString: string): string => {
  const week = getISOWeek(parseISO(dateString))
  return `第${week}周`
}

export const formatRangeLabel = (start: string, end: string): string => {
  const startDate = parseISO(start)
  const endDate = parseISO(end)
  const sameMonth = format(startDate, 'yyyyMM') === format(endDate, 'yyyyMM')
  if (sameMonth) {
    return `${format(startDate, 'yyyy年MM月dd日', { locale: zhCN })} ~ ${format(endDate, 'dd日', { locale: zhCN })}`
  }
  return `${format(startDate, 'yyyy年MM月dd日', { locale: zhCN })} ~ ${format(endDate, 'yyyy年MM月dd日', { locale: zhCN })}`
}

export const formatTime = (dateString: string): string =>
  format(parseISO(dateString), 'HH:mm', { locale: zhCN })

export const formatDateTime = (dateString: string): string =>
  format(parseISO(dateString), 'yyyy-MM-dd HH:mm', { locale: zhCN })
