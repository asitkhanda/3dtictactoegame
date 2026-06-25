import { Layers } from 'lucide-react';
import { Slider } from './ui/slider';
import {
  getBoardTranslucencyLabel,
  MAX_BOARD_TRANSLUCENCY,
  MIN_BOARD_TRANSLUCENCY,
} from '../utils/boardTranslucency';
import { cn } from '../lib/utils';

interface BoardTranslucencyControlProps {
  translucency: number;
  onTranslucencyChange: (value: number) => void;
  compact?: boolean;
  className?: string;
}

export function BoardTranslucencyControl({
  translucency,
  onTranslucencyChange,
  compact = false,
  className,
}: BoardTranslucencyControlProps) {
  const label = getBoardTranslucencyLabel(translucency);

  if (compact) {
    return (
      <div className={cn('flex min-w-0 flex-col gap-1', className)}>
        <div className="font-body flex items-center justify-between gap-2 text-xs uppercase tracking-wide arcade-text-muted">
          <span className="flex items-center gap-1">
            <Layers className="size-3" />
            Board
          </span>
          <span className="font-mono normal-case tracking-normal">{label}</span>
        </div>
        <Slider
          value={[translucency]}
          min={MIN_BOARD_TRANSLUCENCY}
          max={MAX_BOARD_TRANSLUCENCY}
          step={1}
          onValueChange={([value]) => onTranslucencyChange(value)}
          aria-label="Board translucency"
          className="[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-thumb]]:size-3"
        />
      </div>
    );
  }

  return null;
}
