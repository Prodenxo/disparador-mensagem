import { prisma } from '../../src/lib/prisma'
import { dispatchGroupMessage } from '../../src/lib/dispatch/send-group-message'
import { scheduleCampaignJob } from '../../src/lib/queue/campaign.queue'

export async function processCampaign (campaignId: string): Promise<void> {
  const campaign = await prisma.continuousCampaign.findUnique({
    where: { id: campaignId },
    include: {
      group: true,
      image: true
    }
  })

  if (!campaign) {
    throw new Error(`Campanha ${campaignId} não encontrada`)
  }

  if (!campaign.active) {
    return
  }

  let mentionCount = 0
  let status = 'SENT'
  let errorMessage: string | null = null

  try {
    mentionCount = await dispatchGroupMessage({
      groupJid: campaign.group.jid,
      message: campaign.message,
      mentionAll: campaign.mentionAll,
      imagePath: campaign.imagePath,
      image: campaign.image
        ? { data: campaign.image.data, mime: campaign.image.mime }
        : null
    })
  } catch (error) {
    status = 'FAILED'
    errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error(`[WORKER] Falha na campanha ${campaignId}:`, errorMessage)
  }

  const now = new Date()
  const fresh = await prisma.continuousCampaign.findUnique({
    where: { id: campaignId },
    select: { active: true, intervalMinutes: true }
  })

  const nextSendAt = fresh?.active
    ? new Date(now.getTime() + (fresh.intervalMinutes * 60 * 1000))
    : null

  await prisma.$transaction([
    prisma.continuousCampaign.update({
      where: { id: campaignId },
      data: {
        lastSentAt: now,
        nextSendAt
      }
    }),
    prisma.campaignDispatchLog.create({
      data: {
        campaignId,
        status,
        errorMessage,
        mentionCount
      }
    })
  ])

  if (fresh?.active) {
    await scheduleCampaignJob(campaignId, fresh.intervalMinutes * 60 * 1000)
  }
}
