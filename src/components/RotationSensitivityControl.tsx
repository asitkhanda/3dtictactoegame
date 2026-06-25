import { Gauge } from 'lucide-react';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import {
  getRotationSensitivityLabel,
  MAX_ROTATION_SENSITIVITY,
  MIN_ROTATION_SENSITIVITY,
} from '../utils/rotationSensitivity';
import { cn } from '../lib/utils';

interface RotationSensitivityControlProps {
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
  compact?: boolean;
  className?: string;
}

export function RotationSensitivityControl({
  sensitivity,
  onSensitivityChange,
  compact = false,
  className,
}: RotationSensitivityControlProps) {
  const label = getRotationSensitivityLabel(sensitivity);

  if (compact) {
    return (
      <div className={cn('flex min-w-0 flex-col gap-1', className)}>
        <div className="font-body flex items-center justify-between gap-2 text-xs uppercase tracking-wide arcade-text-muted">
          <span className="flex items-center gap-1">
            <Gauge className="size-3" />
            Rotate
          </span>
          <span className="font-mono normal-case tracking-normal">{label}</span>
        </div>
        <Slider
          value={[sensitivity]}
          min={MIN_ROTATION_SENSITIVITY}
          max={MAX_ROTATION_SENSITIVITY}
          step={1}
          onValueChange={([value]) => onSensitivityChange(value)}
          aria-label="Joystick rotation sensitivity"
          className="[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-thumb]]:size-3"
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-muted-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
          <Gauge className="size-3.5" />
          Joystick sensitivity
        </Label>
        <span className="text-muted-foreground font-mono text-xs">{label}</span>
      </div>
      <Slider
        value={[sensitivity]}
        min={MIN_ROTATION_SENSITIVITY}
        max={MAX_ROTATION_SENSITIVITY}
        step={1}
        onValueChange={([value]) => onSensitivityChange(value)}
        aria-label="Joystick rotation sensitivity"
      />
      <div className="text-muted-foreground flex justify-between text-[10px]">
        <span>Precise</span>
        <span>Fast</span>
      </div>
    </div>
  );
}
