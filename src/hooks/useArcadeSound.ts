import { useCallback, useState } from 'react';
import {
  type ArcadeSoundName,
  isSoundMuted,
  playArcadeSound,
  setSoundMuted,
} from '../utils/arcadeSound';

export function useArcadeSound() {
  const [muted, setMuted] = useState(isSoundMuted);

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      setSoundMuted(next);
      if (!next) playArcadeSound('tap');
      return next;
    });
  }, []);

  const play = useCallback((name: ArcadeSoundName) => {
    playArcadeSound(name);
  }, []);

  return { muted, toggleMuted, play };
}
