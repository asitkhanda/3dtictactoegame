import { useCallback, useState } from 'react';
import {
  clampBoardTranslucency,
  DEFAULT_BOARD_TRANSLUCENCY,
  readStoredBoardTranslucency,
  writeStoredBoardTranslucency,
} from '../utils/boardTranslucency';

export function useBoardTranslucency() {
  const [translucency, setTranslucencyState] = useState(readStoredBoardTranslucency);

  const setTranslucency = useCallback((value: number) => {
    const clamped = clampBoardTranslucency(value);
    setTranslucencyState(clamped);
    writeStoredBoardTranslucency(clamped);
  }, []);

  return {
    translucency,
    setTranslucency,
    defaultTranslucency: DEFAULT_BOARD_TRANSLUCENCY,
  };
}
