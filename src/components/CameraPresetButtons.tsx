import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip';
import {
  CAMERA_PRESET_ORDER,
  CAMERA_PRESETS,
  type CameraPresetId,
} from '../utils/cameraPresets';
import { cn } from '../lib/utils';

interface CameraPresetButtonsProps {
  activePreset: CameraPresetId | null;
  onPresetSelect: (presetId: CameraPresetId) => void;
  className?: string;
}

export function CameraPresetButtons({
  activePreset,
  onPresetSelect,
  className,
}: CameraPresetButtonsProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-0.5', className)}>
      {CAMERA_PRESET_ORDER.map((id) => {
        const preset = CAMERA_PRESETS[id];
        return (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'size-7 min-w-7 px-0 font-mono text-xs arcade-text-muted hover:bg-white/10 hover:text-[var(--arcade-fg)] dark:hover:text-white',
                  activePreset === id &&
                    'border-[var(--neon-violet)]/40 bg-[var(--neon-violet)]/15 text-[var(--neon-violet)]'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onPresetSelect(id);
                }}
                aria-label={preset.label}
              >
                {preset.shortLabel}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {preset.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
