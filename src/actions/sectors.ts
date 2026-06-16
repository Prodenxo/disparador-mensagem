'use server'

import { revalidatePath } from 'next/cache'
import { requireSuperAdmin } from '@/lib/auth/guard'
import { createSectorService, updateSectorService } from '@/lib/services/sectors'
import type { ActionResult } from '@/lib/actions/result'

export async function createSector (input: {
  name: string
  slug?: string
  active: boolean
}): Promise<ActionResult<{ id: string }>> {
  await requireSuperAdmin()
  const result = await createSectorService(input)
  if (result.success) {
    revalidatePath('/setores')
    revalidatePath('/usuarios')
  }
  return result
}

export async function updateSector (
  id: string,
  input: { name: string; slug?: string; active: boolean }
): Promise<ActionResult> {
  await requireSuperAdmin()
  const result = await updateSectorService(id, input)
  if (result.success) {
    revalidatePath('/setores')
    revalidatePath('/usuarios')
  }
  return result
}
