'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PinPrompt } from './PinPrompt';

interface Profile {
  index: number;
  name: string;
  avatar?: string;
  kids?: boolean;
}

function Tile({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-center gap-2 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div
        className={`relative h-24 w-24 sm:h-28 sm:w-28 rounded-lg overflow-hidden border-2 transition-colors ${
          active
            ? 'border-primary'
            : 'border-transparent group-hover:border-white/60'
        }`}
      >
        {children}
      </div>
    </button>
  );
}

function isUsableUrl(s?: string): boolean {
  if (!s) return false;
  return /^(https?:|\/|data:image\/)/.test(s);
}

function Avatar({ profile, size }: { profile: Profile; size: number }) {
  if (isUsableUrl(profile.avatar)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar}
        alt=""
        className="h-full w-full object-cover bg-card"
      />
    );
  }
  return (
    <div className="h-full w-full bg-primary/20 text-primary flex items-center justify-center font-black" style={{ fontSize: size * 0.4 }}>
      {profile.name?.[0]?.toUpperCase() ?? '·'}
    </div>
  );
}

export function ProfilesManager({
  profiles,
  activeIndex,
  limit,
}: {
  profiles: Profile[];
  activeIndex: number;
  limit: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [adding, setAdding] = useState(false);
  const [pinFor, setPinFor] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function bindProfile(idx: number, pin?: string) {
    setBusy(true);
    try {
      const r = await fetch('/api/auth/select-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pin ? { profileIndex: idx, pin } : { profileIndex: idx }),
      });
      if (r.status === 400) {
        const data = await r.json().catch(() => ({}));
        if (data.pinRequired) {
          const p = profiles.find((x) => x.index === idx) ?? null;
          setPinFor(p);
          return { needsPin: true };
        }
      }
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        return { error: data };
      }
      setPinFor(null);
      const next =
        typeof window !== 'undefined'
          ? new URL(window.location.href).searchParams.get('next') || '/'
          : '/';
      router.push(next);
      return { ok: true };
    } finally {
      setBusy(false);
    }
  }

  async function switchTo(idx: number) {
    if (busy) return;
    await bindProfile(idx);
  }

  async function createProfile(p: { name: string; avatar?: string; kids?: boolean }) {
    setBusy(true);
    try {
      const r = await fetch('/api/viewer/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      if (r.ok) {
        setAdding(false);
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(false);
    }
  }

  async function updateProfile(idx: number, p: Partial<Profile>) {
    setBusy(true);
    try {
      const r = await fetch('/api/viewer/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: idx, ...p }),
      });
      if (r.ok) {
        setEditing(null);
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeProfile(idx: number) {
    if (!confirm('Delete this profile? Watch history and list will be lost.')) return;
    setBusy(true);
    try {
      const r = await fetch('/api/viewer/profiles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: idx }),
      });
      if (r.ok) {
        setEditing(null);
        startTransition(() => router.refresh());
      }
    } finally {
      setBusy(false);
    }
  }

  const canAddMore = profiles.length < limit;

  return (
    <>
      <ul className="flex flex-wrap gap-6 sm:gap-8 justify-center">
        {profiles.map((p) => (
          <li key={p.index} className="flex flex-col items-center gap-2">
            <Tile active={p.index === activeIndex} onClick={() => switchTo(p.index)}>
              <Avatar profile={p} size={112} />
              {p.kids && (
                <span className="absolute top-1 right-1 text-[9px] font-bold uppercase tracking-wider text-primary bg-black/60 border border-primary/30 rounded px-1 py-0.5">
                  Kids
                </span>
              )}
            </Tile>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-text-primary">{p.name}</span>
              <button
                type="button"
                onClick={() => setEditing(p)}
                className="text-text-tertiary hover:text-text-primary"
                aria-label="Edit profile"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </li>
        ))}

        {canAddMore && (
          <li className="flex flex-col items-center gap-2">
            <Tile onClick={() => setAdding(true)}>
              <div className="h-full w-full bg-card flex items-center justify-center text-text-tertiary group-hover:text-text-primary">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </div>
            </Tile>
            <span className="text-sm text-text-tertiary">Add profile</span>
          </li>
        )}
      </ul>

      {adding && (
        <ProfileFormModal
          title="New profile"
          submitLabel="Create"
          onClose={() => setAdding(false)}
          onSubmit={createProfile}
          busy={busy}
        />
      )}

      {editing && (
        <ProfileFormModal
          title="Edit profile"
          submitLabel="Save"
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(p) => updateProfile(editing.index, p)}
          onDelete={profiles.length > 1 ? () => removeProfile(editing.index) : undefined}
          busy={busy}
        />
      )}

      {pinFor && (
        <PinPrompt
          profileName={pinFor.name}
          onCancel={() => setPinFor(null)}
          onSubmit={(pin) => bindProfile(pinFor.index, pin)}
        />
      )}
    </>
  );
}

function ProfileFormModal({
  title,
  submitLabel,
  initial,
  onClose,
  onSubmit,
  onDelete,
  busy,
}: {
  title: string;
  submitLabel: string;
  initial?: Profile;
  onClose: () => void;
  onSubmit: (p: { name: string; avatar?: string; kids?: boolean }) => void | Promise<void>;
  onDelete?: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [avatar, setAvatar] = useState(initial?.avatar ?? '');
  const [kids, setKids] = useState(!!initial?.kids);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-border w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold">{title}</h2>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-text-tertiary font-bold">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            autoFocus
            className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-text-tertiary font-bold">Avatar URL (optional)</span>
          <input
            type="url"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={kids}
            onChange={(e) => setKids(e.target.checked)}
            className="h-4 w-4 rounded accent-primary"
          />
          <span className="text-sm text-text-secondary">Kids profile (age-rating restrictions)</span>
        </label>

        <div className="flex items-center justify-between gap-2 pt-2">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="text-sm text-red-400 hover:text-red-300 disabled:opacity-60"
            >
              Delete profile
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                onSubmit({ name: name.trim(), avatar: avatar.trim() || undefined, kids })
              }
              disabled={busy || !name.trim()}
              className="px-5 py-2 rounded-md text-sm font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
