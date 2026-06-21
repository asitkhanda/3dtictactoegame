import { useCallback, useState } from 'react';
import {
  clampRotationSensitivity,
  DEFAULT_ROTATION_SENSITIVITY,
  readStoredRotationSensitivity,
  sensitivityToMultiplier,
  writeStoredRotationSensitivity,
} from '../utils/rotationSensitivity';

export function useRotationSensitivity() {
  const [sensitivity, setSensitivityState] = useState(readStoredRotationSensitivity);

  const setSensitivity = useCallback((value: number) => {
    const clamped = clampRotationSensitivity(value);
    setSensitivityState(clamped);
    writeStoredRotationSensitivity(clamped);
  }, []);

  return {
    sensitivity,
    setSensitivity,
    rotationMultiplier: sensitivityToMultiplier(sensitivity),
    defaultSensitivity: DEFAULT_ROTATION_SENSITIVITY,
  };
}
