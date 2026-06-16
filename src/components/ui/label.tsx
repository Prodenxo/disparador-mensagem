import { type LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export function Label ({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'text-xs font-medium uppercase tracking-wide text-text-muted',
        className
      )}
      {...props}
    />
  )
}
