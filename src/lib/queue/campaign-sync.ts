import { prisma } from '@/lib/prisma'
import { cancelCampaignJob, scheduleCampaignJob } from '@/lib/queue/campaign.queue'

export async function syncActiveCampaignJobs (): Promise<{
  total: number
  enqueued: number
  skipped: number
}> {
  const campaigns = await prisma.continuousCampaign.findMany({
    where: { active: true },
    select: { id: true, nextSendAt: true, intervalMinutes: true }
  })

  let enqueued = 0
  let skipped = 0

  for (const campaign of campaigns) {
    const delayMs = campaign.nextSendAt
      ? Math.max(0, campaign.nextSendAt.getTime() - Date.now())
      : 0

    try {
      await scheduleCampaignJob(campaign.id, delayMs)
      enqueued += 1
    } catch {
      skipped += 1
    }
  }

  return {
    total: campaigns.length,
    enqueued,
    skipped
  }
}

export async function deactivateCampaignScheduling (campaignId: string): Promise<void> {
  await cancelCampaignJob(campaignId)

  await prisma.continuousCampaign.update({
    where: { id: campaignId },
    data: { nextSendAt: null }
  })
}
