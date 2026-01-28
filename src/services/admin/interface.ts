export interface AdminLoginDto {
  adminId: string
  password: string
}

export interface AdminLoginResponse {
  accessToken: string
  admin: {
    adminId: string
    name: string
    role: string
  }
}
