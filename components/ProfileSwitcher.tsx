'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PinPrompt } from './PinPrompt';

export interface ProfileSummary {
  index: number;
  name: string;
  avatar?: string;
  kids?: boolean;
}

function isUsableUrl(s?: string): boolean {
  if (!s) return false;
  return /^(https?:|\/|data:image\/)/.test(s);
}

function Avatar({ profile, size = 32 }: { profile: ProfileSummary; size?: number }) {
  if (isUsableUrl(profile.avatar)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar}
        alt=""
        width={size}
        height={size}
        className="rounded-md object-cover bg-card border border-white/10"
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = profile.name?.[0]?.toUpperCase() ?? '·';
  return (
    <div
      className="rounded-md bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </div>
  );
}

export function ProfileSwitcher({
  profiles,
  activeIndex,
}: {
  profiles: ProfileSummary[];
  activeIndex: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pinFor, setPinFor] = useState<ProfileSummary | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const active = profiles.find((p) => p.index === activeIndex) ?? profiles[0];
  if (!active) return null;

  async function switchTo(idx: number, pin?: string) {
    if (idx === activeIndex && !pin) return;
    const r = await fetch('/api/auth/select-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pin ? { profileIndex: idx, pin } : { profileIndex: idx }),
    });
    if (r.status === 400) {
      const data = await r.json().catch(() => ({}));
      if (data.pinRequired) {
        setOpen(false);
        const p = profiles.find((x) => x.index === idx) ?? null;
        setPinFor(p);
        return { needsPin: true };
      }
    }
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      return { error: data };
    }
    setOpen(false);
    setPinFor(null);
    router.refresh();
    return { ok: true };
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md p-1 hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar profile={active} />
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className={`text-white/70 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-2xl overflow-hidden"
        >
          <div className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-text-tertiary font-bold border-b border-border">
            Who's watching?
          </div>
          <ul>
            {profiles.map((p) => (
              <li key={p.index}>
                <button
                  type="button"
                  onClick={() => switchTo(p.index)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted ${
                    p.index === activeIndex ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  <Avatar profile={p} size={28} />
                  <span className="flex-1 text-left line-clamp-1">{p.name}</span>
                  {p.kids && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/30 rounded px-1">
                      Kids
                    </span>
                  )}
                  {p.index === activeIndex && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <Link
            href="/profiles"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 border-t border-border px-3 py-2.5 text-xs text-text-secondary hover:bg-muted hover:text-text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Manage profiles
          </Link>
        </div>
      )}

      {pinFor && (
        <PinPrompt
          profileName={pinFor.name}
          onCancel={() => setPinFor(null)}
          onSubmit={(pin) => switchTo(pinFor.index, pin)}
        />
      )}
    </div>
  );
}
