'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { sectorRoleLabel } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Select } from '@/components/ui/select'

export interface TeamSectorOption {
  id: string
  name: string
}

export interface TeamMember {
  userId: string
  name: string
  email: string
  active: boolean
  role: 'SECTOR_ADMIN' | 'EMPLOYEE'
  canCreateAnnouncements: boolean
}

interface TeamManagerProps {
  sectors: TeamSectorOption[]
  currentUserId: string
  initialSectorId: string
}

interface FormState {
  name: string
  email: string
  password: string
  role: 'SECTOR_ADMIN' | 'EMPLOYEE'
  canCreateAnnouncements: boolean
}

function emptyForm (): FormState {
  return {
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    canCreateAnnouncements: false
  }
}

export function TeamManager ({
  sectors,
  currentUserId,
  initialSectorId
}: TeamManagerProps) {
  const router = useRouter()
  const [sectorId, setSectorId] = useState(initialSectorId)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedSector = sectors.find(sector => sector.id === sectorId)

  async function loadMembers (targetSectorId: string) {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/team?sectorId=${targetSectorId}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível carregar a equipe')
        setMembers([])
        return
      }

      setMembers(data.members ?? [])
    } catch {
      setError('Erro de conexão ao carregar equipe')
      setMembers([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (sectorId) {
      void loadMembers(sectorId)
    }
  }, [sectorId])

  function openCreate () {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setOpen(true)
  }

  function openEdit (member: TeamMember) {
    setEditing(member)
    setForm({
      name: member.name,
      email: member.email,
      password: '',
      role: member.role,
      canCreateAnnouncements: member.canCreateAnnouncements
    })
    setError(null)
    setOpen(true)
  }

  function closeDialog () {
    setOpen(false)
    setEditing(null)
    setForm(emptyForm())
    setError(null)
  }

  async function handleSubmit (event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (editing) {
        const response = await fetch(`/api/team/${editing.userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectorId,
            role: form.role,
            canCreateAnnouncements: form.canCreateAnnouncements
          })
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? 'Não foi possível salvar')
          return
        }
      } else {
        const response = await fetch('/api/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectorId,
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            canCreateAnnouncements: form.canCreateAnnouncements
          })
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error ?? 'Não foi possível criar o usuário')
          return
        }
      }

      closeDialog()
      await loadMembers(sectorId)
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (sectors.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-text-primary">Equipe do setor</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-text-muted">
          Você não administra nenhum setor. Peça ao Super Admin para vincular você como admin.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Equipe do setor</h1>
          <p className="mt-1 text-sm text-text-muted">
            Crie usuários já vinculados ao setor {selectedSector?.name ?? ''}.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo membro
        </Button>
      </div>

      {sectors.length > 1 && (
        <div className="max-w-xs space-y-2">
          <Label htmlFor="team-sector">Setor</Label>
          <Select
            id="team-sector"
            value={sectorId}
            onChange={event => setSectorId(event.target.value)}
          >
            {sectors.map(sector => (
              <option key={sector.id} value={sector.id}>{sector.name}</option>
            ))}
          </Select>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background/60">
            <tr>
              <th className="px-4 py-3 font-medium text-text-muted">Nome</th>
              <th className="px-4 py-3 font-medium text-text-muted">E-mail</th>
              <th className="px-4 py-3 font-medium text-text-muted">Papel</th>
              <th className="px-4 py-3 font-medium text-text-muted">Cria anúncio</th>
              <th className="px-4 py-3 font-medium text-text-muted">Status</th>
              <th className="px-4 py-3 font-medium text-text-muted">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden="true" />
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                  Nenhum membro neste setor ainda.
                </td>
              </tr>
            ) : (
              members.map(member => (
                <tr key={member.userId} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {member.name}
                    {member.userId === currentUserId && (
                      <span className="ml-2 text-xs text-text-muted">(você)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{member.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="muted">{sectorRoleLabel(member.role)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={member.canCreateAnnouncements ? 'success' : 'muted'}>
                      {member.canCreateAnnouncements ? 'Sim' : 'Não'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={member.active ? 'success' : 'muted'}>
                      {member.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(member)}>
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

      {error && !open && (
        <p className="text-sm text-danger" role="alert">{error}</p>
      )}

      <Dialog
        open={open}
        onClose={closeDialog}
        title={editing ? 'Editar membro' : 'Novo membro'}
        description={
          editing
            ? 'Altere papel e permissão de criar anúncios.'
            : `O usuário será criado e vinculado ao setor ${selectedSector?.name ?? ''}.`
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="team-name">Nome</Label>
                <Input
                  id="team-name"
                  value={form.name}
                  onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-email">E-mail</Label>
                <Input
                  id="team-email"
                  type="email"
                  value={form.email}
                  onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-password">Senha</Label>
                <Input
                  id="team-password"
                  type="password"
                  value={form.password}
                  onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
                  placeholder="Mínimo 8 caracteres"
                  required
                  minLength={8}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="team-role">Papel no setor</Label>
            <Select
              id="team-role"
              value={form.role}
              onChange={event => setForm(current => ({
                ...current,
                role: event.target.value as 'SECTOR_ADMIN' | 'EMPLOYEE',
                canCreateAnnouncements: event.target.value === 'SECTOR_ADMIN'
                  ? true
                  : current.canCreateAnnouncements
              }))}
              disabled={editing?.userId === currentUserId}
            >
              <option value="EMPLOYEE">{sectorRoleLabel('EMPLOYEE')}</option>
              <option value="SECTOR_ADMIN">{sectorRoleLabel('SECTOR_ADMIN')}</option>
            </Select>
          </div>

          {form.role === 'EMPLOYEE' && (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-text-primary">Pode criar anúncio</p>
                <p className="text-xs text-text-muted">Libera o botão de novo anúncio.</p>
              </div>
              <Switch
                id="team-can-create"
                checked={form.canCreateAnnouncements}
                onCheckedChange={checked => setForm(current => ({
                  ...current,
                  canCreateAnnouncements: checked
                }))}
              />
            </div>
          )}

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
