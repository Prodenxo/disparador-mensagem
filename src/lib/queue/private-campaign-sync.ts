import { prisma } from '@/lib/prisma'
import { announcementQueue } from '@/lib/queue/announcement.queue'
import { schedulePrivateCampaignJob } from '@/lib/queue/private-campaign.queue'

export async function syncScheduledPrivateCampaignJobs (): Promise<{
  enqueued: number
  skipped: number
  total: number
}> {
  const scheduled = await prisma.privateCampaign.findMany({
    where: { status: 'SCHEDULED' },
    select: { id: true, scheduledAt: true },
    orderBy: { scheduledAt: 'asc' }
  })

  let enqueued = 0
  let skipped = 0

  for (const item of scheduled) {
    const jobId = `private-${item.id}`
    const existing = await announcementQueue.getJob(jobId)

    if (existing) {
      const state = await existing.getState()

      if (state === 'failed') {
        await existing.remove()
        const runAt = item.scheduledAt.getTime() <= Date.now() ? new Date() : item.scheduledAt
        await schedulePrivateCampaignJob(item.id, runAt)
        enqueued += 1
        continue
      }

      skipped += 1
      continue
    }

    const runAt = item.scheduledAt.getTime() <= Date.now() ? new Date() : item.scheduledAt
    await schedulePrivateCampaignJob(item.id, runAt)
    enqueued += 1
  }

  return { enqueued, skipped, total: scheduled.length }
}
