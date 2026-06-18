import type { AnnouncementStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'

const statusConfig: Record<AnnouncementStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'muted' }> = {
  DRAFT: { label: 'Rascunho', variant: 'muted' },
  SCHEDULED: { label: 'Agendado', variant: 'warning' },
  PROCESSING: { label: 'Enviando', variant: 'default' },
  SENT: { label: 'Concluído', variant: 'success' },
  FAILED: { label: 'Falhou', variant: 'danger' },
  CANCELLED: { label: 'Cancelado', variant: 'muted' }
}

export function AnnouncementStatusBadge ({ status }: { status: AnnouncementStatus }) {
  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function announcementStatusLabel (status: AnnouncementStatus): string {
  return statusConfig[status].label
}
