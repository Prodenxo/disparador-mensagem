import { prisma } from '@/lib/prisma'
import { announcementQueue, scheduleAnnouncementJob } from '@/lib/queue/announcement.queue'

export async function reconcileAnnouncementStatuses (): Promise<{
  fixedFromLogs: number
  requeuedOverdue: number
  resetStuckProcessing: number
}> {
  const fixedFromLogs = await prisma.announcement.updateMany({
    where: {
      status: { in: ['SCHEDULED', 'PROCESSING'] },
      logs: { some: { status: 'SENT' } }
    },
    data: { status: 'SENT' }
  })

  const stuckProcessing = await prisma.announcement.findMany({
    where: {
      status: 'PROCESSING',
      updatedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) }
    },
    select: { id: true, scheduledAt: true }
  })

  let resetStuckProcessing = 0

  for (const item of stuckProcessing) {
    const hasSentLog = await prisma.dispatchLog.count({
      where: { announcementId: item.id, status: 'SENT' }
    })

    if (hasSentLog > 0) {
      await prisma.announcement.update({
        where: { id: item.id },
        data: { status: 'SENT' }
      })
      resetStuckProcessing += 1
      continue
    }

    await prisma.announcement.update({
      where: { id: item.id },
      data: { status: 'SCHEDULED' }
    })

    const existingJob = await announcementQueue.getJob(item.id)
    if (existingJob) await existingJob.remove()

    await scheduleAnnouncementJob(item.id, new Date())
    resetStuckProcessing += 1
  }

  const overdue = await prisma.announcement.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date(Date.now() - 60_000) }
    },
    select: { id: true, scheduledAt: true }
  })

  let requeuedOverdue = 0
  let fixedFromCompletedJobs = 0

  for (const item of overdue) {
    const existingJob = await announcementQueue.getJob(item.id)

    if (existingJob) {
      const state = await existingJob.getState()

      if (state === 'waiting' || state === 'delayed' || state === 'active') {
        continue
      }

      if (state === 'completed') {
        const hasSentLog = await prisma.dispatchLog.count({
          where: { announcementId: item.id, status: 'SENT' }
        })

        if (hasSentLog > 0) {
          await prisma.announcement.update({
            where: { id: item.id },
            data: { status: 'SENT' }
          })
          await existingJob.remove()
          fixedFromCompletedJobs += 1
          continue
        }
      }

      await existingJob.remove()
    }

    await scheduleAnnouncementJob(item.id, new Date())
    requeuedOverdue += 1
  }

  return {
    fixedFromLogs: fixedFromLogs.count + fixedFromCompletedJobs,
    requeuedOverdue,
    resetStuckProcessing
  }
}

export async function syncScheduledAnnouncementJobs (): Promise<{
  enqueued: number
  skipped: number
  total: number
  reconciled: Awaited<ReturnType<typeof reconcileAnnouncementStatuses>>
}> {
  const reconciled = await reconcileAnnouncementStatuses()

  const scheduled = await prisma.announcement.findMany({
    where: { status: 'SCHEDULED' },
    select: { id: true, scheduledAt: true },
    orderBy: { scheduledAt: 'asc' }
  })

  let enqueued = 0
  let skipped = 0

  for (const item of scheduled) {
    const existing = await announcementQueue.getJob(item.id)

    if (existing) {
      const state = await existingJobState(existing)

      if (state === 'failed') {
        await existing.remove()
        await scheduleAnnouncementJob(item.id, new Date())
        enqueued += 1
        continue
      }

      skipped += 1
      continue
    }

    const runAt = item.scheduledAt.getTime() <= Date.now()
      ? new Date()
      : item.scheduledAt

    await scheduleAnnouncementJob(item.id, runAt)
    enqueued += 1
  }

  return {
    enqueued,
    skipped,
    total: scheduled.length,
    reconciled
  }
}

async function existingJobState (job: { getState: () => Promise<string> }): Promise<string> {
  try {
    return await job.getState()
  } catch {
    return 'unknown'
  }
}
