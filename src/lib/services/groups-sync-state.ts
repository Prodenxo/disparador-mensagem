export type GroupsSyncStatus = 'idle' | 'running' | 'success' | 'error'

export interface GroupsSyncState {
  status: GroupsSyncStatus
  startedAt: string | null
  finishedAt: string | null
  count: number | null
  removed: number | null
  skipped: number | null
  error: string | null
}

const idleState = (): GroupsSyncState => ({
  status: 'idle',
  startedAt: null,
  finishedAt: null,
  count: null,
  removed: null,
  skipped: null,
  error: null
})

let state: GroupsSyncState = idleState()

export function getGroupsSyncState (): GroupsSyncState {
  return { ...state }
}

export function startGroupsSyncIfIdle (): boolean {
  if (state.status === 'running') return false

  state = {
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null,
    count: null,
    removed: null,
    skipped: null,
    error: null
  }

  return true
}

export function completeGroupsSync (result: {
  count: number
  removed: number
  skipped: number
}): void {
  state = {
    ...state,
    status: 'success',
    finishedAt: new Date().toISOString(),
    count: result.count,
    removed: result.removed,
    skipped: result.skipped,
    error: null
  }
}

export function failGroupsSync (error: string): void {
  state = {
    ...state,
    status: 'error',
    finishedAt: new Date().toISOString(),
    error
  }
}
