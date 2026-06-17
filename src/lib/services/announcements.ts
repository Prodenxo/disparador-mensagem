import { fromZonedTime } from 'date-fns-tz'
import type { AnnouncementStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { actionError, actionSuccess, type ActionResult } from '@/lib/actions/result'
import {
  canCreateAnnouncement,
  isSectorAdmin,
  isSuperAdmin,
  type SessionUser
} from '@/lib/permissions'
import { cancelAnnouncementJob, scheduleAnnouncementJob } from '@/lib/queue/announcement.queue'
import { saveAnnouncementImage } from '@/lib/uploads'
import { announcementInputSchema } from '@/lib/validations/announcement'

export interface AnnouncementRow {
  id: string
  message: string
  status: AnnouncementStatus
  scheduledAt: Date
  createdAt: Date
  imagePath: string | null
  sector: { id: string; name: string }
  group: { id: string; name: string; participantCount: number }
  createdBy: { id: string; name: string }
}

function parseScheduledAt (date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, env.timezone)
}

export async function listAnnouncementsService (
  session: SessionUser
): Promise<AnnouncementRow[]> {
  const sectorFilter = isSuperAdmin(session)
    ? {}
    : { sectorId: { in: session.sectors.map(link => link.sectorId) } }

  return prisma.announcement.findMany({
    where: sectorFilter,
    orderBy: { scheduledAt: 'desc' },
    take: 100,
    select: {
      id: true,
      message: true,
      status: true,
      scheduledAt: true,
      createdAt: true,
      imagePath: true,
      sector: { select: { id: true, name: true } },
      group: { select: { id: true, name: true, participantCount: true } },
      createdBy: { select: { id: true, name: true } }
    }
  })
}

export async function createAnnouncementService (
  session: SessionUser,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const parsed = announcementInputSchema.safeParse({
    sectorId: String(formData.get('sectorId') ?? ''),
    groupId: String(formData.get('groupId') ?? ''),
    message: String(formData.get('message') ?? '').trim(),
    scheduledDate: String(formData.get('scheduledDate') ?? ''),
    scheduledTime: String(formData.get('scheduledTime') ?? '')
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  if (!canCreateAnnouncement(session, parsed.data.sectorId)) {
    return actionError('Sem permissão para criar anúncio neste setor')
  }

  const scheduledAt = parseScheduledAt(parsed.data.scheduledDate, parsed.data.scheduledTime)
  const minSchedule = new Date(Date.now() + 60_000)

  if (scheduledAt < minSchedule) {
    return actionError('Agende com pelo menos 1 minuto de antecedência')
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
  const imageFile = formData.get('image')

  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      imagePath = await saveAnnouncementImage(imageFile)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar imagem'
      return actionError(message)
    }
  }

  try {
    const announcement = await prisma.announcement.create({
      data: {
        sectorId: parsed.data.sectorId,
        groupId: parsed.data.groupId,
        message: parsed.data.message,
        imagePath,
        scheduledAt,
        status: 'SCHEDULED',
        createdById: session.id
      }
    })

    await scheduleAnnouncementJob(announcement.id, scheduledAt)

    return actionSuccess({ id: announcement.id })
  } catch (error) {
    console.error('[createAnnouncementService]', error)
    return actionError('Não foi possível agendar o anúncio')
  }
}

export async function cancelAnnouncementService (
  session: SessionUser,
  announcementId: string
): Promise<ActionResult<void>> {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: {
      sector: { select: { id: true } }
    }
  })

  if (!announcement) {
    return actionError('Anúncio não encontrado')
  }

  const canCancel = isSuperAdmin(session)
    || isSectorAdmin(session, announcement.sectorId)
    || announcement.createdById === session.id

  if (!canCancel) {
    return actionError('Sem permissão para cancelar este anúncio')
  }

  if (announcement.status !== 'SCHEDULED') {
    return actionError('Só é possível cancelar anúncios agendados')
  }

  try {
    await cancelAnnouncementJob(announcementId)

    await prisma.announcement.update({
      where: { id: announcementId },
      data: { status: 'CANCELLED' }
    })

    return actionSuccess()
  } catch (error) {
    console.error('[cancelAnnouncementService]', error)
    return actionError('Não foi possível cancelar o anúncio')
  }
}
