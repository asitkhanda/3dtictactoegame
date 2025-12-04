import React from 'react';
import { Cell } from './Cell';
import { BoardState } from '../utils/gameLogic';
import { cn } from '../lib/utils';

interface BoardLayerProps {
  layerIndex: number;
  board: BoardState;
  onCellClick: (index: number) => void;
  winningLine: number[] | null;
  disabled: boolean;
}

export function BoardLayer({ layerIndex, board, onCellClick, winningLine, disabled }: BoardLayerProps) {
  // Calculate indices for this layer (0..8 for layer 0, 9..17 for layer 1, etc.)
  const startIndex = layerIndex * 9;
  const cells = Array.from({ length: 9 }, (_, i) => {
    const globalIndex = startIndex + i;
    return {
      index: globalIndex,
      value: board[globalIndex],
      isWinning: winningLine?.includes(globalIndex) ?? false
    };
  });

  return (
    <div 
      className={cn(
        "absolute p-4 rounded-2xl transition-all duration-500",
        "bg-slate-900/40 backdrop-blur-sm border border-white/10",
        "shadow-[0_0_50px_rgba(0,0,0,0.3)]",
        // Dynamic border glow based on layer position/activity could be cool, but keep it clean for now
        "hover:border-white/20"
      )}
      style={{
        width: '300px', 
        height: '300px',
        transform: `translate(-50%, -50%) translateZ(${(layerIndex - 1) * 160}px)`, // Increased spacing slightly for better 3D view
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Decorative Glass Edge Highlight */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-white/5 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 rounded-2xl pointer-events-none" />

      {/* Corner Accents */}
      <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-white/30 rounded-tl-lg" />
      <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-white/30 rounded-tr-lg" />
      <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-white/30 rounded-bl-lg" />
      <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-white/30 rounded-br-lg" />

      {/* Layer Label floating off the side */}
      <div 
        className="absolute -left-16 top-1/2 -translate-y-1/2 flex items-center gap-2 -rotate-90 pointer-events-none select-none opacity-60"
      >
        <div className="w-8 h-px bg-white/30" />
        <span className="font-mono text-xs text-white/60 tracking-widest font-bold">LAYER {layerIndex + 1}</span>
      </div>

      {/* Grid Container */}
      <div className="grid grid-cols-3 gap-3 w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        {cells.map((cell) => (
          <Cell
            key={cell.index}
            value={cell.value}
            onClick={() => onCellClick(cell.index)}
            isWinningCell={cell.isWinning}
            disabled={disabled || cell.value !== null}
          />
        ))}
      </div>
    </div>
  );
}
