const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

(async () => {
  const email = process.argv[2];
  const pwd   = process.argv[3];
  if (!email || !pwd) { console.error('Usage: node scripts_bootstrap_admin.js <email> <password>'); process.exit(1); }

  const prisma = new PrismaClient();
  const hash = await argon2.hash(pwd, { type: argon2.argon2id });

  // ⚠️ ADAPTE les champs selon ton schéma (passwordHash vs password, role, isVerified)
  const data = { email, role: 'admin', isVerified: true };

  try {
    // Essai 1 : champ passwordHash
    data.passwordHash = hash;
    const u = await prisma.user.upsert({ where: { email }, update: data, create: data });
    console.log('✅ Admin prêt :', u.id, u.email);
  } catch (e) {
    // Essai 2 : champ password
    try {
      delete data.passwordHash; data.password = hash;
      const u = await prisma.user.upsert({ where: { email }, update: data, create: data });
      console.log('✅ Admin prêt :', u.id, u.email);
    } catch (e2) {
      console.error('❌ Adapte les noms de champs Prisma (password/passwordHash, role, isVerified).');
      console.error(e2.message);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
})();
