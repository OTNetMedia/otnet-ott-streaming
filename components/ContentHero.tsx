'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  type Content,
  allGenreNames,
  contentDuration,
  contentTypeLabel,
  displayDescription,
  displayTitle,
  displayYear,
  formatRuntime,
  hasPlayableVariant,
  heroBackdropUrl,
  isPaywalled,
  isSeries,
  metadataValue,
  primaryGenreName,
  studioLogo,
  studioName,
  teaserUrl,
  titleImageUrl,
} from '@/lib/types';
import { RatingBadge } from './RatingBadge';
import { PaywallCTA } from './PaywallCTA';
import { RentalCountdown } from './Player';
import { MyListButton } from './MyListButton';

function awardOf(c: Content): string | undefined {
  return c.metadata?.find((m) => /award|emmy|oscar|nominat|winner/i.test(m.key))?.value;
}

export function ContentHero({
  content,
  showRating,
  ratingSystem,
}: {
  content: Content;
  showRating: boolean;
  ratingSystem?: string;
}) {
  const teaser = teaserUrl(content);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = videoRef.current;
    if (el) el.muted = muted;
  }, [muted]);

  // Load teaser — same shaka/native split as the homepage hero.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !teaser) return;

    let cancelled = false;
    let player: { destroy: () => Promise<void> } | null = null;
    const isDash = /\.mpd($|\?)/i.test(teaser);

    if (isDash) {
      import('shaka-player/dist/shaka-player.compiled')
        .then((mod) => {
          if (cancelled || !el) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const Shaka: any = (mod as unknown as { default?: unknown }).default ?? mod;
          const Player = Shaka?.Player;
          if (!Player) return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p: any = new Player();
          player = p;
          p.attach(el).then(() => p.load(teaser)).catch(() => {});
        })
        .catch(() => {});
    } else {
      el.src = teaser;
      el.load();
    }

    return () => {
      cancelled = true;
      if (player) player.destroy().catch(() => {});
      if (el && !isDash) {
        el.removeAttribute('src');
        el.load();
      }
    };
  }, [teaser]);

  const backdrop = heroBackdropUrl(content);
  const titleArt = titleImageUrl(content);
  const year = displayYear(content);
  const runtime = formatRuntime(contentDuration(content));
  const rating = showRating ? content.ageRating : undefined;
  const genre = primaryGenreName(content) ?? allGenreNames(content, 1)[0];
  const live = content.broadcastStatus === 'live';
  const locked = isPaywalled(content);
  const playable = hasPlayableVariant(content);
  const isSeriesContent = isSeries(content);
  const award = awardOf(content);
  const studio = studioName(content);
  const studioImg = studioLogo(content);
  const newSeason = metadataValue(content, 'New Season') ?? metadataValue(content, 'Status');

  return (
    <section className="relative">
      <div className="relative w-full h-[80vh] sm:h-auto sm:aspect-[16/7] sm:min-h-[460px] overflow-hidden bg-card">
        {backdrop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backdrop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover animate-fade-in"
          />
        ) : (
          <div
            className="absolute inset-0 animate-fade-in"
            style={{
              background: 'radial-gradient(ellipse at 75% 45%, hsl(0,80%,22%) 0%, #0A0A0A 65%)',
            }}
          />
        )}

        {teaser && (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onPlaying={() => setVideoReady(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              videoReady ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden
          />
        )}

        {/* Gradients — fade right→left and bottom→top into the page background */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent" />

        <div className="relative h-full flex items-end sm:items-center pt-20 sm:pt-0">
          <div className="max-w-xl sm:max-w-2xl px-4 sm:px-8 lg:px-12 pb-10 space-y-3 sm:space-y-4">
            {live && (
              <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                Live now
              </span>
            )}

            {award && (
              <div className="inline-block border border-amber-200/60 px-3 py-1 text-amber-100">
                <span className="text-[10px] sm:text-xs font-extrabold tracking-[0.3em] uppercase">
                  {award}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-white/90">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-sm bg-primary text-white font-black text-[11px]">
                N
              </span>
              <span>{isSeriesContent ? 'SERIES' : 'FILM'}</span>
              {newSeason && (
                <>
                  <span className="text-white/40">·</span>
                  <span className="text-primary">{newSeason}</span>
                </>
              )}
            </div>

            {titleArt ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={titleArt}
                alt={displayTitle(content)}
                className="max-h-24 sm:max-h-36 w-auto drop-shadow-2xl"
              />
            ) : (
              <h1 className="solid-title text-4xl sm:text-6xl lg:text-7xl">
                {displayTitle(content)}
              </h1>
            )}

            {content.venue && (
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                {content.venue}
              </p>
            )}

            <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-white/85 font-medium">
              <li>{contentTypeLabel(content)}</li>
              {genre && <li aria-hidden>·</li>}
              {genre && <li>{genre}</li>}
              {year && <li aria-hidden>·</li>}
              {year && <li>{year}</li>}
              {runtime && <li aria-hidden>·</li>}
              {runtime && <li>{runtime}</li>}
              {rating && <li aria-hidden>·</li>}
              {rating && (
                <li>
                  <RatingBadge rating={rating} system={ratingSystem} compact />
                </li>
              )}
            </ul>

            {displayDescription(content) && (
              <p className="text-sm sm:text-base leading-snug text-white/90 line-clamp-3 max-w-md">
                {displayDescription(content)}
              </p>
            )}

            {content.entitlementExpiresAt && (
              <p className="text-sm text-amber-300">
                <RentalCountdown expiresAt={content.entitlementExpiresAt} />
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {playable && !locked && !isSeriesContent && (
                <Link
                  href={`/watch/${content._id}`}
                  className="inline-flex items-center gap-2 rounded-md bg-white px-7 py-2.5 sm:py-3 text-sm font-bold text-black hover:bg-white/90"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play
                </Link>
              )}
              {isSeriesContent && (
                <a
                  href="#episodes"
                  className="inline-flex items-center gap-2 rounded-md bg-white px-7 py-2.5 sm:py-3 text-sm font-bold text-black hover:bg-white/90"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play first episode
                </a>
              )}
              {locked && content.paywall && (
                <PaywallCTA contentId={content._id} paywall={content.paywall} />
              )}
              {!isSeriesContent && !playable && !(locked && content.paywall) && (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 rounded-md bg-white/20 px-7 py-2.5 sm:py-3 text-sm font-bold text-white/70 cursor-not-allowed"
                  aria-label="Not yet available"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play · Coming soon
                </button>
              )}
              <MyListButton contentId={content._id} />
              <button
                type="button"
                className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-white/40 bg-white/10 text-white hover:bg-white/20"
                aria-label="Like"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 10v12M15 5l-1 4h6l-2 13h-9V10l5-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {(studio || studioImg) && (
              <p className="flex items-center gap-2 pt-1 text-[11px] uppercase tracking-[0.2em] text-white/60">
                Presented by
                {studioImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={studioImg} alt={studio ?? ''} className="h-5 w-auto opacity-90" />
                ) : (
                  <span className="text-white/80">{studio}</span>
                )}
              </p>
            )}
          </div>
        </div>

        {teaser && (
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="absolute bottom-6 right-6 sm:right-12 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
          >
            {muted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M23 9l-6 6M17 9l6 6" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 010 7.07" />
                <path d="M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
