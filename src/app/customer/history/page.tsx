'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Landmark, Search, ChevronRight, AlertTriangle, CircleCheck } from 'lucide-react'
import { useAuthStore } from '@/services/auth'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { useDrawerStore } from '@/services/drawer'
import { apiClient } from '@/lib/utils/axios'

export default function CustomerHistoryPage() {
  const router = useRouter()
  const { user, logout, isAuthenticated } = useAuthStore()
  const { openDrawer } = useDrawerStore()

  const [sales, setSales] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/customer/login')
      return
    }

    // Fetch customer sales history
    apiClient.get('/sales/customer/history')
      .then(res => {
        setSales(res.data || [])
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Failed to load customer history:', err)
        setIsLoading(false)
      })
  }, [isAuthenticated, user, router])

  const filteredSales = sales.filter((sale: any) =>
    sale.merchantId?.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleLogout = () => {
    logout()
    router.replace('/customer/login')
  }

  const handleOpenDetails = (sale: any) => {
    openDrawer({
      type: 'transaction-details',
      props: { sale, onClose: () => {} }
    })
  }

  if (isLoading) {
    return (
      <div className="h-dvh bg-white flex items-center justify-center font-satoshi">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-dvh bg-[#F4F6F8] flex flex-col items-center overflow-hidden font-satoshi">
      <div className="w-full max-w-125 bg-white h-full flex flex-col justify-between shadow-sm relative">
        {/* Header */}
        <header className="flex justify-between items-center px-4 py-3.5 border-b border-[#F4F6F8] sticky top-0 bg-white z-10">
          <div className="flex flex-col text-left">
            <h1 className="text-base font-bold text-black">Payment History</h1>
            <span className="text-xs text-[#00000060] font-medium mt-0.5">{user?.phoneNumber}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F4F6F8] hover:bg-gray-100 text-black transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Search */}
        <div className="px-4 pt-4 shrink-0 bg-white">
          <div className="flex items-center bg-[#F4F6F8] border border-[#E9EBED] rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-[#8E8E93] mr-2" />
            <input
              type="text"
              placeholder="Search by vendor or description"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-black focus:outline-none placeholder-[#8E8E93]"
            />
          </div>
        </div>

        {/* Transaction list */}
        <div className="flex-1 px-4 py-4 overflow-y-auto bg-white flex flex-col gap-3">
          {filteredSales.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6">
              <Landmark className="w-10 h-10 text-[#8E8E93] mb-3" />
              <h3 className="text-sm font-bold text-black">No transactions found</h3>
              <p className="text-xs text-[#00000040] mt-1 max-w-xs">
                Your completed scan-to-pay payments will display here.
              </p>
            </div>
          ) : (
            filteredSales.map((sale) => (
              <div
                key={sale._id}
                className="w-full border border-[#E9EBED] rounded-2xl p-4 flex flex-col hover:bg-gray-50 transition-all cursor-pointer"
                onClick={() => handleOpenDetails(sale)}
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-100">
                      {sale.merchantId?.profilePhotoUrl ? (
                        <img src={sale.merchantId.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-black">{sale.merchantId?.businessName?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-black">{sale.merchantId?.businessName}</span>
                  </div>
                  <span className="text-sm font-bold text-[#24C166]">
                    ₦{sale.amount?.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-[#F4F6F8] pt-3">
                  <div className="flex flex-col text-left">
                    <span className="text-xs text-[#00000060] font-medium truncate max-w-[200px]">
                      {sale.description || 'Payment via QR'}
                    </span>
                    <span className="text-[10px] text-[#8E8E93] font-bold mt-0.5">
                      {format(new Date(sale.createdAt || Date.now()), 'MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/customer/report/${sale._id}`)
                      }}
                      className="text-xs font-bold text-[#FF3B30] hover:underline flex items-center gap-1 border border-red-100 bg-red-50/50 px-3 py-1.5 rounded-full"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Dispute
                    </button>
                    <ChevronRight className="w-4 h-4 text-[#8E8E93]" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
