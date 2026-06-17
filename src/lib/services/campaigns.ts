import { prisma } from '@/lib/prisma'
import { actionError, actionSuccess, type ActionResult } from '@/lib/actions/result'
import {
  canCreateAnnouncement,
  isSectorAdmin,
  isSuperAdmin,
  type SessionUser
} from '@/lib/permissions'
import {
  activateCampaignJob,
  scheduleCampaignJob
} from '@/lib/queue/campaign.queue'
import { deactivateCampaignScheduling } from '@/lib/queue/campaign-sync'
import { saveAnnouncementImageData } from '@/lib/uploads'
import {
  campaignInputSchema,
  formatIntervalLabel,
  intervalToMinutes,
  parseBooleanField,
  parseRemoveImageField
} from '@/lib/validations/campaign'

const MAX_INTERVAL_MINUTES = 60 * 24 * 7

export interface CampaignRow {
  id: string
  name: string
  message: string
  active: boolean
  mentionAll: boolean
  intervalMinutes: number
  lastSentAt: Date | null
  nextSendAt: Date | null
  createdAt: Date
  imagePath: string | null
  imageId: string | null
  sector: { id: string; name: string }
  group: { id: string; name: string; participantCount: number }
  createdBy: { id: string; name: string }
}

function formatQueueError (error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('NOAUTH') || message.includes('Authentication required')) {
    return 'Redis exige senha. Configure REDIS_URL no web e no worker.'
  }

  if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
    return 'Não foi possível conectar ao Redis. Verifique REDIS_URL no web e no worker.'
  }

  return 'Não foi possível atualizar a fila da campanha. Verifique Redis e o worker.'
}

function canManageCampaign (
  session: SessionUser,
  campaign: { sectorId: string; createdById: string }
): boolean {
  return isSuperAdmin(session)
    || isSectorAdmin(session, campaign.sectorId)
    || campaign.createdById === session.id
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

function parseCampaignForm (formData: FormData) {
  return campaignInputSchema.safeParse({
    name: String(formData.get('name') ?? '').trim(),
    sectorId: String(formData.get('sectorId') ?? ''),
    groupId: String(formData.get('groupId') ?? ''),
    message: String(formData.get('message') ?? '').trim(),
    mentionAll: parseBooleanField(formData.get('mentionAll')),
    intervalValue: formData.get('intervalValue') ?? 1,
    intervalUnit: String(formData.get('intervalUnit') ?? 'hours')
  })
}

export async function listCampaignsService (session: SessionUser): Promise<CampaignRow[]> {
  const sectorFilter = isSuperAdmin(session)
    ? {}
    : { sectorId: { in: session.sectors.map(link => link.sectorId) } }

  return prisma.continuousCampaign.findMany({
    where: sectorFilter,
    orderBy: { updatedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      name: true,
      message: true,
      active: true,
      mentionAll: true,
      intervalMinutes: true,
      lastSentAt: true,
      nextSendAt: true,
      createdAt: true,
      imagePath: true,
      imageId: true,
      sector: { select: { id: true, name: true } },
      group: { select: { id: true, name: true, participantCount: true } },
      createdBy: { select: { id: true, name: true } }
    }
  })
}

export async function getCampaignService (
  session: SessionUser,
  campaignId: string
): Promise<CampaignRow | null> {
  const campaign = await prisma.continuousCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      message: true,
      active: true,
      mentionAll: true,
      intervalMinutes: true,
      lastSentAt: true,
      nextSendAt: true,
      createdAt: true,
      imagePath: true,
      imageId: true,
      sectorId: true,
      createdById: true,
      sector: { select: { id: true, name: true } },
      group: { select: { id: true, name: true, participantCount: true } },
      createdBy: { select: { id: true, name: true } }
    }
  })

  if (!campaign) return null

  const sectorFilter = isSuperAdmin(session)
    || session.sectors.some(link => link.sectorId === campaign.sectorId)

  if (!sectorFilter) return null

  const { sectorId, createdById, ...row } = campaign
  void sectorId
  void createdById

  return row
}

