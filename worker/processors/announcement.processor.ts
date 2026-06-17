import { AnnouncementStatus } from '@prisma/client'
import { dispatchGroupMessage } from '../../src/lib/dispatch/send-group-message'
import { prisma } from '../../src/lib/prisma'

export async function processAnnouncement (announcementId: string): Promise<void> {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: {
      group: true,
      image: true
    }
  })

  if (!announcement) {
    throw new Error(`Anúncio ${announcementId} não encontrado`)
  }

  if (announcement.status === 'CANCELLED' || announcement.status === 'SENT') {
    return
  }

  await prisma.announcement.update({
    where: { id: announcementId },
    data: { status: AnnouncementStatus.PROCESSING }
  })

  try {
    const mentionCount = await dispatchGroupMessage({
      groupJid: announcement.group.jid,
      message: announcement.message,
      mentionAll: announcement.mentionAll ?? true,
      imagePath: announcement.imagePath,
      image: announcement.image
        ? { data: announcement.image.data, mime: announcement.image.mime }
        : null
    })

    await prisma.$transaction([
      prisma.announcement.update({
        where: { id: announcementId },
        data: { status: AnnouncementStatus.SENT }
      }),
      prisma.dispatchLog.create({
        data: {
          announcementId,
          status: 'SENT',
          mentionCount
        }
      })
    ])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'

    await prisma.$transaction([
      prisma.announcement.update({
        where: { id: announcementId },
        data: { status: AnnouncementStatus.FAILED }
      }),
      prisma.dispatchLog.create({
        data: {
          announcementId,
          status: 'FAILED',
          errorMessage: message
        }
      })
    ])

    throw error
  }
}
