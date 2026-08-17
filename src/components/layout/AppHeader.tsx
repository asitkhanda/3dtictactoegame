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
        'chamfer-sm ui-control font-body inline-flex items-center gap-2 px-3 text-xs font-bold tracking-[0.08em] uppercase transition-[background-color,color]',
        location.pathname === to
          ? 'bg-[var(--neon-orange)] text-white'
          : 'text-[var(--arcade-fg)]/85 hover:bg-white/5 hover:text-[var(--arcade-fg)]'
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className={cn(to === '/leaderboard' && 'hidden sm:inline')}>{label}</span>
    </Link>
  );

  return (
    <header
      className={cn(
        'absolute top-3 right-3 left-3 z-30 flex items-center justify-between gap-2 sm:top-4 sm:right-6 sm:left-6',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {navLink('/', 'Play')}
        {navLink('/leaderboard', 'Leaderboard', <Trophy className="size-3.5" />)}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
            <span className="hidden sm:inline">@{profile.username}</span>
          </Link>
        ) : isConfigured && user ? (
          <Link
            to="/profile"
            className="font-body arcade-glass ui-control flex items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
          >
            <User className="size-3.5" />
            <span className="hidden sm:inline">Finish setup</span>
          </Link>
        ) : isConfigured ? (
          <SignInButton className="ui-control rounded-full px-3 text-xs" label="Sign in" />
        ) : null}
        <ThemeToggle className="arcade-glass size-9 rounded-full text-[var(--arcade-fg)]/85 hover:bg-white/10 hover:text-[var(--arcade-fg)]" />
      </div>
    </header>
  );
}
