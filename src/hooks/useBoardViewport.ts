import { useCallback, useEffect, useRef } from 'react';

const INITIAL_ROTATION = { x: -25, y: 45 };
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

interface UseBoardViewportOptions {
  baseScale: number;
  is3D: boolean;
  enabled?: boolean;
  rotationSensitivity?: number;
}

export function useBoardViewport({
  baseScale,
  is3D,
  enabled = true,
  rotationSensitivity = 0.5,
}: UseBoardViewportOptions) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const rotationRef = useRef(INITIAL_ROTATION);
  const zoomRef = useRef(1);
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const rotationSensitivityRef = useRef(rotationSensitivity);

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

  const resetView = useCallback(() => {
    rotationRef.current = { ...INITIAL_ROTATION };
    zoomRef.current = 1;
    applyRotation();
    applyScale();
  }, [applyRotation, applyScale]);

  const applyRotationDelta = useCallback(
    (deltaX: number, deltaY: number) => {
      const factor = rotationSensitivityRef.current;
      rotationRef.current = {
        x: rotationRef.current.x - deltaY * factor,
        y: rotationRef.current.y + deltaX * factor,
      };
      scheduleApply();
    },
    [scheduleApply]
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
    zoomIn,
    zoomOut,
    rotateBy,
    viewportHandlers,
  };
}
