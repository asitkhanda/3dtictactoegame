import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CAMERA_PRESETS,
  PRESET_TRANSITION_MS,
  type CameraPresetId,
} from '../utils/cameraPresets';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

// Pixels of movement before a pointer-down is treated as a rotation drag
// instead of a tap on a cell.
const DRAG_THRESHOLD_PX = 8;
// Wheel deltaY → zoom factor exponents. Trackpad pinch (ctrlKey) reports
// smaller deltas, so it gets a stronger factor.
const WHEEL_ZOOM_FACTOR = 0.0022;
const PINCH_WHEEL_ZOOM_FACTOR = 0.01;
// Momentum: exponential decay time constant and cutoffs (px/ms).
const MOMENTUM_DECAY_MS = 220;
const MOMENTUM_START_SPEED = 0.08;
const MOMENTUM_STOP_SPEED = 0.02;
// A fling only counts if the pointer was still moving just before release.
const MOMENTUM_MAX_IDLE_MS = 80;

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

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  dragging: boolean;
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
  const targetZoomRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const rotationSensitivityRef = useRef(rotationSensitivity);
  const transitionRafRef = useRef<number | null>(null);
  const zoomRafRef = useRef<number | null>(null);
  const momentumRafRef = useRef<number | null>(null);

  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const dragRef = useRef<DragState | null>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const velocityRef = useRef({ vx: 0, vy: 0, lastMoveAt: 0 });
  const suppressClickRef = useRef(false);

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

  const cancelTransition = useCallback(() => {
    if (transitionRafRef.current !== null) {
      cancelAnimationFrame(transitionRafRef.current);
      transitionRafRef.current = null;
    }
  }, []);

  const cancelMomentum = useCallback(() => {
    if (momentumRafRef.current !== null) {
      cancelAnimationFrame(momentumRafRef.current);
      momentumRafRef.current = null;
    }
  }, []);

  const cancelZoomAnimation = useCallback(() => {
    if (zoomRafRef.current !== null) {
      cancelAnimationFrame(zoomRafRef.current);
      zoomRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (transitionRafRef.current !== null) cancelAnimationFrame(transitionRafRef.current);
      if (zoomRafRef.current !== null) cancelAnimationFrame(zoomRafRef.current);
      if (momentumRafRef.current !== null) cancelAnimationFrame(momentumRafRef.current);
    };
  }, []);

  const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

  const setZoom = useCallback(
    (next: number) => {
      zoomRef.current = clampZoom(next);
      targetZoomRef.current = zoomRef.current;
      applyScale();
    },
    [applyScale]
  );

  // Eases the applied zoom toward targetZoomRef; wheel events just move the
  // target, which keeps trackpads and notched wheels equally smooth.
  const startZoomAnimation = useCallback(() => {
    if (zoomRafRef.current !== null) return;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(64, now - lastTime);
      lastTime = now;
      const diff = targetZoomRef.current - zoomRef.current;

      if (Math.abs(diff) < 0.001) {
        zoomRef.current = targetZoomRef.current;
        applyScale();
        zoomRafRef.current = null;
        return;
      }

      zoomRef.current += diff * Math.min(1, dt * 0.012);
      applyScale();
      zoomRafRef.current = requestAnimationFrame(step);
    };

    zoomRafRef.current = requestAnimationFrame(step);
  }, [applyScale]);

  const zoomToward = useCallback(
    (target: number) => {
      targetZoomRef.current = clampZoom(target);
      startZoomAnimation();
    },
    [startZoomAnimation]
  );

  const zoomIn = useCallback(() => {
    zoomToward(targetZoomRef.current + ZOOM_STEP);
  }, [zoomToward]);

  const zoomOut = useCallback(() => {
    zoomToward(targetZoomRef.current - ZOOM_STEP);
  }, [zoomToward]);

  const setView = useCallback(
    (presetId: CameraPresetId, options?: { resetZoom?: boolean }) => {
      const preset = CAMERA_PRESETS[presetId];
      if (!preset) return;

      cancelTransition();
      cancelMomentum();
      cancelZoomAnimation();

      const start = { ...rotationRef.current };
      const target = { ...preset.rotation };
      const startZoom = zoomRef.current;
      const resetZoom = options?.resetZoom !== false && presetId === 'default';
      const targetZoom = resetZoom ? 1 : zoomRef.current;
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

        if (resetZoom) {
          zoomRef.current = lerp(startZoom, targetZoom, eased);
          targetZoomRef.current = zoomRef.current;
        }

        applyRotation();
        applyScale();

        if (t < 1) {
          transitionRafRef.current = requestAnimationFrame(animate);
        } else {
          rotationRef.current = { ...target };
          if (resetZoom) {
            zoomRef.current = targetZoom;
            targetZoomRef.current = targetZoom;
          }
          applyRotation();
          applyScale();
          transitionRafRef.current = null;
        }
      };

      transitionRafRef.current = requestAnimationFrame(animate);
    },
    [applyRotation, applyScale, cancelTransition, cancelMomentum, cancelZoomAnimation]
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
      cancelMomentum();
      applyRotationDelta(deltaX, deltaY);
    },
    [enabled, is3D, applyRotationDelta, cancelMomentum]
  );

  const startMomentum = useCallback(() => {
    const { vx, vy, lastMoveAt } = velocityRef.current;
    if (performance.now() - lastMoveAt > MOMENTUM_MAX_IDLE_MS) return;
    if (Math.hypot(vx, vy) < MOMENTUM_START_SPEED) return;

    let velocityX = vx;
    let velocityY = vy;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(64, now - lastTime);
      lastTime = now;

      applyRotationDelta(velocityX * dt, velocityY * dt);

      const decay = Math.exp(-dt / MOMENTUM_DECAY_MS);
      velocityX *= decay;
      velocityY *= decay;

      if (Math.hypot(velocityX, velocityY) < MOMENTUM_STOP_SPEED) {
        momentumRafRef.current = null;
        return;
      }
      momentumRafRef.current = requestAnimationFrame(step);
    };

    momentumRafRef.current = requestAnimationFrame(step);
  }, [applyRotationDelta]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!enabled) return;
      e.preventDefault();
      if (pinchRef.current) return;
      const factor = e.ctrlKey ? PINCH_WHEEL_ZOOM_FACTOR : WHEEL_ZOOM_FACTOR;
      zoomToward(targetZoomRef.current * Math.exp(-e.deltaY * factor));
    },
    [enabled, zoomToward]
  );

  const getPinchDistance = () => {
    const points = [...pointersRef.current.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cancelMomentum();

      if (pointersRef.current.size === 2) {
        // Second finger down: switch from (potential) rotation to pinch.
        dragRef.current = null;
        suppressClickRef.current = true;
        cancelZoomAnimation();
        pinchRef.current = {
          distance: getPinchDistance(),
          zoom: zoomRef.current,
        };
        return;
      }

      if (pointersRef.current.size === 1) {
        // Track from anywhere — including cells. Below the drag threshold
        // this stays a tap and the cell's click fires normally.
        dragRef.current = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          lastX: e.clientX,
          lastY: e.clientY,
          dragging: false,
        };
        velocityRef.current = { vx: 0, vy: 0, lastMoveAt: performance.now() };
      }
    },
    [enabled, cancelMomentum, cancelZoomAnimation]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      const tracked = pointersRef.current.get(e.pointerId);
      if (!tracked) return;

      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinchRef.current && pointersRef.current.size >= 2) {
        const distance = getPinchDistance();
        if (pinchRef.current.distance > 0 && distance > 0) {
          setZoom(pinchRef.current.zoom * (distance / pinchRef.current.distance));
        }
        return;
      }

      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId || !is3D) return;

      if (!drag.dragging) {
        const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
        if (moved < DRAG_THRESHOLD_PX) return;
        drag.dragging = true;
        suppressClickRef.current = true;
        viewportRef.current?.setPointerCapture(e.pointerId);
      }

      const now = performance.now();
      const deltaX = e.clientX - drag.lastX;
      const deltaY = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;

      const dt = Math.max(1, now - velocityRef.current.lastMoveAt);
      const alpha = 0.25;
      velocityRef.current = {
        vx: velocityRef.current.vx * (1 - alpha) + (deltaX / dt) * alpha,
        vy: velocityRef.current.vy * (1 - alpha) + (deltaY / dt) * alpha,
        lastMoveAt: now,
      };

      applyRotationDelta(deltaX, deltaY);
    },
    [enabled, is3D, applyRotationDelta, setZoom]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      try {
        viewportRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // pointer may already be released
      }

      if (pinchRef.current && pointersRef.current.size === 1) {
        // Pinch → single finger: resume rotating without lifting.
        pinchRef.current = null;
        const [pointerId] = pointersRef.current.keys();
        const remaining = pointersRef.current.get(pointerId)!;
        dragRef.current = {
          pointerId,
          startX: remaining.x,
          startY: remaining.y,
          lastX: remaining.x,
          lastY: remaining.y,
          dragging: true,
        };
        velocityRef.current = { vx: 0, vy: 0, lastMoveAt: performance.now() };
        return;
      }

      if (pointersRef.current.size === 0) {
        pinchRef.current = null;
        if (dragRef.current?.dragging) {
          startMomentum();
        }
        dragRef.current = null;
      }
    },
    [startMomentum]
  );

  // A drag that rotated the board must not also place a piece: cells are
  // buttons and their click fires on release, so swallow it in capture phase.
  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
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
        onClickCapture: handleClickCapture,
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
