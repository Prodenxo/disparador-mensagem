import { Queue } from 'bullmq'
import { env } from '@/lib/env'

export const ANNOUNCEMENT_QUEUE = 'announcements'

const connection = { url: env.redisUrl, maxRetriesPerRequest: null }

export const announcementQueue = new Queue(ANNOUNCEMENT_QUEUE, { connection })

export async function scheduleAnnouncementJob (
  announcementId: string,
  scheduledAt: Date
): Promise<void> {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now())

  await announcementQueue.add(
    'dispatch',
    { announcementId },
    {
      jobId: announcementId,
      delay,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 }
    }
  )
}

export async function cancelAnnouncementJob (announcementId: string): Promise<void> {
  const job = await announcementQueue.getJob(announcementId)
  if (job) await job.remove()
}
