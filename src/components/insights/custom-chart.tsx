'use client'

import { Bar, BarChart, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartContainer, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  amount: {
    label: 'Sales Amount',
    color: '#26B2FF33',
  },
} satisfies ChartConfig

interface CustomChartProps {
  data?: { label: string; amount: number; count: number }[]
}

const CustomChart = ({ data = [] }: CustomChartProps) => {
  const activeData = data.filter(item => item.amount > 0 || item.count > 0)

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={activeData}>
        <XAxis
          dataKey="label"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <Tooltip
          cursor={false}
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-white p-2 shadow-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase text-gray-500">
                        Amount
                      </span>
                      <span className="font-bold text-gray-900">
                        ₦ {payload[0].value?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Bar
          dataKey="amount"
          fill="var(--color-amount)"
          radius={8}
          maxBarSize={60}
        />
      </BarChart>
    </ChartContainer>
  )
}

export { CustomChart }
