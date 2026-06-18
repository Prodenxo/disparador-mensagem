import { PrivateCampaignStatus } from '@prisma/client'
import { dispatchPrivateMessage, sleep } from '../../src/lib/dispatch/send-private-message'
import { phoneToEvolutionNumber } from '../../src/lib/phone'
import { prisma } from '../../src/lib/prisma'

function maskPhone (phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 4) return digits
  return `***${digits.slice(-4)}`
}

export async function processPrivateCampaign (campaignId: string): Promise<void> {
  const campaign = await prisma.privateCampaign.findUnique({
    where: { id: campaignId },
    include: {
      list: {
        include: {
          members: {
            include: {
              contact: true
            }
          }
        }
      },
      image: true
    }
  })

  if (!campaign) {
    throw new Error(`Campanha privada ${campaignId} não encontrada`)
  }

  if (campaign.status === PrivateCampaignStatus.CANCELLED || campaign.status === PrivateCampaignStatus.SENT) {
    return
  }

  const totalMembers = campaign.list.members.length

  console.log(
    `[WORKER] Campanha privada ${campaignId}: lista "${campaign.list.name}" com ${totalMembers} contato(s)`
  )

  await prisma.privateCampaign.update({
    where: { id: campaignId },
    data: { status: PrivateCampaignStatus.PROCESSING }
  })

  const existingLogs = await prisma.privateDispatchLog.findMany({
    where: { campaignId },
    select: { contactId: true, status: true }
  })

  const sentContactIds = new Set(
    existingLogs.filter(log => log.status === 'SENT').map(log => log.contactId)
  )

  const contacts = campaign.list.members
    .map(member => member.contact)
    .filter(contact => !sentContactIds.has(contact.id))

  if (contacts.length === 0 && sentContactIds.size === 0) {
    console.error(`[WORKER] Campanha privada ${campaignId}: nenhum contato na lista`)

    await prisma.privateCampaign.update({
      where: { id: campaignId },
      data: { status: PrivateCampaignStatus.FAILED }
    })

    return
  }

  if (contacts.length === 0) {
    console.log(
      `[WORKER] Campanha privada ${campaignId}: ${sentContactIds.size} contato(s) já enviados anteriormente`
    )

    await prisma.privateCampaign.update({
      where: { id: campaignId },
      data: { status: PrivateCampaignStatus.SENT }
    })

    return
  }

  let failureCount = 0
  let successCount = 0

  for (let index = 0; index < contacts.length; index += 1) {
    const current = await prisma.privateCampaign.findUnique({
      where: { id: campaignId },
      select: { status: true }
    })

    if (!current || current.status === PrivateCampaignStatus.CANCELLED) {
      return
    }

    const contact = contacts[index]

    console.log(
      `[WORKER] Campanha privada ${campaignId}: enviando para ${contact.name} (${maskPhone(contact.phone)})`
    )

    try {
      const result = await dispatchPrivateMessage({
        phone: contact.phone,
        message: campaign.message,
        imagePath: campaign.imagePath,
        image: campaign.image
          ? { data: campaign.image.data, mime: campaign.image.mime }
          : null
      })

      successCount += 1

      console.log(
        `[WORKER] Campanha privada ${campaignId}: enviado para ${contact.name} (${result.displayPhone})`
      )

      if (result.targetNumber !== phoneToEvolutionNumber(contact.phone)) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: { phone: result.targetNumber }
        })

        console.log(
          `[WORKER] Campanha privada ${campaignId}: telefone corrigido para ${result.displayPhone}`
        )
      }

      await prisma.privateDispatchLog.upsert({
        where: {
          campaignId_contactId: {
            campaignId,
            contactId: contact.id
          }
        },
        create: {
          campaignId,
          contactId: contact.id,
          status: 'SENT'
        },
        update: {
          status: 'SENT',
          errorMessage: null,
          sentAt: new Date()
        }
      })
    } catch (error) {
      failureCount += 1
      const message = error instanceof Error ? error.message : 'Erro desconhecido'

      console.error(
        `[WORKER] Campanha privada ${campaignId}: falha para ${contact.name} (${maskPhone(contact.phone)}): ${message}`
      )

      await prisma.privateDispatchLog.upsert({
        where: {
          campaignId_contactId: {
            campaignId,
            contactId: contact.id
          }
        },
        create: {
          campaignId,
          contactId: contact.id,
          status: 'FAILED',
          errorMessage: message
        },
        update: {
          status: 'FAILED',
          errorMessage: message,
          sentAt: new Date()
        }
      })
    }

    if (index < contacts.length - 1) {
      await sleep(campaign.intervalSeconds * 1000)
    }
  }

  const totalSentBefore = sentContactIds.size
  const finalStatus = successCount === 0 && totalSentBefore === 0 && failureCount > 0
    ? PrivateCampaignStatus.FAILED
    : PrivateCampaignStatus.SENT

  await prisma.privateCampaign.update({
    where: { id: campaignId },
    data: { status: finalStatus }
  })

  console.log(
    `[WORKER] Campanha privada ${campaignId} finalizada: ${successCount} enviados, ${failureCount} falhas, status ${finalStatus}`
  )
}
