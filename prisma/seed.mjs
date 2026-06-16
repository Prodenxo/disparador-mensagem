import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main () {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD
  const name = process.env.SEED_SUPER_ADMIN_NAME || 'Super Admin'

  if (!email || !password) {
    console.log('[SEED] SEED_SUPER_ADMIN_EMAIL/PASSWORD não definidos — pulando seed')
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name, globalRole: 'SUPER_ADMIN', active: true },
    create: {
      email,
      passwordHash,
      name,
      globalRole: 'SUPER_ADMIN',
      active: true
    }
  })

  console.log(`[SEED] Super Admin pronto: ${email}`)
}

main()
  .catch(error => {
    console.error('[SEED] Erro:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
