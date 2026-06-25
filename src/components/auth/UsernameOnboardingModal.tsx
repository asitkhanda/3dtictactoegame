import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export function UsernameOnboardingModal() {
  const { needsUsername, setUsername, checkUsernameAvailable } = useAuth();
  const [username, setUsernameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const open = needsUsername;

  useEffect(() => {
    if (!open) {
      setUsernameInput('');
      setError(null);
      setAvailable(null);
    }
  }, [open]);

  useEffect(() => {
    if (!USERNAME_PATTERN.test(username)) {
      setAvailable(null);
      return;
    }

    const timer = setTimeout(() => {
      setChecking(true);
      void checkUsernameAvailable(username)
        .then((ok) => setAvailable(ok))
        .finally(() => setChecking(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [username, checkUsernameAvailable]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!USERNAME_PATTERN.test(username)) {
      setError('Use 3–20 characters: letters, numbers, underscore.');
      return;
    }
    if (available === false) {
      setError('That username is taken.');
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await setUsername(username);
    setSubmitting(false);
    if (result.error) setError(result.error);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="arcade-glass sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="font-display">Pick your username</DialogTitle>
          <DialogDescription className="font-body arcade-text-muted">
            Required to compete online and appear on the leaderboard. You can update optional profile details later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Input
              value={username}
              onChange={(e) => setUsernameInput(e.target.value.replace(/\s/g, ''))}
              placeholder="your_handle"
              autoComplete="username"
              autoFocus
              className="font-body"
              maxLength={20}
            />
            <p
              className={cn(
                'font-body text-xs',
                checking && 'arcade-text-muted',
                available === true && 'text-[var(--neon-lime)]',
                available === false && 'text-destructive',
                !checking && available === null && username && !USERNAME_PATTERN.test(username) && 'text-destructive'
              )}
            >
              {checking ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> Checking…
                </span>
              ) : available === true ? (
                'Username available'
              ) : available === false ? (
                'Username taken'
              ) : username && !USERNAME_PATTERN.test(username) ? (
                'Use 3–20 characters: letters, numbers, underscore.'
              ) : (
                'Letters, numbers, and underscore only.'
              )}
            </p>
          </div>

          {error && <p className="font-body text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="font-body w-full"
            disabled={submitting || checking || available === false || !USERNAME_PATTERN.test(username)}
          >
            {submitting ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
