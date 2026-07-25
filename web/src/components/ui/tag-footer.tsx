import { cn } from '@/lib/utils'
import Image from 'next/image'

const TagFooter = ({
  color = '#64748B',
  icon = 'brand_black',
  className,
}: {
  color?: string
  icon?: string
  className?: string
}) => {
  return (
    <div className={cn('p-4 py-6 flex justify-center', className)}>
      <div className="flex items-center gap-1">
        <span style={{ color: color }} className="text-xs font-medium">
          Powered by
        </span>
        <Image
          src={`/icons/${icon}.svg`}
          alt="firespot logo"
          width={81}
          height={24}
        />
      </div>
    </div>
  )
}

export { TagFooter }
