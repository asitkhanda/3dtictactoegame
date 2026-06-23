import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CAMERA_PRESETS,
  PRESET_TRANSITION_MS,
  type CameraPresetId,
} from '../utils/cameraPresets';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

interface UseBoardViewportOptions {
  baseScale: number;
  is3D: boolean;
  enabled?: boolean;
  rotationSensitivity?: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useBoardViewport({
  baseScale,
  is3D,
  enabled = true,
  rotationSensitivity = 0.5,
}: UseBoardViewportOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const rotationRef = useRef(CAMERA_PRESETS.default.rotation);
  const zoomRef = useRef(1);
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const rotationSensitivityRef = useRef(rotationSensitivity);
  const transitionRafRef = useRef<number | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPresetId | null>('default');

  useEffect(() => {
    rotationSensitivityRef.current = rotationSensitivity;
  }, [rotationSensitivity]);

  const applyScale = useCallback(() => {
    if (viewportRef.current) {
      viewportRef.current.style.transform = `scale(${baseScale * zoomRef.current})`;
    }
  }, [baseScale]);

  const applyRotation = useCallback(() => {
    if (boardRef.current) {
      const { x, y } = rotationRef.current;
      boardRef.current.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
    }
  }, []);

  const scheduleApply = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      applyRotation();
      applyScale();
      rafRef.current = null;
    });
  }, [applyRotation, applyScale]);

  useEffect(() => {
    applyScale();
  }, [applyScale]);

  useEffect(() => {
    applyRotation();
  }, [applyRotation]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (transitionRafRef.current !== null) cancelAnimationFrame(transitionRafRef.current);
    };
  }, []);

  const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

  const setZoom = useCallback(
    (next: number) => {
      zoomRef.current = clampZoom(next);
      applyScale();
    },
    [applyScale]
  );

  const zoomIn = useCallback(() => {
    setZoom(zoomRef.current + ZOOM_STEP);
  }, [setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(zoomRef.current - ZOOM_STEP);
  }, [setZoom]);

  const cancelTransition = useCallback(() => {
    if (transitionRafRef.current !== null) {
      cancelAnimationFrame(transitionRafRef.current);
      transitionRafRef.current = null;
    }
  }, []);

  const setView = useCallback(
    (presetId: CameraPresetId, options?: { resetZoom?: boolean }) => {
      const preset = CAMERA_PRESETS[presetId];
      if (!preset) return;

      cancelTransition();

      const start = { ...rotationRef.current };
      const target = { ...preset.rotation };
      const startZoom = zoomRef.current;
      const targetZoom = options?.resetZoom !== false && presetId === 'default' ? 1 : zoomRef.current;
      const startTime = performance.now();

      setActivePreset(presetId);

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / PRESET_TRANSITION_MS);
        const eased = easeOutCubic(t);

        rotationRef.current = {
          x: lerp(start.x, target.x, eased),
          y: lerp(start.y, target.y, eased),
        };

        if (options?.resetZoom !== false && presetId === 'default') {
          zoomRef.current = lerp(startZoom, targetZoom, eased);
        }

        applyRotation();
        applyScale();

        if (t < 1) {
          transitionRafRef.current = requestAnimationFrame(animate);
        } else {
          rotationRef.current = { ...target };
          if (options?.resetZoom !== false && presetId === 'default') {
            zoomRef.current = targetZoom;
          }
          applyRotation();
          applyScale();
          transitionRafRef.current = null;
        }
      };

      transitionRafRef.current = requestAnimationFrame(animate);
    },
    [applyRotation, applyScale, cancelTransition]
  );

  const resetView = useCallback(() => {
    setView('default');
  }, [setView]);

  const clearActivePreset = useCallback(() => {
    setActivePreset(null);
  }, []);

  const applyRotationDelta = useCallback(
    (deltaX: number, deltaY: number) => {
      cancelTransition();
      clearActivePreset();
      const factor = rotationSensitivityRef.current;
      rotationRef.current = {
        x: rotationRef.current.x - deltaY * factor,
        y: rotationRef.current.y + deltaX * factor,
      };
      scheduleApply();
    },
    [scheduleApply, cancelTransition, clearActivePreset]
  );

  const rotateBy = useCallback(
    (deltaX: number, deltaY: number) => {
      if (!enabled || !is3D) return;
      applyRotationDelta(deltaX, deltaY);
    },
    [enabled, is3D, applyRotationDelta]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!enabled) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom(zoomRef.current + delta);
    },
    [enabled, setZoom]
  );

  const getTouchDistance = (touches: TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !is3D) return;
      if ((e.target as HTMLElement).closest('button')) return;

      isDraggingRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [enabled, is3D]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || !is3D || !isDraggingRef.current || !lastPointerRef.current) return;

      const deltaX = e.clientX - lastPointerRef.current.x;
      const deltaY = e.clientY - lastPointerRef.current.y;
      applyRotationDelta(deltaX, deltaY);
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    },
    [enabled, is3D, applyRotationDelta]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    lastPointerRef.current = null;
    pinchRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // pointer may already be released
    }
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const el = e.currentTarget as HTMLElement;
      el.setAttribute('data-touch-count', String(e.touches.length));

      if (e.touches.length === 2) {
        isDraggingRef.current = false;
        lastPointerRef.current = null;
        pinchRef.current = {
          distance: getTouchDistance(e.touches),
          zoom: zoomRef.current,
        };
      }
    },
    [enabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled) return;
      const el = e.currentTarget as HTMLElement;
      el.setAttribute('data-touch-count', String(e.touches.length));

      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const distance = getTouchDistance(e.touches);
        const ratio = distance / pinchRef.current.distance;
        setZoom(pinchRef.current.zoom * ratio);
      }
    },
    [enabled, setZoom]
  );

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.setAttribute('data-touch-count', String(e.touches.length));

    if (e.touches.length < 2) {
      pinchRef.current = null;
    }
    if (e.touches.length === 0) {
      isDraggingRef.current = false;
      lastPointerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !enabled) return;

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [enabled, handleWheel]);

  const viewportHandlers = enabled
    ? {
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerUp,
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
      }
    : {};

  return {
    viewportRef,
    boardRef,
    resetView,
    setView,
    activePreset,
    zoomIn,
    zoomOut,
    rotateBy,
    viewportHandlers,
  };
}
