import * as React from 'react';
import { cn } from '@/lib/utils';

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }
>(({ className, variant = 'default', ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2',
        {
          'border-transparent bg-blue-900 text-slate-50 hover:bg-blue-900/80': variant === 'default',
          'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80': variant === 'secondary',
          'border-transparent bg-red-500 text-slate-50 hover:bg-red-500/80': variant === 'destructive',
          'text-slate-950': variant === 'outline',
          'border-transparent bg-emerald-500 text-white hover:bg-emerald-500/80': variant === 'success',
          'border-transparent bg-amber-500 text-white hover:bg-amber-500/80': variant === 'warning',
        },
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = 'Badge';

export { Badge };
