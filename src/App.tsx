import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Agentation } from 'agentation';
import { AuthProvider } from './contexts/AuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { UsernameOnboardingModal } from './components/auth/UsernameOnboardingModal';
import { Toaster } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider delayDuration={300}>
            <div className="min-h-screen w-full font-body bg-background text-foreground antialiased">
              <AppRoutes />
              <UsernameOnboardingModal />
              <Toaster position="top-center" richColors />
              {import.meta.env.DEV && <Agentation endpoint="http://localhost:4747" />}
            </div>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
