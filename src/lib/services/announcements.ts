import { randomUUID } from 'crypto'
import { addDays } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
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
import {
  announcementInputSchema,
  parseRecurrenceTimes
} from '@/lib/validations/announcement'

export interface AnnouncementRow {
  id: string
  message: string
  status: AnnouncementStatus
  scheduledAt: Date
  createdAt: Date
  imagePath: string | null
  seriesId: string | null
  sector: { id: string; name: string }
  group: { id: string; name: string; participantCount: number }
  createdBy: { id: string; name: string }
}

const MAX_SCHEDULED_SLOTS = 200

function parseScheduledAt (date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, env.timezone)
}

function buildScheduleSlots (
  startDate: string,
  times: string[],
  days: number
): Date[] {
  const slots: Date[] = []

  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const date = addDays(fromZonedTime(`${startDate}T12:00:00`, env.timezone), dayOffset)
    const dateLabel = formatInTimeZone(date, env.timezone, 'yyyy-MM-dd')

    for (const time of times) {
      slots.push(parseScheduledAt(dateLabel, time))
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime())
}

function formatQueueError (error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('NOAUTH') || message.includes('Authentication required')) {
    return 'Redis exige senha. Configure REDIS_URL com usuário/senha no web e no worker.'
  }

  if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
    return 'Não foi possível conectar ao Redis. Verifique REDIS_URL no web e no worker.'
  }

  return 'Não foi possível enfileirar o anúncio. Verifique Redis e o worker.'
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
    take: 200,
    select: {
      id: true,
      message: true,
      status: true,
      scheduledAt: true,
      createdAt: true,
      imagePath: true,
      seriesId: true,
      sector: { select: { id: true, name: true } },
      group: { select: { id: true, name: true, participantCount: true } },
      createdBy: { select: { id: true, name: true } }
    }
  })
}

export async function createAnnouncementService (
  session: SessionUser,
  formData: FormData
): Promise<ActionResult<{ id: string; seriesId: string | null; count: number }>> {
  const recurrenceTimes = parseRecurrenceTimes(String(formData.get('recurrenceTimes') ?? '[]'))

  const parsed = announcementInputSchema.safeParse({
    sectorId: String(formData.get('sectorId') ?? ''),
    groupId: String(formData.get('groupId') ?? ''),
    message: String(formData.get('message') ?? '').trim(),
    scheduledDate: String(formData.get('scheduledDate') ?? ''),
    recurrenceDays: formData.get('recurrenceDays') ?? 1,
    recurrenceTimes
  })

  if (!parsed.success) {
    return actionError(parsed.error.errors[0]?.message ?? 'Dados inválidos')
  }

  if (!canCreateAnnouncement(session, parsed.data.sectorId)) {
    return actionError('Sem permissão para criar anúncio neste setor')
  }

  const slots = buildScheduleSlots(
    parsed.data.scheduledDate,
    parsed.data.recurrenceTimes,
    parsed.data.recurrenceDays
  )

  if (slots.length > MAX_SCHEDULED_SLOTS) {
    return actionError(`Limite de ${MAX_SCHEDULED_SLOTS} disparos por agendamento`)
  }

  const minSchedule = new Date(Date.now() + 60_000)
  const futureSlots = slots.filter(slot => slot >= minSchedule)

  if (futureSlots.length === 0) {
    return actionError('Nenhum horário futuro válido. Agende com pelo menos 1 minuto de antecedência.')
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

  const seriesId = futureSlots.length > 1 ? randomUUID() : null
  const createdIds: string[] = []

  try {
    for (const scheduledAt of futureSlots) {
      const announcement = await prisma.announcement.create({
        data: {
          sectorId: parsed.data.sectorId,
          groupId: parsed.data.groupId,
          message: parsed.data.message,
          imagePath,
          scheduledAt,
          status: 'SCHEDULED',
          seriesId,
          createdById: session.id
        }
      })

      createdIds.push(announcement.id)

      try {
        await scheduleAnnouncementJob(announcement.id, scheduledAt)
      } catch (queueError) {
        await prisma.announcement.updateMany({
          where: { id: { in: createdIds } },
          data: { status: 'CANCELLED' }
        })

        for (const id of createdIds) {
          await cancelAnnouncementJob(id).catch(() => undefined)
        }

        console.error('[createAnnouncementService] queue', queueError)
        return actionError(formatQueueError(queueError))
      }
    }

    return actionSuccess({
      id: createdIds[0],
      seriesId,
      count: createdIds.length
    })
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
    return actionError(formatQueueError(error))
  }
}
