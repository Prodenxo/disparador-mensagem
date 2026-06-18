import 'dotenv/config'
import { Worker } from 'bullmq'
import { env } from '../src/lib/env'
import { ANNOUNCEMENT_QUEUE } from '../src/lib/queue/announcement.queue'
import { syncActiveCampaignJobs } from '../src/lib/queue/campaign-sync'
import { syncScheduledAnnouncementJobs } from '../src/lib/queue/announcement-sync'
import { syncScheduledPrivateCampaignJobs } from '../src/lib/queue/private-campaign-sync'
import { processAnnouncement } from './processors/announcement.processor'
import { processCampaign } from './processors/campaign.processor'
import { processPrivateCampaign } from './processors/private-campaign.processor'

const connection = { url: env.redisUrl, maxRetriesPerRequest: null }

console.log('[WORKER] Iniciando...')
console.log('[WORKER] Redis:', env.redisUrl.replace(/:[^:@/]+@/, ':***@'))

const worker = new Worker(
  ANNOUNCEMENT_QUEUE,
  async job => {
    if (job.name === 'campaign-dispatch') {
      console.log(`[WORKER] Processando campanha ${job.data.campaignId}`)
      await processCampaign(String(job.data.campaignId))
      return
    }

    if (job.name === 'private-campaign-dispatch') {
      console.log(`[WORKER] Processando campanha privada ${job.data.campaignId}`)
      await processPrivateCampaign(String(job.data.campaignId))
      return
    }

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
  if (job.name === 'campaign-dispatch') {
    console.log(`[WORKER] Campanha ${job.data.campaignId} ciclo concluído`)
    return
  }

  if (job.name === 'private-campaign-dispatch') {
    console.log(`[WORKER] Campanha privada ${job.data.campaignId} concluída`)
    return
  }

  console.log(`[WORKER] Anúncio ${job.id} enviado`)
})

worker.on('failed', (job, error) => {
  const label = job?.name === 'campaign-dispatch'
    ? `campanha ${job?.data?.campaignId}`
    : job?.name === 'private-campaign-dispatch'
      ? `campanha privada ${job?.data?.campaignId}`
      : `anúncio ${job?.id}`

  console.error(`[WORKER] Falha no ${label}:`, error.message)
})

worker.on('error', error => {
  console.error('[WORKER] Erro na fila:', error.message)
})

void Promise.all([
  syncScheduledAnnouncementJobs(),
  syncActiveCampaignJobs(),
  syncScheduledPrivateCampaignJobs()
])
  .then(([announcements, campaigns, privateCampaigns]) => {
    console.log(
      `[WORKER] Reconciliação: ${announcements.reconciled.fixedFromLogs} status corrigidos, ${announcements.reconciled.requeuedOverdue} atrasados reenfileirados, ${announcements.reconciled.resetStuckProcessing} processamentos travados`
    )
    console.log(
      `[WORKER] Fila sincronizada: ${announcements.enqueued} anúncios reenfileirados, ${announcements.skipped} já na fila, ${announcements.total} agendados no banco`
    )
    console.log(
      `[WORKER] Campanhas ativas: ${campaigns.enqueued} reenfileiradas, ${campaigns.skipped} ignoradas, ${campaigns.total} ativas no banco`
    )
    console.log(
      `[WORKER] Campanhas privadas: ${privateCampaigns.enqueued} reenfileiradas, ${privateCampaigns.skipped} ignoradas, ${privateCampaigns.total} agendadas no banco`
    )
  })
  .catch(error => {
    console.error('[WORKER] Falha ao sincronizar fila:', error instanceof Error ? error.message : error)
  })

console.log('[WORKER] Disparador de Mensagem — worker ativo')
