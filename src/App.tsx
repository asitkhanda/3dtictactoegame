import React from 'react';
import { Agentation } from 'agentation';
import { GameBoard } from './components/GameBoard';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen w-full bg-background text-foreground antialiased">
        <GameBoard />
        <Toaster position="top-center" richColors />
        {import.meta.env.DEV && <Agentation />}
      </div>
    </TooltipProvider>
  );
}
