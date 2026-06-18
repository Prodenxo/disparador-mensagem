import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { PrivateCampaignStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { actionError, actionSuccess, type ActionResult } from '@/lib/actions/result'
import {
  canCreateAnnouncement,
  isSuperAdmin,
  type SessionUser
} from '@/lib/permissions'
import {
  cancelPrivateCampaignJob,
  schedulePrivateCampaignJob
} from '@/lib/queue/private-campaign.queue'
import { saveAnnouncementImageData } from '@/lib/uploads'
import { privateCampaignInputSchema } from '@/lib/validations/private-campaign'

export interface PrivateCampaignRow {
  id: string
  name: string
  message: string
  status: PrivateCampaignStatus
  scheduledAt: Date
  intervalSeconds: number
  createdAt: Date
  imagePath: string | null
  imageId: string | null
  sector: { id: string; name: string }
  list: { id: string; name: string; memberCount: number }
  createdBy: { id: string; name: string }
  sentCount: number
  failedCount: number
}

function sectorFilter (session: SessionUser) {
  return isSuperAdmin(session)
    ? {}
    : { sectorId: { in: session.sectors.map(link => link.sectorId) } }
}

function parseScheduledAt (date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, env.timezone)
}

async function saveOptionalImage (formData: FormData): Promise<{
  imagePath: string | null
  imageId: string | null
}> {
  const imageFile = formData.get('image')

  if (!(imageFile instanceof File) || imageFile.size === 0) {
    return { imagePath: null, imageId: null }
  }

  const saved = await saveAnnouncementImageData(imageFile)
  const storedImage = await prisma.announcementImage.create({
    data: {
      mime: saved.mime,
      data: saved.base64
    }
  })

  return {
    imagePath: saved.path,
    imageId: storedImage.id
  }
}

export async function listPrivateCampaignsService (
  session: SessionUser
): Promise<PrivateCampaignRow[]> {
  const campaigns = await prisma.privateCampaign.findMany({
    where: sectorFilter(session),
    orderBy: { scheduledAt: 'desc' },
    take: 200,
    select: {
      id: true,
      name: true,
      message: true,
      status: true,
      scheduledAt: true,
      intervalSeconds: true,
      createdAt: true,
      imagePath: true,
      imageId: true,
      sector: { select: { id: true, name: true } },
      list: {
        select: {
          id: true,
          name: true,
          _count: { select: { members: true } }
        }
      },
      createdBy: { select: { id: true, name: true } },
      logs: { select: { status: true } }
    }
  })

  return campaigns.map(campaign => ({
    id: campaign.id,
    name: campaign.name,
    message: campaign.message,
    status: campaign.status,
    scheduledAt: campaign.scheduledAt,
    intervalSeconds: campaign.intervalSeconds,
    createdAt: campaign.createdAt,
    imagePath: campaign.imagePath,
    imageId: campaign.imageId,
    sector: campaign.sector,
    list: {
      id: campaign.list.id,
      name: campaign.list.name,
      memberCount: campaign.list._count.members
    },
    createdBy: campaign.createdBy,
    sentCount: campaign.logs.filter(log => log.status === 'SENT').length,
    failedCount: campaign.logs.filter(log => log.status === 'FAILED').length
  }))
}

export async function createPrivateCampaignService (
  session: SessionUser,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = privateCampaignInputSchema.safeParse({
    name: String(formData.get('name') ?? '').trim(),
    sectorId: String(formData.get('sectorId') ?? ''),
    listId: String(formData.get('listId') ?? ''),
    message: String(formData.get('message') ?? '').trim(),
    scheduleDate: String(formData.get('scheduleDate') ?? ''),
    scheduleTime: String(formData.get('scheduleTime') ?? ''),
    intervalSeconds: formData.get('intervalSeconds') ?? 45
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  if (!canCreateAnnouncement(session, parsed.data.sectorId)) {
    return actionError('Sem permissão neste setor')
  }

  const list = await prisma.contactList.findFirst({
    where: {
      id: parsed.data.listId,
      sectorId: parsed.data.sectorId
    },
    include: {
      _count: { select: { members: true } }
    }
  })

  if (!list) {
    return actionError('Lista inválida para este setor')
  }

  if (list._count.members === 0) {
    return actionError('A lista selecionada não tem contatos')
  }

  if (list._count.members > 100) {
    return actionError('Limite de 100 contatos por campanha no MVP')
  }

  let imagePath: string | null = null
  let imageId: string | null = null

  try {
    const saved = await saveOptionalImage(formData)
    imagePath = saved.imagePath
    imageId = saved.imageId
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar imagem'
    return actionError(message)
  }

  const scheduledAt = parseScheduledAt(parsed.data.scheduleDate, parsed.data.scheduleTime)

  const campaign = await prisma.privateCampaign.create({
    data: {
      name: parsed.data.name,
      sectorId: parsed.data.sectorId,
      listId: parsed.data.listId,
      message: parsed.data.message,
      imagePath,
      imageId,
      scheduledAt,
      intervalSeconds: parsed.data.intervalSeconds,
      createdById: session.id
    }
  })

  try {
    await schedulePrivateCampaignJob(campaign.id, scheduledAt)
  } catch {
    await prisma.privateCampaign.delete({ where: { id: campaign.id } })
    return actionError('Não foi possível enfileirar a campanha. Verifique Redis e o worker.')
  }

  return actionSuccess({ id: campaign.id })
}

export async function cancelPrivateCampaignService (
  session: SessionUser,
  campaignId: string
): Promise<ActionResult<null>> {
  const campaign = await prisma.privateCampaign.findUnique({
    where: { id: campaignId },
    select: { sectorId: true, status: true }
  })

  if (!campaign) {
    return actionError('Campanha não encontrada')
  }

  if (!canCreateAnnouncement(session, campaign.sectorId)) {
    return actionError('Sem permissão')
  }

  if (campaign.status !== 'SCHEDULED') {
    return actionError('Só é possível cancelar campanhas agendadas')
  }

  await cancelPrivateCampaignJob(campaignId)

  await prisma.privateCampaign.update({
    where: { id: campaignId },
    data: { status: 'CANCELLED' }
  })

  return actionSuccess(null)
}

export async function getPrivateCampaignLogsService (
  session: SessionUser,
  campaignId: string
) {
  const campaign = await prisma.privateCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      sectorId: true,
      logs: {
        orderBy: { sentAt: 'desc' },
        select: {
          status: true,
          errorMessage: true,
          sentAt: true,
          contact: {
            select: { id: true, name: true, phone: true }
          }
        }
      }
    }
  })

  if (!campaign) return null

  const allowed = isSuperAdmin(session)
    || session.sectors.some(link => link.sectorId === campaign.sectorId)

  if (!allowed) return null

  return campaign
}

export function formatScheduleLabel (date: Date): string {
  return formatInTimeZone(date, env.timezone, 'dd/MM/yyyy HH:mm')
}

export async function reconcilePrivateCampaignStatuses (): Promise<number> {
  const updated = await prisma.privateCampaign.updateMany({
    where: {
      status: 'SENT',
      logs: { none: {} }
    },
    data: { status: 'FAILED' }
  })

  return updated.count
}
