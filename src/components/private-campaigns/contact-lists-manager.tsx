'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

export interface ContactListSectorOption {
  id: string
  name: string
}

export interface ContactListItemRow {
  id: string
  name: string
  sectorName: string
  memberCount: number
}

interface ContactListsManagerProps {
  lists: ContactListItemRow[]
  sectors: ContactListSectorOption[]
  canCreate: boolean
}

export function ContactListsManager ({
  lists,
  sectors,
  canCreate
}: ContactListsManagerProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [sectorId, setSectorId] = useState(sectors[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate (event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData()
    formData.set('name', name)
    formData.set('sectorId', sectorId)

    try {
      const response = await fetch('/api/contact-lists', { method: 'POST', body: formData })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Erro ao criar lista')
        return
      }

      setName('')
      router.push(`/privado/listas/${data.data.id}`)
      router.refresh()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete (id: string) {
    setError(null)
    setDeletingId(id)

    try {
      const response = await fetch(`/api/contact-lists/${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Erro ao excluir')
        return
      }

      router.refresh()
    } catch {
      setError('Erro de conexão.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Listas</h1>
          <p className="mt-1 text-sm text-text-muted">
            Agrupe contatos em ondas — ex.: Onda 1, Onda 2 pós-evento.
          </p>
        </div>
        <Link href="/privado" className="text-sm text-primary underline-offset-4 hover:underline">
          Voltar para campanhas
        </Link>
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      {canCreate && (
        <form onSubmit={handleCreate} className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-card)] space-y-4 max-w-lg">
          <h2 className="font-medium text-text-primary">Nova lista</h2>
          <div className="space-y-2">
            <Label htmlFor="list-name">Nome</Label>
            <Input id="list-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Almoço Jun — Onda 1" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="list-sector">Setor</Label>
            <Select id="list-sector" value={sectorId} onChange={e => setSectorId(e.target.value)}>
              {sectors.map(sector => (
                <option key={sector.id} value={sector.id}>{sector.name}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar lista
          </Button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background/60">
            <tr>
              <th className="px-4 py-3 font-medium text-text-muted">Lista</th>
              <th className="px-4 py-3 font-medium text-text-muted">Setor</th>
              <th className="px-4 py-3 font-medium text-text-muted">Contatos</th>
              <th className="px-4 py-3 font-medium text-text-muted">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lists.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-text-muted">Nenhuma lista criada.</td>
              </tr>
            ) : lists.map(list => (
              <tr key={list.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 font-medium text-text-primary">{list.name}</td>
                <td className="px-4 py-3 text-text-muted">{list.sectorName}</td>
                <td className="px-4 py-3 text-text-muted">{list.memberCount}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/privado/listas/${list.id}`}
                      className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-text-primary hover:bg-background"
                    >
                      Gerenciar
                    </Link>
                    {canCreate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(list.id)}
                        disabled={deletingId === list.id}
                      >
                        {deletingId === list.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                        Excluir
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
