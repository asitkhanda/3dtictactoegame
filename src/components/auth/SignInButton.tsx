import { LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface SignInButtonProps {
  className?: string;
  label?: string;
}

export function SignInButton({ className, label = 'Sign in with Google' }: SignInButtonProps) {
  const { signInWithGoogle, isConfigured } = useAuth();

  if (!isConfigured) return null;

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'font-body arcade-glass border-white/15 bg-white/5 hover:bg-white/10',
        className
      )}
      onClick={() => void signInWithGoogle()}
    >
      <LogIn className="size-4" />
      {label}
    </Button>
  );
}
