import { prisma } from '@/lib/prisma'
import { announcementQueue, scheduleAnnouncementJob } from '@/lib/queue/announcement.queue'

export async function syncScheduledAnnouncementJobs (): Promise<{
  enqueued: number
  skipped: number
  total: number
}> {
  const scheduled = await prisma.announcement.findMany({
    where: { status: 'SCHEDULED' },
    select: { id: true, scheduledAt: true },
    orderBy: { scheduledAt: 'asc' }
  })

  let enqueued = 0
  let skipped = 0

  for (const item of scheduled) {
    const existing = await announcementQueue.getJob(item.id)

    if (existing) {
      skipped += 1
      continue
    }

    await scheduleAnnouncementJob(item.id, item.scheduledAt)
    enqueued += 1
  }

  return {
    enqueued,
    skipped,
    total: scheduled.length
  }
}
