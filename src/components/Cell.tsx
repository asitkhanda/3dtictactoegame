import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface CellProps {
  value: 'X' | 'O' | null;
  onClick: () => void;
  isWinningCell: boolean;
  disabled: boolean;
}

// Configuration for the 3D extrusion
const THICKNESS = 20; 
const LAYER_COUNT = 12; 
const LAYER_SPACING = THICKNESS / LAYER_COUNT; 

function PieceX({ isWinning }: { isWinning: boolean }) {
  // Side/Body Color (Orange)
  const bodyColor = isWinning 
    ? "bg-orange-400 shadow-[0_0_10px_#f97316]" 
    : "bg-orange-600";
    
  // Top Face Color (lighter Orange)
  const topColor = isWinning
    ? "bg-orange-100"
    : "bg-orange-400";

  const layers = Array.from({ length: LAYER_COUNT }, (_, i) => i * LAYER_SPACING);
  
  return (
    <motion.div 
        initial={{ scale: 0, z: 60, opacity: 0 }} // Drop from high up
        animate={{ scale: 1, z: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, mass: 1.2 }}
        className="relative w-12 h-12 pointer-events-none" 
        style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Drop Shadow on the tile surface */}
      <div 
        className="absolute inset-0 bg-black/60 blur-md rounded-full opacity-60" 
        style={{ transform: 'translateZ(0px) scale(0.9)' }} 
      />

      {/* The 3D Stack */}
      <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        {layers.map((z, i) => (
            <div key={i} className="absolute inset-0" style={{ transform: `translateZ(${z}px)` }}>
                {/* Cross Bar 1 */}
                <div className={cn(
                    "absolute top-1/2 left-1/2 w-[110%] h-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px]", 
                    bodyColor
                )} />
                {/* Cross Bar 2 */}
                <div className={cn(
                    "absolute top-1/2 left-1/2 w-[110%] h-3 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-[1px]", 
                    bodyColor
                )} />
            </div>
        ))}

        {/* Top Cap (The Face) */}
        <div className="absolute inset-0" style={{ transform: `translateZ(${THICKNESS}px)` }}>
             <div className={cn(
                "absolute top-1/2 left-1/2 w-[110%] h-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px] border border-white/20", 
                topColor,
                isWinning && "shadow-[0_0_20px_#f97316] border-white"
             )} />
             <div className={cn(
                "absolute top-1/2 left-1/2 w-[110%] h-3 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-[1px] border border-white/20", 
                topColor,
                isWinning && "shadow-[0_0_20px_#f97316] border-white"
             )} />
        </div>
      </div>
    </motion.div>
  );
}

function PieceO({ isWinning }: { isWinning: boolean }) {
  // Side/Body Color (Purple)
  const bodyColor = isWinning 
    ? "border-purple-400 shadow-[0_0_10px_#a855f7]" 
    : "border-purple-600";
    
  // Top Face Color (lighter Purple)
  const topColor = isWinning
    ? "border-purple-100"
    : "border-purple-400";

  const layers = Array.from({ length: LAYER_COUNT }, (_, i) => i * LAYER_SPACING);

  return (
    <motion.div 
        initial={{ scale: 0, z: 60, opacity: 0 }}
        animate={{ scale: 1, z: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, mass: 1.2 }}
        className="relative w-12 h-12 pointer-events-none" 
        style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Drop Shadow */}
      <div 
        className="absolute inset-0 bg-black/60 blur-md rounded-full opacity-60" 
        style={{ transform: 'translateZ(0px) scale(0.9)' }} 
      />

      {/* The 3D Stack */}
      <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        {layers.map((z, i) => (
            <div 
                key={i} 
                className={cn("absolute inset-0 rounded-full border-[6px]", bodyColor)}
                style={{ transform: `translateZ(${z}px)` }}
            />
        ))}

        {/* Top Cap */}
        <div 
            className={cn(
                "absolute inset-0 rounded-full border-[6px] border-white/20", 
                topColor,
                isWinning && "shadow-[0_0_20px_#a855f7] border-white"
            )}
            style={{ transform: `translateZ(${THICKNESS}px)` }}
        />
      </div>
    </motion.div>
  );
}

export function Cell({ value, onClick, isWinningCell, disabled }: CellProps) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "group relative w-20 h-20 flex items-center justify-center transition-all duration-300",
        // Base styling - darker glass tile
        "bg-slate-800/30 border border-white/5 rounded-lg", 
        // Hover states (only if empty)
        value === null && !disabled && "cursor-pointer hover:bg-white/10 hover:border-white/20 hover:translate-z-2",
        // Disabled/Default cursor
        disabled && !isWinningCell && "cursor-default",
        // Winning Cell Highlight (The tile itself lights up slightly)
        isWinningCell && value === 'X' && "bg-orange-500/10 border-orange-500/30",
        isWinningCell && value === 'O' && "bg-purple-500/10 border-purple-500/30"
      )}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Inner tile depth/sheen */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-lg pointer-events-none" />
      
      {/* Render the 3D Piece "Sitting" on the tile */}
      {value === 'X' && <PieceX isWinning={isWinningCell} />}
      {value === 'O' && <PieceO isWinning={isWinningCell} />}
    </div>
  );
}
