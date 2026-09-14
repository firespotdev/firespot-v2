import { cn } from '@/lib/utils'
import Image from 'next/image'

const TagFooter = ({
  color = '#64748B',
  icon = 'brand_black',
  className,
  size = 'sm',
}: {
  color?: string
  icon?: string
  className?: string
  size?: 'sm' | 'md'
}) => {
  const medium = size === 'md'

  return (
    <div className={cn('p-4 py-6 flex justify-center', className)}>
      <div className={cn('flex items-center', medium ? 'gap-2' : 'gap-1')}>
        <span
          style={{ color: color }}
          className={cn('font-medium', medium ? 'text-base' : 'text-xs')}
        >
          Powered by
        </span>
        <Image
          src={`/icons/${icon}.svg`}
          alt="firespot logo"
          width={medium ? 108 : 81}
          height={medium ? 32 : 24}
        />
      </div>
    </div>
  )
}

export { TagFooter }