export async function createCampaignService (
  session: SessionUser,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = parseCampaignForm(formData)

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  if (!canCreateAnnouncement(session, parsed.data.sectorId)) {
    return actionError('Sem permissão para criar campanha neste setor')
  }

  const intervalMinutes = intervalToMinutes(
    parsed.data.intervalValue,
    parsed.data.intervalUnit
  )

  if (intervalMinutes > MAX_INTERVAL_MINUTES) {
    return actionError(`Intervalo máximo: ${formatIntervalLabel(MAX_INTERVAL_MINUTES)}`)
  }

  const [sector, group] = await Promise.all([
    prisma.sector.findFirst({
      where: { id: parsed.data.sectorId, active: true }
    }),
    prisma.whatsappGroup.findUnique({
      where: { id: parsed.data.groupId }
    })
  ])

  if (!sector) {
    return actionError('Setor não encontrado ou inativo')
  }

  if (!group) {
    return actionError('Grupo não encontrado. Sincronize os grupos primeiro.')
  }

  let imagePath: string | null = null
  let imageId: string | null = null

  try {
    const savedImage = await saveOptionalImage(formData)
    imagePath = savedImage.imagePath
    imageId = savedImage.imageId
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar imagem'
    return actionError(message)
  }

  const startActive = parseBooleanField(formData.get('active'))

  try {
    const campaign = await prisma.continuousCampaign.create({
      data: {
        name: parsed.data.name,
        sectorId: parsed.data.sectorId,
        groupId: parsed.data.groupId,
        message: parsed.data.message,
        imagePath,
        imageId,
        mentionAll: parsed.data.mentionAll,
        active: startActive,
        intervalMinutes,
        nextSendAt: startActive ? new Date() : null,
        createdById: session.id
      }
    })

    if (startActive) {
      await activateCampaignJob(campaign.id)
    }

    return actionSuccess({ id: campaign.id })
  } catch (error) {
    console.error('[createCampaignService]', error)
    return actionError('Não foi possível criar a campanha')
  }
}

export async function updateCampaignService (
  session: SessionUser,
  campaignId: string,
  formData: FormData
): Promise<ActionResult<void>> {
  const existing = await prisma.continuousCampaign.findUnique({
    where: { id: campaignId }
  })

  if (!existing) {
    return actionError('Campanha não encontrada')
  }

  if (!canManageCampaign(session, existing)) {
    return actionError('Sem permissão para editar esta campanha')
  }

  const parsed = parseCampaignForm(formData)

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  if (!canCreateAnnouncement(session, parsed.data.sectorId)) {
    return actionError('Sem permissão para usar este setor')
  }

  const intervalMinutes = intervalToMinutes(
    parsed.data.intervalValue,
    parsed.data.intervalUnit
  )

  if (intervalMinutes > MAX_INTERVAL_MINUTES) {
    return actionError(`Intervalo máximo: ${formatIntervalLabel(MAX_INTERVAL_MINUTES)}`)
  }

  const [sector, group] = await Promise.all([
    prisma.sector.findFirst({
      where: { id: parsed.data.sectorId, active: true }
    }),
    prisma.whatsappGroup.findUnique({
      where: { id: parsed.data.groupId }
    })
  ])

  if (!sector) {
    return actionError('Setor não encontrado ou inativo')
  }

  if (!group) {
    return actionError('Grupo não encontrado. Sincronize os grupos primeiro.')
  }

  let imagePath = existing.imagePath
  let imageId = existing.imageId

  if (parseRemoveImageField(formData.get('removeImage'))) {
    imagePath = null
    imageId = null
  }

  try {
    const savedImage = await saveOptionalImage(formData)

    if (savedImage.imageId) {
      imagePath = savedImage.imagePath
      imageId = savedImage.imageId
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao salvar imagem'
    return actionError(message)
  }

  try {
    const nextActive = parseBooleanField(formData.get('active'))

    await prisma.continuousCampaign.update({
      where: { id: campaignId },
      data: {
        name: parsed.data.name,
        sectorId: parsed.data.sectorId,
        groupId: parsed.data.groupId,
        message: parsed.data.message,
        imagePath,
        imageId,
        mentionAll: parsed.data.mentionAll,
        intervalMinutes,
        active: nextActive,
        nextSendAt: nextActive
          ? existing.nextSendAt ?? new Date()
          : null
      }
    })

    if (nextActive && !existing.active) {
      await activateCampaignJob(campaignId)
    } else if (!nextActive && existing.active) {
      await deactivateCampaignScheduling(campaignId)
    } else if (nextActive) {
      await scheduleCampaignJob(campaignId, intervalMinutes * 60 * 1000)
    }

    return actionSuccess()
  } catch (error) {
    console.error('[updateCampaignService]', error)
    return actionError('Não foi possível salvar a campanha')
  }
}

export async function toggleCampaignService (
  session: SessionUser,
  campaignId: string,
  active: boolean
): Promise<ActionResult<void>> {
  const campaign = await prisma.continuousCampaign.findUnique({
    where: { id: campaignId }
  })

  if (!campaign) {
    return actionError('Campanha não encontrada')
  }

  if (!canManageCampaign(session, campaign)) {
    return actionError('Sem permissão para alterar esta campanha')
  }

  try {
    if (active) {
      await prisma.continuousCampaign.update({
        where: { id: campaignId },
        data: {
          active: true,
          nextSendAt: new Date()
        }
      })

      await activateCampaignJob(campaignId)
      return actionSuccess()
    }

    await prisma.continuousCampaign.update({
      where: { id: campaignId },
      data: { active: false }
    })

    await deactivateCampaignScheduling(campaignId)
    return actionSuccess()
  } catch (error) {
    console.error('[toggleCampaignService]', error)
    return actionError(formatQueueError(error))
  }
}

export { formatIntervalLabel, intervalToMinutes }
