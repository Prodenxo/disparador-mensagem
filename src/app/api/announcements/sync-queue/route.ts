import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { isSuperAdmin } from '@/lib/permissions'
import { syncScheduledAnnouncementJobs } from '@/lib/queue/announcement-sync'

export async function POST () {
  const session = await getSession()

  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const result = await syncScheduledAnnouncementJobs()
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[api/announcements/sync-queue POST]', error)
    const message = error instanceof Error ? error.message : 'Erro ao sincronizar fila'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
