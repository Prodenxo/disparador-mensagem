'use server'

import { revalidatePath } from 'next/cache'
import { requireSuperAdmin } from '@/lib/auth/guard'
import { createUserService, updateUserService } from '@/lib/services/users'
import type { ActionResult } from '@/lib/actions/result'
import type { SectorAssignmentInput } from '@/lib/validations/user'

export async function createUser (input: {
  name: string
  email: string
  password: string
  isSuperAdmin: boolean
  active: boolean
  sectorAssignments: SectorAssignmentInput[]
}): Promise<ActionResult<{ id: string }>> {
  await requireSuperAdmin()
  const result = await createUserService(input)
  if (result.success) {
    revalidatePath('/usuarios')
    revalidatePath('/setores')
  }
  return result
}

export async function updateUser (
  id: string,
  input: {
    name: string
    email: string
    password?: string
    isSuperAdmin: boolean
    active: boolean
    sectorAssignments: SectorAssignmentInput[]
  }
): Promise<ActionResult> {
  const session = await requireSuperAdmin()
  const result = await updateUserService(id, session.id, input)
  if (result.success) {
    revalidatePath('/usuarios')
    revalidatePath('/setores')
  }
  return result
}
