import { addDays } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { env } from '@/lib/env'

export function getTimezoneDayRange (referenceDate = new Date()): {
  todayStart: Date
  tomorrowStart: Date
} {
  const dateLabel = formatInTimeZone(referenceDate, env.timezone, 'yyyy-MM-dd')
  const todayStart = fromZonedTime(`${dateLabel}T00:00:00`, env.timezone)
  const tomorrowStart = addDays(todayStart, 1)

  return { todayStart, tomorrowStart }
}
