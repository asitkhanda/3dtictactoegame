import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import {
  KONAMI_SEQUENCE,
  KONAMI_STORAGE_KEY,
  getKonamiSwipeStep,
} from '../utils/gameConfig';

const KONAMI_SWIPE_THRESHOLD = 40;

function showKonamiUnlockToast() {
  toast('Secret sizes unlocked.', {
    description: 'Secret boards unlocked — 1×1 through 8×8.',
    icon: <Sparkles className="size-4 text-violet-400" />,
  });
}

export function useKonamiUnlock() {
  const [konamiUnlocked, setKonamiUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(KONAMI_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const konamiIndexRef = useRef(0);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const advanceKonami = useCallback((code: string) => {
    if (konamiUnlocked) return;

    const expected = KONAMI_SEQUENCE[konamiIndexRef.current];
    if (code === expected) {
      const next = konamiIndexRef.current + 1;
      if (next === KONAMI_SEQUENCE.length) {
        konamiIndexRef.current = 0;
        setKonamiUnlocked(true);
        try {
          sessionStorage.setItem(KONAMI_STORAGE_KEY, '1');
        } catch {
          /* ignore */
        }
        showKonamiUnlockToast();
      } else {
        konamiIndexRef.current = next;
      }
      return;
    }

    if (code === KONAMI_SEQUENCE[0]) {
      konamiIndexRef.current = 1;
      return;
    }

    konamiIndexRef.current = 0;
  }, [konamiUnlocked]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      advanceKonami(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceKonami]);

  const handleKonamiTouchStart = useCallback(
    (e: TouchEvent) => {
      if (konamiUnlocked) return;
      const touch = e.touches[0];
      if (!touch) return;
      swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
    },
    [konamiUnlocked]
  );

  const handleKonamiTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (konamiUnlocked || !swipeStartRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - swipeStartRef.current.x;
      const deltaY = touch.clientY - swipeStartRef.current.y;
      swipeStartRef.current = null;

      const step = getKonamiSwipeStep(deltaX, deltaY, KONAMI_SWIPE_THRESHOLD);
      if (step) advanceKonami(step);
    },
    [advanceKonami, konamiUnlocked]
  );

  const handleKonamiButtonTap = useCallback(
    (code: 'KeyB' | 'KeyA') => {
      advanceKonami(code);
    },
    [advanceKonami]
  );

  return {
    konamiUnlocked,
    handleKonamiTouchStart,
    handleKonamiTouchEnd,
    handleKonamiButtonTap,
  };
}
