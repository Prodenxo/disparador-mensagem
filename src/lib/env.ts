function clean (val: string | undefined): string {
  return val?.replace(/['"]+/g, '').trim() || ''
}

export const env = {
  appUrl: clean(process.env.APP_URL) || 'http://localhost:3000',
  authSecret: clean(process.env.AUTH_SECRET),
  databaseUrl: clean(process.env.DATABASE_URL),
  redisUrl: clean(process.env.REDIS_URL) || 'redis://localhost:6379',
  timezone: clean(process.env.TZ) || 'America/Sao_Paulo',
  uploadDir: clean(process.env.UPLOAD_DIR) || './uploads',
  maxImageSizeMb: Number(process.env.MAX_IMAGE_SIZE_MB || 5),
  evolution: {
    baseUrl: clean(process.env.EVOLUTION_API_URL),
    apiKey: clean(process.env.EVOLUTION_API_KEY),
    instance: clean(process.env.EVOLUTION_INSTANCE_NAME)
  }
}
