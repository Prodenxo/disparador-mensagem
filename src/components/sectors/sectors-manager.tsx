'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { slugify } from '@/lib/slug'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'

export interface SectorRow {
  id: string
  name: string
  slug: string
  active: boolean
  memberCount: number
}

interface SectorsManagerProps {
  sectors: SectorRow[]
}

interface FormState {
  name: string
  slug: string
  active: boolean
}

const emptyForm: FormState = { name: '', slug: '', active: true }

export function SectorsManager ({ sectors }: SectorsManagerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SectorRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function openCreate () {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setOpen(true)
  }

  function openEdit (sector: SectorRow) {
    setEditing(sector)
    setForm({ name: sector.name, slug: sector.slug, active: sector.active })
    setError(null)
    setOpen(true)
  }

  function closeDialog () {
    setOpen(false)
    setEditing(null)
    setForm(emptyForm)
    setError(null)
  }

  function handleNameChange (name: string) {
    setForm(current => ({
      ...current,
      name,
      slug: editing ? current.slug : slugify(name)
    }))
  }

  async function handleSubmit (event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        active: form.active
      }

      const url = editing ? `/api/sectors/${editing.id}` : '/api/sectors'
      const method = editing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível salvar o setor')
        return
      }

      closeDialog()
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Setores</h1>
          <p className="mt-1 text-sm text-text-muted">
            Organize comunicados por área da empresa.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo setor
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background/60">
            <tr>
              <th className="px-4 py-3 font-medium text-text-muted">Nome</th>
              <th className="px-4 py-3 font-medium text-text-muted">Slug</th>
              <th className="px-4 py-3 font-medium text-text-muted">Membros</th>
              <th className="px-4 py-3 font-medium text-text-muted">Status</th>
              <th className="px-4 py-3 font-medium text-text-muted">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sectors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  Nenhum setor cadastrado ainda.
                </td>
              </tr>
            ) : (
              sectors.map(sector => (
                <tr key={sector.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium text-text-primary">{sector.name}</td>
                  <td className="px-4 py-3 text-text-muted">{sector.slug}</td>
                  <td className="px-4 py-3 text-text-muted">{sector.memberCount}</td>
                  <td className="px-4 py-3">
                    <Badge variant={sector.active ? 'success' : 'muted'}>
                      {sector.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(sector)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Editar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={open}
        onClose={closeDialog}
        title={editing ? 'Editar setor' : 'Novo setor'}
        description="Nome visível no painel e slug usado internamente."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sector-name">Nome</Label>
            <Input
              id="sector-name"
              value={form.name}
              onChange={event => handleNameChange(event.target.value)}
              placeholder="Ex: Marketing"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sector-slug">Slug</Label>
            <Input
              id="sector-slug"
              value={form.slug}
              onChange={event => setForm(current => ({ ...current, slug: slugify(event.target.value) }))}
              placeholder="marketing"
              required
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium text-text-primary">Setor ativo</p>
              <p className="text-xs text-text-muted">Inativos não aparecem em novos anúncios.</p>
            </div>
            <Switch
              id="sector-active"
              checked={form.active}
              onCheckedChange={checked => setForm(current => ({ ...current, active: checked }))}
            />
          </div>

          {error && (
            <p className="text-sm text-danger" role="alert">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
