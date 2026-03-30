'use client'

import { Bar, BarChart } from 'recharts'

import { ChartContainer, type ChartConfig } from '@/components/ui/chart'

const chartData = [
  { month: 'January', desktop: 186, mobile: 80 },
  { month: 'February', desktop: 305, mobile: 200 },
  { month: 'March', desktop: 237, mobile: 120 },
  { month: 'April', desktop: 73, mobile: 190 },
  { month: 'May', desktop: 209, mobile: 130 },
  { month: 'June', desktop: 214, mobile: 140 },
  { month: 'July', desktop: 73, mobile: 190 },
  { month: 'August', desktop: 209, mobile: 130 },
  { month: 'September', desktop: 214, mobile: 140 },
  { month: 'October', desktop: 73, mobile: 190 },
  { month: 'November', desktop: 209, mobile: 130 },
  { month: 'December', desktop: 214, mobile: 140 },
]

const chartConfig = {
  mobile: {
    label: 'Mobile',
    color: '#26B2FF33',
  },
} satisfies ChartConfig

const CustomChart = () => {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <Bar
          dataKey="mobile"
          fill="var(--color-mobile)"
          radius={8}
          width={10.458333969116211}
        />
      </BarChart>
    </ChartContainer>
  )
}

export { CustomChart }
