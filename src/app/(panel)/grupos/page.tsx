import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { isSuperAdmin } from '@/lib/permissions'
import { listGroupsService } from '@/lib/services/groups'
import { GroupsManager } from '@/components/groups/groups-manager'

export default async function GruposPage () {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const groups = await listGroupsService()
  const canSync = isSuperAdmin(session) || session.sectors.some(link => link.role === 'SECTOR_ADMIN')

  return (
    <GroupsManager
      canSync={canSync}
      initialGroups={groups.map(group => ({
        ...group,
        syncedAt: group.syncedAt.toISOString()
      }))}
    />
  )
}
