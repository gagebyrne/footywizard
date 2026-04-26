'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface CaptainBadgeProps {
  isCaptain: boolean;
}

export function CaptainBadge({ isCaptain }: CaptainBadgeProps) {
  if (!isCaptain) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'absolute top-1 right-1 z-10',
            'flex items-center justify-center',
            'w-5 h-5 sm:w-6 sm:h-6',
            'rounded-full',
            'bg-gradient-to-br from-yellow-400 to-amber-500',
            'border-2 border-yellow-300',
            'shadow-lg shadow-yellow-500/50',
            'font-black text-[10px] sm:text-xs text-yellow-950',
            'cursor-help',
            'hover:scale-110 hover:shadow-xl hover:shadow-yellow-500/60',
            'transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2'
          )}
          aria-label="Captain - scores double points"
        >
          C
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2 sm:p-3 text-xs"
        side="top"
        align="center"
      >
        <p className="font-semibold text-yellow-600 dark:text-yellow-400">
          Captain scores 2× points
        </p>
      </PopoverContent>
    </Popover>
  );
}
