import { useCallback, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from './ui/button';
import { RotationSensitivityControl } from './RotationSensitivityControl';
import { BoardTranslucencyControl } from './BoardTranslucencyControl';
import { CameraPresetButtons } from './CameraPresetButtons';
import type { CameraPresetId } from '../utils/cameraPresets';
import { cn } from '../lib/utils';

const PAD_SIZE = 88;
const KNOB_SIZE = 28;
const MAX_OFFSET = (PAD_SIZE - KNOB_SIZE) / 2;

interface BoardCameraJoystickProps {
  onRotate?: (deltaX: number, deltaY: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  sensitivity?: number;
  onSensitivityChange?: (value: number) => void;
  translucency?: number;
  onTranslucencyChange?: (value: number) => void;
  activePreset?: CameraPresetId | null;
  onPresetSelect?: (presetId: CameraPresetId) => void;
  zoomOnly?: boolean;
  className?: string;
}

export function BoardCameraJoystick({
  onRotate,
  onZoomIn,
  onZoomOut,
  sensitivity,
  onSensitivityChange,
  translucency,
  onTranslucencyChange,
  activePreset,
  onPresetSelect,
  zoomOnly = false,
  className,
}: BoardCameraJoystickProps) {
  const padRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  const clampKnob = useCallback((x: number, y: number) => {
    const distance = Math.hypot(x, y);
    if (distance <= MAX_OFFSET || distance === 0) return { x, y };
    const scale = MAX_OFFSET / distance;
    return { x: x * scale, y: y * scale };
  }, []);

  const updateKnobFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current;
      if (!pad) return;

      const rect = pad.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      setKnobOffset(clampKnob(clientX - centerX, clientY - centerY));
    },
    [clampKnob]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      activeRef.current = true;
      setIsActive(true);
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      updateKnobFromPointer(e.clientX, e.clientY);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [updateKnobFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!activeRef.current || !lastPointerRef.current || !onRotate) return;

      const deltaX = e.clientX - lastPointerRef.current.x;
      const deltaY = e.clientY - lastPointerRef.current.y;
      onRotate(deltaX, deltaY);
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      updateKnobFromPointer(e.clientX, e.clientY);
    },
    [onRotate, updateKnobFromPointer]
  );

  const endInteraction = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activeRef.current = false;
    setIsActive(false);
    lastPointerRef.current = null;
    setKnobOffset({ x: 0, y: 0 });
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer may already be released
    }
  }, []);

  const zoomButtons = (
    <div className="flex flex-col gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={(e) => {
          e.stopPropagation();
          onZoomIn();
        }}
        aria-label="Zoom in"
      >
        <ZoomIn className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={(e) => {
          e.stopPropagation();
          onZoomOut();
        }}
        aria-label="Zoom out"
      >
        <ZoomOut className="size-4" />
      </Button>
    </div>
  );

  if (zoomOnly) {
    return (
      <div
        className={cn(
          'glass-surface pointer-events-auto rounded-xl border border-border/40 p-2 shadow-lg',
          className
        )}
        aria-label="Zoom controls"
      >
        {zoomButtons}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'glass-surface pointer-events-auto flex flex-col gap-2 rounded-xl border border-border/40 p-2 shadow-lg',
        className
      )}
      aria-label="Camera controls"
    >
      <div className="flex items-center gap-1">
        <div
          ref={padRef}
          className="relative touch-none select-none rounded-full border border-border/50 bg-muted/30"
          style={{ width: PAD_SIZE, height: PAD_SIZE }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endInteraction}
          onPointerCancel={endInteraction}
          role="slider"
          aria-label="Rotate board"
          aria-valuetext="Drag to rotate the board"
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="size-px rounded-full bg-border/80" />
            <div className="absolute h-px w-5 bg-border/40" />
            <div className="absolute h-5 w-px bg-border/40" />
          </div>
          <div
            className={cn(
              'pointer-events-none absolute top-1/2 left-1/2 rounded-full border border-border/60 bg-background/90 shadow-sm',
              isActive && 'border-primary/40 bg-primary/10'
            )}
            style={{
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
            }}
          />
        </div>

        {zoomButtons}
      </div>

      {onPresetSelect && (
        <CameraPresetButtons
          activePreset={activePreset ?? null}
          onPresetSelect={onPresetSelect}
          className="w-[calc(88px+4rem)]"
        />
      )}

      {sensitivity !== undefined && onSensitivityChange && (
        <RotationSensitivityControl
          compact
          sensitivity={sensitivity}
          onSensitivityChange={onSensitivityChange}
          className="w-[calc(88px+4rem)] px-0.5"
        />
      )}

      {translucency !== undefined && onTranslucencyChange && (
        <BoardTranslucencyControl
          compact
          translucency={translucency}
          onTranslucencyChange={onTranslucencyChange}
          className="w-[calc(88px+4rem)] px-0.5"
        />
      )}
    </div>
  );
}
