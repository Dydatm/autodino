import bcrypt from 'bcrypt'
import { prisma } from './prisma'
import { verifyToken as verifyJwt } from './jwt'

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Les fonctions JWT sont maintenant dans ./jwt
export { generateToken, verifyToken, type JWTPayload } from './jwt'

export async function getUserFromToken(token: string) {
  const payload = verifyJwt(token)
  if (!payload) return null

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstname: true,
        lastname: true,
        createdAt: true,
        isAdmin: true,
      },
    })
    
    if (!user) return null
    
    return {
      id: user.id,
      email: user.email,
      firstname: user.firstname || undefined,
      lastname: user.lastname || undefined,
      createdAt: user.createdAt,
      isAdmin: user.isAdmin,
    }
  } catch {
    return null
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}