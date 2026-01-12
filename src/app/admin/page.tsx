import AdminAuthGuard from '@/components/admin/AdminAuthGuard'
import QRCodeBrander from '@/components/admin/QRCodeBrander'

export default function AdminPage() {
  return (
    <AdminAuthGuard>
      <QRCodeBrander />
    </AdminAuthGuard>
  )
}
