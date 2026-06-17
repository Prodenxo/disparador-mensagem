import path from 'path'
import {
  fetchMentionJidsForGroup,
  sendMediaWithMentions,
  sendMediaWithMentionsFromBase64,
  sendTextWithMentions
} from '@/lib/evolution'
import { resolveAnnouncementImagePath } from '@/lib/uploads'

export interface GroupDispatchInput {
  groupJid: string
  message: string
  mentionAll: boolean
  imagePath?: string | null
  image?: {
    data: string
    mime: string
  } | null
}

export async function dispatchGroupMessage (input: GroupDispatchInput): Promise<number> {
  let participants: string[] = []
  let mentionCount = 0

  if (input.mentionAll) {
    const groupMentions = await fetchMentionJidsForGroup(input.groupJid)
    participants = groupMentions.participants
    mentionCount = groupMentions.participantCount

    if (mentionCount === 0) {
      throw new Error('Grupo sem participantes para mencionar')
    }
  }

  if (input.image?.data) {
    const extension = input.image.mime.split('/')[1] || 'jpg'
    const fileName = input.imagePath
      ? path.basename(input.imagePath)
      : `image.${extension}`

    await sendMediaWithMentionsFromBase64(
      input.groupJid,
      input.image.data,
      fileName,
      input.image.mime,
      input.message,
      participants
    )
  } else if (input.imagePath) {
    const resolvedPath = await resolveAnnouncementImagePath(input.imagePath)
    await sendMediaWithMentions(
      input.groupJid,
      resolvedPath,
      input.message,
      participants
    )
  } else {
    await sendTextWithMentions(
      input.groupJid,
      input.message,
      participants
    )
  }

  return mentionCount
}
