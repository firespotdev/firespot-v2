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

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}

export interface ChangePasswordResponse {
  message: string
}
