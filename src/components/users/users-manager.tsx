'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { sectorRoleLabel } from '@/lib/permissions'
import type { SectorAssignmentInput } from '@/lib/validations/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Select } from '@/components/ui/select'

export interface SectorOption {
  id: string
  name: string
  active: boolean
}

export interface UserSectorLinkRow {
  sectorId: string
  sectorName: string
  role: 'SECTOR_ADMIN' | 'EMPLOYEE'
  canCreateAnnouncements: boolean
}

export interface UserRow {
  id: string
  name: string
  email: string
  active: boolean
  isSuperAdmin: boolean
  sectorLinks: UserSectorLinkRow[]
}

interface UsersManagerProps {
  users: UserRow[]
  sectors: SectorOption[]
  currentUserId: string
}

interface FormState {
  name: string
  email: string
  password: string
  isSuperAdmin: boolean
  active: boolean
  sectorAssignments: SectorAssignmentInput[]
}

function emptyForm (): FormState {
  return {
    name: '',
    email: '',
    password: '',
    isSuperAdmin: false,
    active: true,
    sectorAssignments: []
  }
}

function userToForm (user: UserRow): FormState {
  return {
    name: user.name,
    email: user.email,
    password: '',
    isSuperAdmin: user.isSuperAdmin,
    active: user.active,
    sectorAssignments: user.sectorLinks.map(link => ({
      sectorId: link.sectorId,
      role: link.role,
      canCreateAnnouncements: link.canCreateAnnouncements
    }))
  }
}

export function UsersManager ({ users, sectors, currentUserId }: UsersManagerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeSectors = sectors.filter(sector => sector.active)

  function openCreate () {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setOpen(true)
  }

  function openEdit (user: UserRow) {
    setEditing(user)
    setForm(userToForm(user))
    setError(null)
    setOpen(true)
  }

  function closeDialog () {
    setOpen(false)
    setEditing(null)
    setForm(emptyForm())
    setError(null)
  }

  function addAssignment () {
    const firstSector = activeSectors[0]
    if (!firstSector) return

    setForm(current => ({
      ...current,
      sectorAssignments: [
        ...current.sectorAssignments,
        {
          sectorId: firstSector.id,
          role: 'EMPLOYEE',
          canCreateAnnouncements: false
        }
      ]
    }))
  }

  function updateAssignment (
    index: number,
    patch: Partial<SectorAssignmentInput>
  ) {
    setForm(current => ({
      ...current,
      sectorAssignments: current.sectorAssignments.map((item, i) => {
        if (i !== index) return item

        const next = { ...item, ...patch }
        if (next.role === 'SECTOR_ADMIN') {
          next.canCreateAnnouncements = true
        }

        return next
      })
    }))
  }

  function removeAssignment (index: number) {
    setForm(current => ({
      ...current,
      sectorAssignments: current.sectorAssignments.filter((_, i) => i !== index)
    }))
  }

  async function handleSubmit (event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        isSuperAdmin: form.isSuperAdmin,
        active: form.active,
        sectorAssignments: form.sectorAssignments
      }

      const url = editing ? `/api/users/${editing.id}` : '/api/users'
      const method = editing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Não foi possível salvar o usuário')
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
          <h1 className="text-2xl font-semibold text-text-primary">Usuários</h1>
          <p className="mt-1 text-sm text-text-muted">
            Gerencie contas, papéis globais e vínculos com setores.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo usuário
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-background/60">
            <tr>
              <th className="px-4 py-3 font-medium text-text-muted">Nome</th>
              <th className="px-4 py-3 font-medium text-text-muted">E-mail</th>
              <th className="px-4 py-3 font-medium text-text-muted">Papel</th>
              <th className="px-4 py-3 font-medium text-text-muted">Setores</th>
              <th className="px-4 py-3 font-medium text-text-muted">Status</th>
              <th className="px-4 py-3 font-medium text-text-muted">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-muted">
                  Nenhum usuário cadastrado ainda.
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {user.name}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-xs text-text-muted">(você)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.isSuperAdmin ? (
                      <Badge>{sectorRoleLabel('SUPER_ADMIN')}</Badge>
                    ) : (
                      <Badge variant="muted">Usuário</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.sectorLinks.length === 0 ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.sectorLinks.map(link => (
                          <Badge key={link.sectorId} variant="muted">
                            {link.sectorName}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.active ? 'success' : 'muted'}>
                      {user.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
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
        title={editing ? 'Editar usuário' : 'Novo usuário'}
        description="Defina credenciais, papel global e setores de atuação."
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nome</Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">E-mail</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-password">
              {editing ? 'Nova senha (opcional)' : 'Senha'}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={form.password}
              onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
              placeholder={editing ? 'Deixe em branco para manter' : 'Mínimo 8 caracteres'}
              required={!editing}
              minLength={editing ? undefined : 8}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-text-primary">Super Admin</p>
                <p className="text-xs text-text-muted">Acesso global ao painel.</p>
              </div>
              <Switch
                id="user-super-admin"
                checked={form.isSuperAdmin}
                onCheckedChange={checked => setForm(current => ({ ...current, isSuperAdmin: checked }))}
                disabled={editing?.id === currentUserId}
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-text-primary">Conta ativa</p>
                <p className="text-xs text-text-muted">Inativos não conseguem entrar.</p>
              </div>
              <Switch
                id="user-active"
                checked={form.active}
                onCheckedChange={checked => setForm(current => ({ ...current, active: checked }))}
                disabled={editing?.id === currentUserId}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Setores</p>
                <p className="text-xs text-text-muted">Papel por setor de atuação.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addAssignment}
                disabled={activeSectors.length === 0}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Adicionar
              </Button>
            </div>

            {activeSectors.length === 0 && (
              <p className="text-sm text-text-muted">
                Cadastre um setor ativo antes de vincular usuários.
              </p>
            )}

            {form.sectorAssignments.map((assignment, index) => (
              <div
                key={`${assignment.sectorId}-${index}`}
                className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
              >
                <Select
                  value={assignment.sectorId}
                  onChange={event => updateAssignment(index, { sectorId: event.target.value })}
                >
                  {activeSectors.map(sector => (
                    <option key={sector.id} value={sector.id}>{sector.name}</option>
                  ))}
                </Select>

                <Select
                  value={assignment.role}
                  onChange={event => updateAssignment(index, {
                    role: event.target.value as 'SECTOR_ADMIN' | 'EMPLOYEE'
                  })}
                >
                  <option value="SECTOR_ADMIN">{sectorRoleLabel('SECTOR_ADMIN')}</option>
                  <option value="EMPLOYEE">{sectorRoleLabel('EMPLOYEE')}</option>
                </Select>

                {assignment.role === 'EMPLOYEE' ? (
                  <Switch
                    id={`can-create-${index}`}
                    checked={assignment.canCreateAnnouncements}
                    onCheckedChange={checked => updateAssignment(index, { canCreateAnnouncements: checked })}
                    label="Cria anúncio"
                  />
                ) : (
                  <span className="self-center text-xs text-text-muted">Admin sempre cria</span>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAssignment(index)}
                  aria-label="Remover setor"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
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
