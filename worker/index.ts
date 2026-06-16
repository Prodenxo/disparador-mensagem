import 'dotenv/config'
import { Worker } from 'bullmq'
import { env } from '../src/lib/env'
import { ANNOUNCEMENT_QUEUE } from './queues/announcement.queue'
import { processAnnouncement } from './processors/announcement.processor'

const connection = { url: env.redisUrl, maxRetriesPerRequest: null }

const worker = new Worker(
  ANNOUNCEMENT_QUEUE,
  async job => {
    await processAnnouncement(String(job.data.announcementId))
  },
  { connection }
)

worker.on('completed', job => {
  console.log(`[WORKER] Anúncio ${job.id} enviado`)
})

worker.on('failed', (job, error) => {
  console.error(`[WORKER] Falha no anúncio ${job?.id}:`, error.message)
})

console.log('[WORKER] Disparador de Mensagem — worker ativo')
