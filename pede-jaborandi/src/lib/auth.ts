// src/lib/auth.ts

export type UserRole = 'superadmin' | 'merchant'

export interface AuthUser {
  id:    string
  email: string
  role:  UserRole
}

const SUPERADMIN_EMAIL = 'geovanebelotti2001@outlook.com'

export function resolveRole(email: string): UserRole {
  return email === SUPERADMIN_EMAIL ? 'superadmin' : 'merchant'
}
