'use client'

import { useEffect, useState } from 'react'
import { isAdminAuthenticated } from '@/services/admin'
import AdminLogin from './AdminLogin'

export default function AdminAuthGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  if (!isAdminAuthenticated()) {
    return <AdminLogin />
  }

  return <>{children}</>
}
