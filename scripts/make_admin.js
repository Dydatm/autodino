/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const crypto = require('crypto')

async function main() {
  const prisma = new PrismaClient()
  const emailArg = process.argv[2] || 'admin@autodino.local'
  const passwordArg = process.argv[3]

  const email = String(emailArg).toLowerCase()
  const generatedPassword = crypto.randomBytes(16).toString('base64url')
  const password = passwordArg || generatedPassword

  const hashed = await bcrypt.hash(password, 12)

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { password: hashed, isAdmin: true, isVerified: true },
    })
    console.log('Admin mis à jour:')
    console.log('EMAIL=', email)
    console.log('PASSWORD=', password)
  } else {
    await prisma.user.create({
      data: {
        email,
        password: hashed,
        isAdmin: true,
        isVerified: true,
      },
    })
    console.log('Admin créé:')
    console.log('EMAIL=', email)
    console.log('PASSWORD=', password)
  }

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  process.exit(1)
})


