import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { PrismaClient, Prisma } = require('@prisma/client')

const prisma = new PrismaClient()
const models = Prisma.dmmf.datamodel.models.map((m) => m.name)
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const data = {}
let total = 0

try {
  for (const name of models) {
    const delegate = prisma[name.charAt(0).toLowerCase() + name.slice(1)]
    const rows = await delegate.findMany()
    data[name] = rows
    total += rows.length
    console.log(name.padEnd(22), rows.length)
  }
  mkdirSync('backups', { recursive: true })
  const file = join('backups', `neire-backup-${stamp}.json`)
  writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), models: data }, null, 1), 'utf8')
  console.log(`\nGuardado: ${file} (${total} registos)`)
} finally {
  await prisma.$disconnect()
}
