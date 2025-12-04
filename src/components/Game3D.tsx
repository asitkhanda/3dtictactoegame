import React, { useState, useRef, useEffect } from 'react';
import { checkLayerWinner, checkCrossLayerWinner, isDraw, BoardState, getComputerMove } from '../utils/gameLogic';
import { BoardLayer } from './BoardLayer';
import { Button } from './ui/button';
import { RotateCcw, Trophy, MousePointer2, Users, Bot, MonitorSmartphone, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const INITIAL_ROTATION = { x: -25, y: 45 };

type LayerResult = { winner: 'X' | 'O' | null, line: number[] | null };
type GameMode = 'PVP' | 'PVE' | null;

export function Game3D() {
  // Game State
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [board, setBoard] = useState<BoardState>(Array(27).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  
  // Track winner for each layer
  const [layerWinners, setLayerWinners] = useState<LayerResult[]>([
    { winner: null, line: null },
    { winner: null, line: null },
    { winner: null, line: null }
  ]);

  // New state for cross-layer winner
  const [crossLayerWinningLine, setCrossLayerWinningLine] = useState<number[] | null>(null);

  const [winner, setWinner] = useState<'X' | 'O' | null>(null);
  const [draw, setDraw] = useState(false);

  // 3D View State
  const [rotation, setRotation] = useState(INITIAL_ROTATION);
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef<{ x: number, y: number } | null>(null);

  // Helper to execute a move
  const makeMove = (index: number) => {
    const layerIndex = Math.floor(index / 9);

    // Validation: cell taken, game over, or layer already won
    if (board[index] || winner || draw || layerWinners[layerIndex].winner) return;

    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);

    // 1. Check for INSTANT WIN (Cross-Layer)
    const crossLayerResult = checkCrossLayerWinner(newBoard);
    if (crossLayerResult.winner) {
        setWinner(crossLayerResult.winner);
        setCrossLayerWinningLine(crossLayerResult.line);
        return; // Instant win!
    }

    // 2. Check if this move won the layer
    const layerResult = checkLayerWinner(newBoard, layerIndex);
    const newLayerWinners = [...layerWinners];
    
    if (layerResult.winner) {
      newLayerWinners[layerIndex] = layerResult;
      setLayerWinners(newLayerWinners);
    }

    // 3. Check Match Win Condition: 2 out of 3 layers
    const xWins = newLayerWinners.filter(l => l.winner === 'X').length;
    const oWins = newLayerWinners.filter(l => l.winner === 'O').length;

    if (xWins >= 2) {
      setWinner('X');
    } else if (oWins >= 2) {
      setWinner('O');
    } else if (isDraw(newBoard)) {
      setDraw(true);
    } else {
      setIsXNext(!isXNext);
    }
  };

  // AI Turn Handler
  useEffect(() => {
    if (gameMode === 'PVE' && !isXNext && !winner && !draw) {
      const timer = setTimeout(() => {
        const moveIndex = getComputerMove(board, layerWinners);
        if (moveIndex !== -1) {
          makeMove(moveIndex);
        }
      }, 750); // Small delay for "thinking" feel
      return () => clearTimeout(timer);
    }
  }, [gameMode, isXNext, winner, draw, board, layerWinners]);

  // User Interaction Handler
  const handleCellClick = (index: number) => {
    // Prevent user from playing during AI turn
    if (gameMode === 'PVE' && !isXNext) return;
    
    makeMove(index);
  };

  const resetGame = () => {
    setBoard(Array(27).fill(null));
    setIsXNext(true);
    setWinner(null);
    setLayerWinners([
      { winner: null, line: null },
      { winner: null, line: null },
      { winner: null, line: null }
    ]);
    setCrossLayerWinningLine(null);
    setDraw(false);
  };

  const exitToMenu = () => {
    setGameMode(null);
    resetGame();
  };

  const resetView = () => {
    setRotation(INITIAL_ROTATION);
  };

  // Mouse/Touch Event Handlers for Rotation
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !lastMousePos.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const deltaX = clientX - lastMousePos.current.x;
    const deltaY = clientY - lastMousePos.current.y;

    setRotation(prev => ({
      x: prev.x - deltaY * 0.5, 
      y: prev.y + deltaX * 0.5 
    }));

    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    lastMousePos.current = null;
  };

  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (isDragging) e.preventDefault();
    };
    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => document.removeEventListener('touchmove', preventDefault);
  }, [isDragging]);

  // Calculate score
  const xScore = layerWinners.filter(l => l.winner === 'X').length;
  const oScore = layerWinners.filter(l => l.winner === 'O').length;

  // Derived state for UI Highlighting
  // If game is over, only highlight the winner. If game is active, highlight the current turn.
  const isGameActive = !winner && !draw;
  const isXActive = winner === 'X' || (isGameActive && isXNext);
  const isOActive = winner === 'O' || (isGameActive && !isXNext);

  // MAIN MENU
  if (!gameMode) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center text-white">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="max-w-md w-full bg-slate-900/90 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden text-center"
        >
          {/* Decorative background gradients */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-purple-500 to-purple-500" />
          <div className="absolute -top-[100px] -left-[100px] w-[200px] h-[200px] bg-orange-500/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-[100px] -right-[100px] w-[200px] h-[200px] bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <div className="mb-10">
              <h1 className="text-7xl font-black tracking-tighter mb-1 text-white drop-shadow-lg">
                3D
              </h1>
              <h2 className="text-3xl font-bold tracking-[0.2em] text-slate-400 uppercase">
                Tic Tac Toe
              </h2>
              <div className="mt-4 text-xs font-mono text-slate-500 bg-slate-800/50 inline-block px-3 py-1 rounded-full border border-white/5">
                SPATIAL STRATEGY GAME
              </div>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => setGameMode('PVE')}
                className="w-full group relative overflow-hidden bg-slate-800/50 hover:bg-orange-950/20 border border-white/5 hover:border-orange-500/30 p-1 rounded-2xl transition-all duration-300 active:scale-95"
              >
                <div className="relative flex items-center p-4 bg-slate-900/80 rounded-xl gap-4 group-hover:bg-slate-900/60 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-white group-hover:text-orange-300 transition-colors">Single Player</div>
                    <div className="text-xs text-slate-500 font-medium">Vs. Strategic AI</div>
                  </div>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                    <MonitorSmartphone className="w-5 h-5 text-orange-400" />
                  </div>
                </div>
              </button>

              <button 
                onClick={() => setGameMode('PVP')}
                className="w-full group relative overflow-hidden bg-slate-800/50 hover:bg-purple-950/20 border border-white/5 hover:border-purple-500/30 p-1 rounded-2xl transition-all duration-300 active:scale-95"
              >
                <div className="relative flex items-center p-4 bg-slate-900/80 rounded-xl gap-4 group-hover:bg-slate-900/60 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">Two Player</div>
                    <div className="text-xs text-slate-500 font-medium">Local Match</div>
                  </div>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                     <User className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-8 space-y-3">
               <div className="flex items-center gap-3 opacity-50">
                   <div className="h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent flex-1" />
                   <span className="text-[10px] font-mono text-slate-500 uppercase">HOW TO WIN</span>
                   <div className="h-px bg-gradient-to-r from-transparent via-slate-500 to-transparent flex-1" />
               </div>
               
               <div className="grid grid-cols-2 gap-3 text-[11px] font-medium text-slate-400">
                  <div className="flex flex-col items-center justify-center bg-slate-800/40 p-3 rounded-xl border border-white/5 text-center gap-1">
                    <span className="text-white font-bold">Match Win</span>
                    <span className="text-[10px] text-slate-500">Win 2 of 3 Boards</span>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-slate-800/40 p-3 rounded-xl border border-white/5 text-center gap-1">
                    <span className="text-white font-bold">Instant Win</span>
                    <span className="text-[10px] text-slate-500">Form a 3D Line</span>
                  </div>
               </div>
            </div>
          </div>
        </motion.div>

        <div className="absolute bottom-6 text-slate-600 text-xs font-medium tracking-wide">
            Made with curiosity by <a href="https://asit.design" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-orange-400 transition-colors">Asit Khanda</a>
        </div>
      </div>
    );
  }

  // GAME VIEW
  return (
    <div 
      className="relative w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col items-center justify-center"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
    >
      {/* HUD */}
      <div className="absolute top-4 left-0 right-0 z-50 flex flex-col items-center pointer-events-none">
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-2xl md:text-4xl font-black text-white tracking-tighter mb-2 drop-shadow-lg select-none"
        >
          3D TIC TAC TOE
        </motion.h1>
        
        <div className="flex items-center gap-4 pointer-events-auto">
          <Button variant="ghost" size="icon" onClick={exitToMenu} className="text-white/50 hover:text-white hover:bg-white/10" title="Exit to Menu">
            <RotateCcw className="w-4 h-4 rotate-180" />
          </Button>

          <div className="bg-slate-950 border-4 border-slate-800 rounded-xl shadow-2xl flex items-stretch overflow-hidden min-w-[280px] md:min-w-[340px] relative group">
            {/* Gloss Effect */}
            <div className="absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-10" />
            
            {/* Player X Section */}
            <div className={cn(
              "flex-1 flex flex-col items-center justify-center p-3 md:p-4 transition-colors duration-300 relative",
              isXActive ? "bg-orange-950/30" : "bg-transparent"
            )}>
               {/* Active Indicator Dot */}
               <div className={cn(
                "absolute top-2 left-2 w-2 h-2 rounded-full transition-all duration-300",
                isXActive ? "bg-orange-500 shadow-[0_0_8px_#f97316]" : "bg-slate-800"
              )} />
              
              <span className="text-[10px] md:text-xs font-black tracking-[0.2em] text-slate-500 uppercase mb-1 truncate max-w-full px-1">
                {gameMode === 'PVE' ? 'YOU' : 'PLAYER X'}
              </span>
              <div className="text-4xl md:text-6xl font-mono font-bold tabular-nums text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)] leading-none">
                {xScore}
              </div>
            </div>

            {/* Divider */}
            <div className="w-0.5 bg-slate-800 relative z-20">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-slate-900 border-2 border-slate-800 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-[8px] font-black text-slate-600 select-none">VS</span>
              </div>
            </div>

            {/* Player O Section */}
            <div className={cn(
              "flex-1 flex flex-col items-center justify-center p-3 md:p-4 transition-colors duration-300 relative",
              isOActive ? "bg-purple-950/30" : "bg-transparent"
            )}>
               {/* Active Indicator Dot */}
               <div className={cn(
                "absolute top-2 right-2 w-2 h-2 rounded-full transition-all duration-300",
                isOActive ? "bg-purple-500 shadow-[0_0_8px_#a855f7]" : "bg-slate-800"
              )} />

              <span className="text-[10px] md:text-xs font-black tracking-[0.2em] text-slate-500 uppercase mb-1 truncate max-w-full px-1">
                {gameMode === 'PVE' ? 'AI' : 'PLAYER O'}
              </span>
              <div className="text-4xl md:text-6xl font-mono font-bold tabular-nums text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] leading-none">
                {oScore}
              </div>
            </div>
          </div>

          <Button variant="secondary" size="icon" onClick={resetView} title="Reset View">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <AnimatePresence>
          {winner && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="mt-4 bg-yellow-500/20 backdrop-blur-lg border border-yellow-500/50 text-yellow-200 px-8 py-4 rounded-xl shadow-2xl flex items-center gap-3 pointer-events-auto"
            >
              <Trophy className="w-8 h-8 text-yellow-400" />
              <div className="text-2xl font-bold">
                {winner === 'X' && gameMode === 'PVE' ? 'YOU WIN!' : 
                 winner === 'O' && gameMode === 'PVE' ? 'AI WINS!' : 
                 `${winner} WINS THE MATCH!`}
              </div>
              <Button variant="default" className="ml-4 bg-yellow-500 hover:bg-yellow-600 text-black border-none" onClick={resetGame}>
                Play Again
              </Button>
            </motion.div>
          )}
          
          {draw && !winner && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="mt-4 bg-slate-700/50 backdrop-blur-lg border border-white/20 text-white px-8 py-4 rounded-xl shadow-2xl flex items-center gap-3 pointer-events-auto"
            >
              <div className="text-2xl font-bold">BOTH OF YOU WIN!</div>
              <Button variant="secondary" onClick={resetGame}>
                Play Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Instructions */}
      {!winner && !draw && (
        <div className="absolute bottom-8 flex flex-col items-center gap-2 text-white/30 font-mono text-sm pointer-events-none animate-pulse">
            <div>WIN 2 BOARDS OR FORM A 3D LINE TO WIN</div>
            <div className="flex items-center gap-2">
                <MousePointer2 className="w-4 h-4" />
                DRAG TO ROTATE VIEW
            </div>
        </div>
      )}

      {/* 3D Scene */}
      <div 
        className="w-full h-full flex items-center justify-center perspective-container"
        style={{ perspective: '1200px' }}
      >
        <motion.div
          className="relative w-0 h-0"
          style={{
            transformStyle: 'preserve-3d',
            rotateX: rotation.x,
            rotateY: rotation.y,
          }}
          transition={{ type: 'spring', stiffness: 100, damping: 30, mass: 1 }} // Smooth rotation if controlled via non-drag
        >
          {/* The 3 Layers */}
          {[0, 1, 2].map((i) => (
            <BoardLayer
              key={i}
              layerIndex={i}
              board={board}
              onCellClick={handleCellClick}
              winningLine={crossLayerWinningLine || layerWinners[i].line}
              disabled={!!winner || draw || !!layerWinners[i].winner || (gameMode === 'PVE' && !isXNext)}
            />
          ))}

        </motion.div>
      </div>
    </div>
  );
}
