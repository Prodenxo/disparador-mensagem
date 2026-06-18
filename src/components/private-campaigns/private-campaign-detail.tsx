'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatPhoneDisplay } from '@/lib/phone'
import { AnnouncementStatusBadge } from '@/components/announcements/announcement-status-badge'
import type { AnnouncementStatus } from '@prisma/client'

export interface PrivateCampaignLogItem {
  status: string
  errorMessage: string | null
  sentAt: string
  contact: {
    id: string
    name: string
    phone: string
  }
}

interface PrivateCampaignDetailProps {
  campaign: {
    id: string
    name: string
    status: AnnouncementStatus
    memberCount: number
    sentCount: number
    failedCount: number
  }
  logs: PrivateCampaignLogItem[]
}

export function PrivateCampaignDetail ({ campaign, logs }: PrivateCampaignDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{campaign.name}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {campaign.sentCount} enviados · {campaign.failedCount} falhas · {campaign.memberCount} na lista
          </p>
        </div>
        <Link href="/privado" className="text-sm text-primary underline-offset-4 hover:underline">
          Voltar para campanhas
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-text-muted">Status:</span>
        <AnnouncementStatusBadge status={campaign.status} />
      </div>

      {campaign.memberCount === 0 && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          A lista estava vazia no momento do disparo. Adicione contatos à lista e crie uma nova campanha.
        </p>
      )}

      {campaign.sentCount === 0 && campaign.failedCount === 0 && campaign.memberCount > 0 && (
        <p className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          Nenhum envio registrado. Verifique se o worker estava ativo e se a lista tinha contatos no horário agendado.
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background/60">
            <tr>
              <th className="px-4 py-3 font-medium text-text-muted">Contato</th>
              <th className="px-4 py-3 font-medium text-text-muted">Telefone</th>
              <th className="px-4 py-3 font-medium text-text-muted">Resultado</th>
              <th className="px-4 py-3 font-medium text-text-muted">Horário</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                  Nenhum registro de envio. A campanha pode ter rodado com lista vazia.
                </td>
              </tr>
            ) : logs.map(log => (
              <tr key={`${log.contact.id}-${log.sentAt}`} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 font-medium text-text-primary">{log.contact.name}</td>
                <td className="px-4 py-3 text-text-muted">{formatPhoneDisplay(log.contact.phone)}</td>
                <td className="px-4 py-3">
                  {log.status === 'SENT' ? (
                    <span className="text-success">Enviado</span>
                  ) : (
                    <span className="text-danger" title={log.errorMessage ?? undefined}>
                      Falhou{log.errorMessage ? `: ${log.errorMessage}` : ''}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                  {format(new Date(log.sentAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
