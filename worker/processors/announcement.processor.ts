import { AnnouncementStatus } from '@prisma/client'
import {
  fetchMentionJidsForGroup,
  sendMediaWithMentions,
  sendTextWithMentions
} from '../../src/lib/evolution'
import { prisma } from '../../src/lib/prisma'
import { assertUploadExists } from '../../src/lib/uploads'

export async function processAnnouncement (announcementId: string): Promise<void> {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: { group: true }
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
    const { participantCount, participants } = await fetchMentionJidsForGroup(
      announcement.group.jid
    )

    if (participantCount === 0) {
      throw new Error('Grupo sem participantes para mencionar')
    }

    if (announcement.imagePath) {
      const imagePath = await assertUploadExists(announcement.imagePath)
      await sendMediaWithMentions(
        announcement.group.jid,
        imagePath,
        announcement.message,
        participants
      )
    } else {
      await sendTextWithMentions(
        announcement.group.jid,
        announcement.message,
        participants
      )
    }

    await prisma.$transaction([
      prisma.announcement.update({
        where: { id: announcementId },
        data: { status: AnnouncementStatus.SENT }
      }),
      prisma.dispatchLog.create({
        data: {
          announcementId,
          status: 'SENT',
          mentionCount: participantCount
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
