import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input ({ className, hasError, type = 'text', ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border bg-surface px-3 py-2 text-sm',
          'placeholder:text-text-muted/70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasError ? 'border-danger' : 'border-border',
          className
        )}
        {...props}
      />
    )
  }
)
