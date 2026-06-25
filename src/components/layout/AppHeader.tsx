import { Link, useLocation } from 'react-router-dom';
import { Trophy, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { SignInButton } from '../auth/SignInButton';
import { ThemeToggle } from '../ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '../../lib/utils';

interface AppHeaderProps {
  className?: string;
}

export function AppHeader({ className }: AppHeaderProps) {
  const { user, profile, isConfigured } = useAuth();
  const location = useLocation();

  const navLink = (to: string, label: string, icon?: React.ReactNode) => (
    <Link
      to={to}
      className={cn(
        'font-body inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors',
        location.pathname === to
          ? 'bg-white/10 text-[var(--arcade-fg)] dark:text-white'
          : 'arcade-text-muted hover:bg-white/5 hover:text-[var(--arcade-fg)] dark:hover:text-white'
      )}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <header
      className={cn(
        'absolute top-4 right-4 left-4 z-30 flex items-center justify-between gap-3 sm:left-auto sm:max-w-none',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {navLink('/', 'Play')}
        {navLink('/leaderboard', 'Leaderboard', <Trophy className="size-3.5" />)}
      </div>

      <div className="flex items-center gap-2">
        {isConfigured && user && profile?.username ? (
          <Link
            to="/profile"
            className={cn(
              'font-body arcade-glass flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-xs font-semibold transition-colors hover:bg-white/10',
              location.pathname === '/profile' && 'ring-1 ring-white/20'
            )}
          >
            <Avatar className="size-7">
              <AvatarImage src={profile.avatar_url ?? undefined} alt="" />
              <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>@{profile.username}</span>
          </Link>
        ) : isConfigured && user ? (
          <Link
            to="/profile"
            className="font-body arcade-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
          >
            <User className="size-3.5" />
            Finish setup
          </Link>
        ) : isConfigured ? (
          <SignInButton className="h-9 rounded-full px-3 text-xs" label="Sign in" />
        ) : null}
        <ThemeToggle className="arcade-glass size-9 rounded-full text-[var(--arcade-fg-muted)] hover:bg-white/10 hover:text-[var(--arcade-fg)] dark:hover:bg-white/10 dark:hover:text-white" />
      </div>
    </header>
  );
}
