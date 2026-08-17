import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { cn } from '../../lib/utils';
import type { KonamiStep } from '../../utils/gameConfig';

interface SecretCodeDialogProps {
  open: boolean;
  progress: number;
  onOpenChange: (open: boolean) => void;
  onStep: (step: KonamiStep) => void;
  onReset: () => void;
}

export function SecretCodeDialog({
  open,
  progress,
  onOpenChange,
  onStep,
  onReset,
}: SecretCodeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ui-surface rounded-[var(--ui-radius)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase">Secret input</DialogTitle>
          <DialogDescription className="font-body arcade-text-muted">
            Enter the hidden sequence to unlock the larger boards.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-1.5" aria-label={`${progress} of 10 steps entered`}>
            {Array.from({ length: 10 }, (_, index) => (
              <span
                key={index}
                className={cn(
                  'size-2 rounded-full border border-[var(--ui-border-strong)] transition-colors',
                  index < progress && 'border-[var(--neon-orange)] bg-[var(--neon-orange)]'
                )}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2" aria-label="Directional input">
            <span aria-hidden />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="ui-control"
              onClick={() => onStep('ArrowUp')}
              aria-label="Up"
            >
              <ArrowUp />
            </Button>
            <span aria-hidden />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="ui-control"
              onClick={() => onStep('ArrowLeft')}
              aria-label="Left"
            >
              <ArrowLeft />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="ui-control"
              onClick={() => onStep('ArrowDown')}
              aria-label="Down"
            >
              <ArrowDown />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="ui-control"
              onClick={() => onStep('ArrowRight')}
              aria-label="Right"
            >
              <ArrowRight />
            </Button>
          </div>

          <div className="flex gap-2">
            {(['KeyB', 'KeyA'] as const).map((step) => (
              <Button
                key={step}
                type="button"
                variant="secondary"
                className="ui-control min-w-16 font-display text-base"
                onClick={() => onStep(step)}
              >
                {step.slice(-1)}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button type="button" variant="ghost" onClick={onReset}>
            <RotateCcw />
            Reset
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
