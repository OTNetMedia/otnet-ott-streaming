'use client';

import { useEffect, useRef, useState } from 'react';

interface SubmitResult {
  ok?: boolean;
  needsPin?: boolean;
  error?: { error?: string; attemptsRemaining?: number; retryAfterMs?: number; retryAt?: string };
}

export function PinPrompt({
  profileName,
  onSubmit,
  onCancel,
}: {
  profileName: string;
  onSubmit: (pin: string) => Promise<SubmitResult | undefined>;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Tick once a second while locked so the countdown ticks down.
  useEffect(() => {
    if (lockedUntil === null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const locked = lockedUntil !== null && lockedUntil > now;
  const secondsLeft = locked ? Math.ceil((lockedUntil! - now) / 1000) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (locked || busy) return;
    setBusy(true);
    const result = await onSubmit(pin);
    setBusy(false);
    if (!result) {
      setPin('');
      return;
    }
    if (result.ok) return;
    const err = result.error;
    if (err?.error === 'pin_incorrect') {
      setAttemptsLeft(err.attemptsRemaining ?? null);
      setPin('');
      inputRef.current?.focus();
      return;
    }
    if (err?.error === 'pin_locked') {
      const until =
        (err.retryAt && new Date(err.retryAt).getTime()) ||
        (err.retryAfterMs ? Date.now() + err.retryAfterMs : null);
      if (until) {
        setLockedUntil(until);
        setNow(Date.now());
      }
      setPin('');
      return;
    }
    setPin('');
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-xl border border-border w-full max-w-sm p-6 space-y-4"
      >
        <div>
          <h2 className="text-lg font-bold">Enter PIN</h2>
          <p className="text-sm text-text-tertiary mt-1">
            {profileName} is PIN-protected.
          </p>
        </div>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          disabled={locked || busy}
          className="w-full rounded-md bg-background border border-border px-4 py-3 text-center text-2xl tracking-[0.5em] tabular-nums font-bold focus:outline-none focus:border-primary disabled:opacity-60"
          aria-label="PIN"
        />

        {attemptsLeft !== null && !locked && (
          <p className="text-xs text-red-400 text-center">
            Incorrect PIN · {attemptsLeft} {attemptsLeft === 1 ? 'try' : 'tries'} left
          </p>
        )}
        {locked && (
          <p className="text-xs text-red-400 text-center">
            Too many attempts — try again in {secondsLeft}s
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-md text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pin.length < 4 || locked || busy}
            className="flex-1 px-5 py-2 rounded-md text-sm font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? '…' : 'Unlock'}
          </button>
        </div>
      </form>
    </div>
  );
}
