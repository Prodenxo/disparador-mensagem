import { announcementQueue } from '@/lib/queue/announcement.queue'

export function campaignJobId (campaignId: string): string {
  return `campaign-${campaignId}`
}

export async function scheduleCampaignJob (
  campaignId: string,
  delayMs: number
): Promise<void> {
  const jobId = campaignJobId(campaignId)
  const existing = await announcementQueue.getJob(jobId)

  if (existing) {
    await existing.remove()
  }

  await announcementQueue.add(
    'campaign-dispatch',
    { campaignId },
    {
      jobId,
      delay: Math.max(0, delayMs),
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 30_000 }
    }
  )
}

export async function cancelCampaignJob (campaignId: string): Promise<void> {
  const job = await announcementQueue.getJob(campaignJobId(campaignId))
  if (job) await job.remove()
}

export async function activateCampaignJob (campaignId: string): Promise<void> {
  await scheduleCampaignJob(campaignId, 0)
}
