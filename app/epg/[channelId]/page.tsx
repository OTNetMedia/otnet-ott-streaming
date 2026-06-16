import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { getPublisherConfig } from '@/lib/config';
import { ChannelPlayer } from '@/components/Player';
import type { EPGProgram } from '@/lib/types';

export const dynamic = 'force-dynamic';

const timeFmt = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  minute: '2-digit',
});
const dayFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
});

function normalize(p: EPGProgram): EPGProgram {
  const start = p.startTime ? new Date(p.startTime).getTime() : 0;
  const endFromDuration =
    start && p.durationSeconds
      ? new Date(start + p.durationSeconds * 1000).toISOString()
      : undefined;
  return {
    ...p,
    title: p.content?.title || p.programName || p.title,
    description: p.content?.description || p.description,
    endTime: p.endTime || endFromDuration,
  };
}

function durationMins(p: EPGProgram): number | undefined {
  if (p.durationSeconds) return Math.round(p.durationSeconds / 60);
  if (p.startTime && p.endTime) {
    const ms = new Date(p.endTime).getTime() - new Date(p.startTime).getTime();
    if (ms > 0) return Math.round(ms / 60000);
  }
  return undefined;
}

function formatDur(min?: number): string | undefined {
  if (!min) return undefined;
  if (min < 1) return '<1m';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default async function LiveChannelPage({
  params,
}: {
  params: { channelId: string };
}) {
  console.log(`[channel-page] rendering ${params.channelId}`);
  const config = await getPublisherConfig();
  if (!config.epgEnabled) notFound();

  const [channelsResp, dashboardEpg] = await Promise.all([
    api.channels().catch((e) => {
      console.log(`[channel-page] /catalog/channels failed: ${e.message}`);
      return {} as Awaited<ReturnType<typeof api.channels>>;
    }),
    api.channelEpg(params.channelId, { back: 1, ahead: 48 }).catch((e) => {
      console.log(`[channel-page] /catalog/epg?channelId=${params.channelId} failed: ${e.message}`);
      return {} as Awaited<ReturnType<typeof api.channelEpg>>;
    }),
  ]);
  console.log(
    `[channel-page] channels=${channelsResp.channels?.length ?? 0} epgRows=${dashboardEpg.channels?.length ?? 0}`,
  );

  const channel = channelsResp.channels?.find((c) => c._id === params.channelId);
  const epgRow = dashboardEpg.channels?.find((c) => c.channel?._id === params.channelId)
    ?? dashboardEpg.channels?.[0];
  if (!channel && !epgRow) notFound();

  // Channel meta — prefer /catalog/channels (richer fields), fall back to EPG row.
  const name = channel?.name ?? epgRow?.channel?.name ?? 'Live channel';
  const logo = channel?.logo ?? epgRow?.channel?.logo;
  const description = channel?.description;
  const backdrop = channel?.backgroundImage;
  const monetization = channel?.monetization?.mode;
  const channelNumber = channel?.channelNumber;

  const programs = (epgRow?.programs ?? []).map(normalize);
  const now = Date.now();
  const nowProgram = programs.find((p) => {
    const start = p.startTime ? new Date(p.startTime).getTime() : 0;
    const end = p.endTime ? new Date(p.endTime).getTime() : 0;
    return start <= now && end > now;
  });
  const upcomingPrograms = programs.filter((p) => {
    const end = p.endTime ? new Date(p.endTime).getTime() : 0;
    return end > now;
  });

  // Group upcoming programs by calendar day for the schedule sidebar.
  const days: { day: string; programs: EPGProgram[] }[] = [];
  for (const p of upcomingPrograms) {
    if (!p.startTime) continue;
    const d = new Date(p.startTime);
    if (Number.isNaN(d.getTime())) continue;
    const dayKey = dayFmt.format(d);
    const last = days[days.length - 1];
    if (last && last.day === dayKey) last.programs.push(p);
    else days.push({ day: dayKey, programs: [p] });
  }

  return (
    <div className="px-4 sm:px-8 lg:px-12 py-6 space-y-4">
      <Link
        href="/epg"
        className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-text-tertiary hover:text-text-primary"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        All channels
      </Link>

      <div className="grid lg:grid-cols-[1fr,380px] gap-6">
        {/* Player + channel hero */}
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden shadow-prime border border-border bg-black">
            <ChannelPlayer channelId={params.channelId} />
          </div>

          <div className="flex items-start gap-4">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="h-16 w-16 rounded object-cover bg-black/40 shrink-0"
              />
            ) : (
              <div className="h-16 w-16 rounded bg-muted flex items-center justify-center text-2xl shrink-0">
                📺
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {typeof channelNumber === 'number' && (
                  <span className="inline-flex items-center justify-center rounded bg-primary/15 text-primary text-xs font-bold px-2 py-0.5 border border-primary/30">
                    CH {channelNumber}
                  </span>
                )}
                <h1 className="text-2xl sm:text-3xl font-bold">{name}</h1>
                {monetization && monetization !== 'free' && (
                  <span className="rounded-full bg-amber-400/15 text-amber-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-amber-400/30">
                    {monetization}
                  </span>
                )}
              </div>
              {description && (
                <p className="mt-1 text-sm text-text-secondary">{description}</p>
              )}
              {nowProgram && (
                <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-primary">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    On now
                    {nowProgram.endTime && (
                      <span className="text-text-tertiary tracking-normal normal-case font-medium">
                        · until {timeFmt.format(new Date(nowProgram.endTime))}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-base font-semibold text-text-primary">
                    {nowProgram.title}
                  </p>
                  {nowProgram.description && (
                    <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
                      {nowProgram.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar — schedule or channel info */}
        <aside>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {backdrop && (
              <div className="relative aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={backdrop}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
              </div>
            )}

            <div className="p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-tertiary">
                  {days.length > 0 ? 'Schedule' : 'About this channel'}
                </h2>
                {days.length > 0 && (
                  <span className="text-[10px] uppercase tracking-wider text-text-tertiary">
                    {upcomingPrograms.length} programmes
                  </span>
                )}
              </div>

              {days.length > 0 ? (
                <div className="space-y-5 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                  {days.map((d) => (
                    <div key={d.day}>
                      <h3 className="sticky top-0 z-10 bg-card/95 backdrop-blur text-[11px] font-bold uppercase tracking-[0.2em] text-text-tertiary border-b border-border pb-1.5 mb-2">
                        {d.day}
                      </h3>
                      <ol className="space-y-1.5">
                        {d.programs.map((p, i) => {
                          const start = p.startTime ? new Date(p.startTime).getTime() : 0;
                          const end = p.endTime ? new Date(p.endTime).getTime() : 0;
                          const isLive = start <= now && end > now;
                          const dur = formatDur(durationMins(p));
                          const thumb = p.content?.thumbnail;
                          const href = p.contentId ? `/content/${p.contentId}` : `/epg/${params.channelId}`;
                          return (
                            <li key={i}>
                              <Link
                                href={href}
                                className={`group flex items-stretch gap-3 rounded-lg p-2 border transition-colors ${
                                  isLive
                                    ? 'border-primary/40 bg-primary/10 hover:bg-primary/15'
                                    : 'border-transparent hover:border-border hover:bg-background/60'
                                }`}
                              >
                                <div className="w-12 shrink-0 flex flex-col items-center justify-center text-center">
                                  <span className="text-sm font-bold tabular-nums text-text-primary">
                                    {p.startTime ? timeFmt.format(new Date(p.startTime)) : '—'}
                                  </span>
                                  {dur && (
                                    <span className="text-[10px] text-text-tertiary mt-0.5">
                                      {dur}
                                    </span>
                                  )}
                                </div>

                                {thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="h-14 w-24 rounded object-cover bg-black/40 shrink-0"
                                  />
                                ) : (
                                  <div className="h-14 w-24 rounded bg-muted flex items-center justify-center text-text-tertiary shrink-0">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="opacity-50">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                )}

                                <div className="min-w-0 flex-1 self-center">
                                  <div className="flex items-center gap-1.5">
                                    {isLive && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-red-400">
                                        <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse" />
                                        Live
                                      </span>
                                    )}
                                    <p className="text-sm font-semibold text-text-primary line-clamp-1">
                                      {p.title}
                                    </p>
                                  </div>
                                  {p.description && (
                                    <p className="text-[11px] text-text-tertiary line-clamp-1 mt-0.5">
                                      {p.description}
                                    </p>
                                  )}
                                  {p.content?.genre && (
                                    <p className="text-[10px] uppercase tracking-wider text-text-tertiary/80 mt-0.5">
                                      {p.content.genre}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-red-400 font-semibold">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Streaming live · 24/7
                  </div>
                  {description ? (
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {description}
                    </p>
                  ) : (
                    <p className="text-sm text-text-tertiary">
                      This channel runs continuously without a fixed programme schedule.
                      Tune in any time.
                    </p>
                  )}
                  <dl className="space-y-1 text-xs pt-2 border-t border-border">
                    {typeof channelNumber === 'number' && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-tertiary uppercase tracking-wider">Channel</dt>
                        <dd className="text-text-primary font-mono">{channelNumber}</dd>
                      </div>
                    )}
                    {monetization && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-tertiary uppercase tracking-wider">Access</dt>
                        <dd className="text-text-primary uppercase">{monetization}</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-3">
                      <dt className="text-text-tertiary uppercase tracking-wider">Type</dt>
                      <dd className="text-text-primary">Linear · Loop</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
