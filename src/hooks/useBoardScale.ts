import { useEffect, useState } from 'react';

interface UseBoardScaleOptions {
  boardPx: number;
  is3D: boolean;
  layerCount: number;
  layerSpacing: number;
  hudHeight?: number;
  padding?: number;
}

export function useBoardScale({
  boardPx,
  is3D,
  layerCount,
  layerSpacing,
  hudHeight = 200,
  padding = 32,
}: UseBoardScaleOptions): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth - padding * 2;
      const vh = window.innerHeight - hudHeight - padding * 2;

      const widthScale = vw / boardPx;

      let heightNeeded = boardPx;
      if (is3D && layerCount > 1) {
        heightNeeded = boardPx + (layerCount - 1) * layerSpacing * 0.6;
      }

      const heightScale = vh / heightNeeded;
      setScale(Math.min(1, widthScale, heightScale));
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [boardPx, is3D, layerCount, layerSpacing, hudHeight, padding]);

  return scale;
}
