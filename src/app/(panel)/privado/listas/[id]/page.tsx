import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { canCreateAnnouncement, isSuperAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getContactListMembersService } from '@/lib/services/contact-lists'
import { ContactListDetail } from '@/components/private-campaigns/contact-list-detail'

export default async function PrivadoListaDetailPage ({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const { id } = await params
  const result = await getContactListMembersService(session, id)

  if (!result.success || !result.data) {
    notFound()
  }

  const { list, members } = result.data

  const availableContacts = await prisma.contact.findMany({
    where: { sectorId: list.sector.id },
    select: { id: true, name: true, phone: true },
    orderBy: { name: 'asc' }
  })

  const canManage = isSuperAdmin(session)
    || canCreateAnnouncement(session, list.sector.id)

  return (
    <ContactListDetail
      listId={list.id}
      listName={list.name}
      sectorName={list.sector.name}
      members={members}
      availableContacts={availableContacts}
      canManage={canManage}
    />
  )
}
