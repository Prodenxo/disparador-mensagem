import 'dotenv/config'
import { Worker } from 'bullmq'
import { env } from '../src/lib/env'
import { ANNOUNCEMENT_QUEUE } from '../src/lib/queue/announcement.queue'
import { syncScheduledAnnouncementJobs } from '../src/lib/queue/announcement-sync'
import { processAnnouncement } from './processors/announcement.processor'

const connection = { url: env.redisUrl, maxRetriesPerRequest: null }

console.log('[WORKER] Iniciando...')
console.log('[WORKER] Redis:', env.redisUrl.replace(/:[^:@/]+@/, ':***@'))

const worker = new Worker(
  ANNOUNCEMENT_QUEUE,
  async job => {
    console.log(`[WORKER] Processando anúncio ${job.data.announcementId}`)
    await processAnnouncement(String(job.data.announcementId))
  },
  { connection }
)

worker.on('ready', () => {
  console.log('[WORKER] Conectado ao Redis e ouvindo fila')
})

worker.on('active', job => {
  console.log(`[WORKER] Job ativo: ${job.id}`)
})

worker.on('completed', job => {
  console.log(`[WORKER] Anúncio ${job.id} enviado`)
})

worker.on('failed', (job, error) => {
  console.error(`[WORKER] Falha no anúncio ${job?.id}:`, error.message)
})

worker.on('error', error => {
  console.error('[WORKER] Erro na fila:', error.message)
})

void syncScheduledAnnouncementJobs()
  .then(result => {
    console.log(
      `[WORKER] Fila sincronizada: ${result.enqueued} reenfileirados, ${result.skipped} já na fila, ${result.total} agendados no banco`
    )
  })
  .catch(error => {
    console.error('[WORKER] Falha ao sincronizar fila:', error instanceof Error ? error.message : error)
  })

console.log('[WORKER] Disparador de Mensagem — worker ativo')
