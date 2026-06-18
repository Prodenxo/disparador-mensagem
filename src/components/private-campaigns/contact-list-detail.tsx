'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Trash2, UserPlus } from 'lucide-react'
import { formatPhoneDisplay } from '@/lib/phone'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

export interface ContactListDetailMember {
  id: string
  name: string
  phone: string
  notes: string | null
}

export interface ContactListDetailAvailableContact {
  id: string
  name: string
  phone: string
}

interface ContactListDetailProps {
  listId: string
  listName: string
  sectorName: string
  members: ContactListDetailMember[]
  availableContacts: ContactListDetailAvailableContact[]
  canManage: boolean
}

export function ContactListDetail ({
  listId,
  listName,
  sectorName,
  members,
  availableContacts,
  canManage
}: ContactListDetailProps) {
  const router = useRouter()
  const [contactId, setContactId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const memberIds = new Set(members.map(member => member.id))
  const addableContacts = availableContacts.filter(contact => !memberIds.has(contact.id))

  async function handleAdd (event: React.FormEvent) {
    event.preventDefault()
    if (!contactId) return

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/contact-lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', contactId })
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Erro ao adicionar')
        return
      }

      setContactId('')
      router.refresh()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemove (memberContactId: string) {
    setError(null)
    setRemovingId(memberContactId)

    try {
      const response = await fetch(`/api/contact-lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', contactId: memberContactId })
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Erro ao remover')
        return
      }

      router.refresh()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{listName}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {sectorName} · {members.length} contato(s)
          </p>
        </div>
        <Link href="/privado/listas" className="text-sm text-primary underline-offset-4 hover:underline">
          Voltar para listas
        </Link>
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      {canManage && (
        <form onSubmit={handleAdd} className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)] space-y-4 max-w-lg">
          <h2 className="font-medium text-text-primary">Adicionar contato existente</h2>
          <div className="space-y-2">
            <Label htmlFor="add-contact">Contato</Label>
            <Select id="add-contact" value={contactId} onChange={e => setContactId(e.target.value)}>
              <option value="">Selecione</option>
              {addableContacts.map(contact => (
                <option key={contact.id} value={contact.id}>
                  {contact.name} — {formatPhoneDisplay(contact.phone)}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-text-muted">
            Para importar vários de uma vez, use{' '}
            <Link href="/privado/contatos" className="text-primary underline-offset-4 hover:underline">
              Contatos → Importar CSV
            </Link>
            .
          </p>
          <Button type="submit" disabled={isSubmitting || !contactId}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Adicionar à lista
          </Button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background/60">
            <tr>
              <th className="px-4 py-3 font-medium text-text-muted">Nome</th>
              <th className="px-4 py-3 font-medium text-text-muted">Telefone</th>
              {canManage && <th className="px-4 py-3 font-medium text-text-muted">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 3 : 2} className="px-4 py-8 text-center text-text-muted">
                  Lista vazia. Importe contatos ou adicione manualmente.
                </td>
              </tr>
            ) : members.map(member => (
              <tr key={member.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 font-medium text-text-primary">{member.name}</td>
                <td className="px-4 py-3 text-text-muted">{formatPhoneDisplay(member.phone)}</td>
                {canManage && (
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(member.id)}
                      disabled={removingId === member.id}
                    >
                      {removingId === member.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />}
                      Remover
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
