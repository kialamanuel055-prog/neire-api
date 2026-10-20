const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || password.length < 12) {
    throw new Error('ADMIN_EMAIL e ADMIN_PASSWORD (minimo 12 caracteres) sao obrigatorios.');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'admin' },
    create: { name: 'Administração NEIRE', email, passwordHash, role: 'admin' },
  });
  console.log('Administrador pronto:', email);
}

main()
  .catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
