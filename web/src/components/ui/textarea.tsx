import * as React from 'react'

import { cn } from '@/lib/utils'

/** A multi-line field styled like `Input`. */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-[#9CA3AF] placeholder:font-normal selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-[#DDDDDD] min-h-24 w-full min-w-0 resize-none rounded-md border bg-transparent px-4 py-3 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
