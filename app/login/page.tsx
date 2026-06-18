'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get('next') || '/';
  // After login the access token is unbound — the user must pick a profile
  // before any catalog request will return adult content. Pass the
  // originally requested URL through as ?next= so /profiles can bounce
  // there once a profile is bound.
  const next = `/profiles?next=${encodeURIComponent(requested)}`;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setErr(data.error || 'Sign-in failed');
      return;
    }
    router.refresh();
    router.push(next);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold mb-2">Sign in</h1>
      <p className="text-text-secondary text-sm mb-8">
        Pick up where you left off.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {err && (
          <p className="rounded-md bg-red-500/10 border border-red-500/30 text-red-200 px-3 py-2 text-sm">
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full inline-flex items-center justify-center px-4 py-3 rounded-md bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="text-sm text-text-secondary mt-6 text-center">
        New here?{' '}
        <Link
          href={`/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="text-primary hover:text-primary/80 font-semibold"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
