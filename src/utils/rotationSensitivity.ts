export const ROTATION_SENSITIVITY_STORAGE_KEY = '3dttt-rotation-sensitivity';

export const MIN_ROTATION_SENSITIVITY = 1;
export const DEFAULT_ROTATION_SENSITIVITY = 5;
export const MAX_ROTATION_SENSITIVITY = 20;

/** Maps slider value (1–20) to degrees-per-pixel multiplier. 5 ≈ original feel (0.5). */
export function sensitivityToMultiplier(value: number): number {
  return value * 0.1;
}

export function clampRotationSensitivity(value: number): number {
  return Math.min(MAX_ROTATION_SENSITIVITY, Math.max(MIN_ROTATION_SENSITIVITY, value));
}

export function readStoredRotationSensitivity(): number {
  try {
    const stored = localStorage.getItem(ROTATION_SENSITIVITY_STORAGE_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) {
        return clampRotationSensitivity(parsed);
      }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_ROTATION_SENSITIVITY;
}

export function writeStoredRotationSensitivity(value: number): void {
  try {
    localStorage.setItem(ROTATION_SENSITIVITY_STORAGE_KEY, String(clampRotationSensitivity(value)));
  } catch {
    /* ignore */
  }
}

export function getRotationSensitivityLabel(value: number): string {
  if (value <= 3) return 'Precise';
  if (value <= 7) return 'Balanced';
  if (value <= 13) return 'Responsive';
  return 'Fast';
}
