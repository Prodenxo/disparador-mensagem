import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { PanelHeader } from '@/components/layout/panel-header'
import { PanelShell } from '@/components/layout/panel-shell'

export default async function PanelLayout ({
  children
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <PanelShell user={session}>
      <PanelHeader user={session} />
      <main className="flex-1 p-6">{children}</main>
    </PanelShell>
  )
}
