import { Settings2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { BoardTranslucencyControl } from '../BoardTranslucencyControl';
import { CameraPresetButtons } from '../CameraPresetButtons';
import type { CameraPresetId } from '../../utils/cameraPresets';

interface BoardViewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is3D: boolean;
  translucency: number;
  onTranslucencyChange: (value: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  activePreset?: CameraPresetId | null;
  onPresetSelect?: (presetId: CameraPresetId) => void;
}

export function BoardViewSheet({
  open,
  onOpenChange,
  is3D,
  translucency,
  onTranslucencyChange,
  onZoomIn,
  onZoomOut,
  activePreset,
  onPresetSelect,
}: BoardViewSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ui-surface rounded-[var(--ui-radius)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-xl uppercase">
            <Settings2 className="size-4 text-[var(--neon-orange)]" />
            Board view
          </DialogTitle>
          <DialogDescription className="font-body arcade-text-muted">
            Adjust the board without covering the play area.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <BoardTranslucencyControl
            translucency={translucency}
            onTranslucencyChange={onTranslucencyChange}
          />

          <div className="space-y-2">
            <p className="ui-eyebrow">Zoom</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="ui-control flex-1" onClick={onZoomOut}>
                <ZoomOut />
                Zoom out
              </Button>
              <Button type="button" variant="outline" className="ui-control flex-1" onClick={onZoomIn}>
                <ZoomIn />
                Zoom in
              </Button>
            </div>
          </div>

          {is3D && onPresetSelect && (
            <div className="space-y-2">
              <p className="ui-eyebrow">Camera preset</p>
              <CameraPresetButtons
                activePreset={activePreset ?? null}
                onPresetSelect={onPresetSelect}
                className="justify-start gap-1"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

