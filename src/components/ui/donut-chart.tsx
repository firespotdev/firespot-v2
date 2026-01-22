'use client'

interface DonutChartSegment {
  value: number
  color: string
  label: string
}

interface DonutChartProps {
  segments: DonutChartSegment[]
  size?: number
  strokeWidth?: number
  centerLabel?: string
  centerValue?: string | number
}

export function DonutChart({
  segments,
  size = 180,
  strokeWidth = 24,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const centerX = size / 2
  const centerY = size / 2

  // Calculate stroke dash arrays for each segment
  let cumulativePercentage = 0
  const segmentData = segments.map((segment) => {
    const percentage = total > 0 ? segment.value / total : 0
    const dashArray = circumference * percentage
    const dashOffset = circumference * (1 - cumulativePercentage) + circumference * 0.25
    cumulativePercentage += percentage
    return {
      ...segment,
      percentage,
      dashArray,
      dashOffset,
    }
  })

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="#F1F1F1"
          strokeWidth={strokeWidth}
        />
        {/* Segment circles */}
        {segmentData.map((segment, index) => (
          <circle
            key={index}
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segment.dashArray} ${circumference - segment.dashArray}`}
            strokeDashoffset={segment.dashOffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        ))}
      </svg>
      {/* Center content */}
      {(centerLabel || centerValue !== undefined) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && (
            <span className="text-xs text-[#00000066] font-medium">
              {centerLabel}
            </span>
          )}
          {centerValue !== undefined && (
            <span className="text-3xl font-bold text-black">{centerValue}</span>
          )}
        </div>
      )}
    </div>
  )
}

interface DonutChartLegendProps {
  segments: DonutChartSegment[]
}

export function DonutChartLegend({ segments }: DonutChartLegendProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  return (
    <div className="flex flex-col gap-2 mt-4">
      {segments.map((segment, index) => {
        const percentage = total > 0 ? Math.round((segment.value / total) * 100) : 0
        return (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-sm text-black font-medium">
                {segment.label}
              </span>
            </div>
            <span className="text-sm text-[#00000066] font-medium">
              {percentage}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
