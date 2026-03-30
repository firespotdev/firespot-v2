import { InsightsQuery } from '@/services/insights'

// Helper to generate a random number within a range
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

export const generateMockSalesStats = (filter: InsightsQuery) => {
  const preset = filter.preset || 'today'
  let trend: { label: string; amount: number; count: number }[] = []
  
  const now = new Date()
  let todaySalesCount = 0
  let todaySalesAmount = 0
  let percentageChange = random(-15, 45) // random between -15% and +45%

  if (preset === 'today') {
    trend = Array.from({ length: 24 }).map((_, i) => {
      const count = random(0, 5)
      const amount = count * random(1000, 10000)
      todaySalesCount += count
      todaySalesAmount += amount
      return {
        label: `${i.toString().padStart(2, '0')}:00`,
        amount,
        count
      }
    })
  } else if (preset === 'this_week' || preset === 'last_7_days') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    trend = Array.from({ length: 7 }).map((_, i) => {
      const count = random(10, 50)
      const amount = count * random(1000, 15000)
      todaySalesCount += count
      todaySalesAmount += amount
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return {
        label: days[d.getDay()],
        amount,
        count
      }
    })
  } else if (preset === 'last_30_days' || preset === 'custom') {
    trend = Array.from({ length: 30 }).map((_, i) => {
      const count = random(5, 40)
      const amount = count * random(1000, 15000)
      todaySalesCount += count
      todaySalesAmount += amount
      const d = new Date()
      d.setDate(d.getDate() - (29 - i))
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return { label, amount, count }
    })
  } else if (preset === 'last_90_days' || preset === 'all_time') {
    // Show approx 6 months / 6 weeks of grouped data
    trend = Array.from({ length: 6 }).map((_, i) => {
      const count = random(150, 400)
      const amount = count * random(2000, 10000)
      todaySalesCount += count
      todaySalesAmount += amount
      const d = new Date()
      if (preset === 'last_90_days') {
        d.setDate(d.getDate() - (5 - i) * 15) // Approx 2 weeks apart
        return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), amount, count }
      } else {
        d.setMonth(d.getMonth() - (5 - i))
        return { label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), amount, count }
      }
    })
  }

  // Previous period string logic locally
  let previousPeriodLabel = 'yesterday'
  if (preset === 'this_week') previousPeriodLabel = 'last week'
  else if (preset === 'last_7_days') previousPeriodLabel = 'previous 7 days'
  else if (preset === 'last_30_days') previousPeriodLabel = 'previous 30 days'
  else if (preset === 'last_90_days') previousPeriodLabel = 'previous 90 days'
  else if (preset === 'all_time') percentageChange = 0 // Hide percentage for all time

  return {
    pendingSalesCount: random(0, 10),
    todaySalesCount,
    todaySalesAmount,
    totalSalesAmount: todaySalesAmount + 450000, // Total is always larger
    trend,
    percentageChange: preset !== 'all_time' ? percentageChange : undefined,
    previousPeriodLabel
  }
}

export const generateMockMerchantInsights = (filter: InsightsQuery) => {
  // Multiply dummy traffic stats by length of time to naturally scale numbers
  const scale = filter.preset === 'today' ? 1 : filter.preset === 'last_7_days' || filter.preset === 'this_week' ? 7 : filter.preset === 'last_30_days' ? 30 : 90
  
  const newCustomers = random(5, 15) * scale
  const returningCustomers = random(2, 8) * scale
  const totalCustomers = newCustomers + returningCustomers
  const totalScans = random(totalCustomers, totalCustomers * 3)

  return {
    traffic: {
      totalCustomers,
      customerBreakdown: {
        newCustomers,
        returningCustomers,
        totalCustomers
      }
    },
    qrKitScans: {
      totalScans,
      breakdown: [
        { qrKitId: 'kit_1', serialNumber: 'FLARE-STORE-1', scanCount: Math.floor(totalScans * 0.7) },
        { qrKitId: 'kit_2', serialNumber: 'FLARE-STORE-2', scanCount: Math.floor(totalScans * 0.3) }
      ]
    },
    accountCopies: {
      totalCopies: Math.floor(totalCustomers * 0.4),
      bankBreakdown: [
        { bankName: 'Opay', count: Math.floor(totalCustomers * 0.2) },
        { bankName: 'Kuda', count: Math.floor(totalCustomers * 0.1) },
        { bankName: 'GTBank', count: Math.floor(totalCustomers * 0.1) }
      ]
    },
    linkedCounts: {
      bankAccounts: 3,
      qrKits: 2
    },
    dateRange: {
      preset: filter.preset || 'today',
      startDate: filter.startDate || null,
      endDate: filter.endDate || null
    }
  }
}
