export type GroupsSyncStatus = 'idle' | 'running' | 'success' | 'error'

export interface GroupsSyncState {
  status: GroupsSyncStatus
  startedAt: string | null
  finishedAt: string | null
  count: number | null
  error: string | null
}

const idleState = (): GroupsSyncState => ({
  status: 'idle',
  startedAt: null,
  finishedAt: null,
  count: null,
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
    error: null
  }

  return true
}

export function completeGroupsSync (count: number): void {
  state = {
    ...state,
    status: 'success',
    finishedAt: new Date().toISOString(),
    count,
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
