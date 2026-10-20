const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Neire#2026', 10);
  const users = [
    { name: 'Admin NEIRE', email: 'admin@neire.ao', role: 'admin' },
    { name: 'Nádio', email: 'estudante@neire.ao', role: 'student' },
    { name: 'Alumni Demo', email: 'alumni@neire.ao', role: 'alumni' },
    { name: 'Empresa Demo', email: 'empresa@neire.ao', role: 'company' },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash },
    });
    if (u.role === 'student' || u.role === 'alumni') {
      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          course: 'Engenharia Informática',
          year: u.role === 'alumni' ? 'Graduado' : '3.º ano',
        },
      });
    }
    if (u.role === 'company') {
      await prisma.company.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, name: u.name, sector: 'Tecnologia', status: 'ativa' },
      });
    }
  }
  console.log('Seed concluido. Contas de demonstracao (palavra-passe: Neire#2026):');
  users.forEach((u) => console.log(`  ${u.role.padEnd(8)} ${u.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
