import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select ({ className, hasError, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border bg-surface px-3 py-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasError ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)
