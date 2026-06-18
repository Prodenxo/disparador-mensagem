import { announcementQueue } from '@/lib/queue/announcement.queue'

export async function schedulePrivateCampaignJob (
  campaignId: string,
  scheduledAt: Date
): Promise<void> {
  const delay = Math.max(0, scheduledAt.getTime() - Date.now())

  await announcementQueue.add(
    'private-campaign-dispatch',
    { campaignId },
    {
      jobId: `private-${campaignId}`,
      delay,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 2,
      backoff: { type: 'exponential', delay: 60_000 }
    }
  )
}

export async function cancelPrivateCampaignJob (campaignId: string): Promise<void> {
  const job = await announcementQueue.getJob(`private-${campaignId}`)
  if (job) await job.remove()
}
