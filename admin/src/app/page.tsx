import AdminAuthGuard from '@/components/admin/AdminAuthGuard'
import AdminLayout from '@/components/admin/AdminLayout'

export default function AdminPage() {
  return (
    <AdminAuthGuard>
      <AdminLayout />
    </AdminAuthGuard>
  )
}
