export interface User {
  id: string
  email: string
  firstname?: string
  lastname?: string
  createdAt: Date
}

export interface RegisterRequest {
  email: string
  password: string
  firstname?: string
  lastname?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  message?: string
  user?: User
  token?: string
}