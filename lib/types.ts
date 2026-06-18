export interface Content {
  _id: string;
  title?: string;
  description?: string;
  contentType?: 'standalone' | 'series' | 'season' | 'episode';
  date?: string;
  venue?: string;
  broadcastStatus?: 'scheduled' | 'live' | 'completed' | 'cancelled';
  media?: MediaItem[];
  ageRating?: string;
  titleImage?: string;
  portrait?: string;
  landscape?: string;
  backdrop?: string;
  contentAdvisory?: string[];
  childCount?: number;
  sortOrder?: number;
  parent?: { _id?: string };
  genres?: { _id?: string; name?: string }[];
  organization?: { _id?: string; name?: string; logo?: string };
  primaryGroup?: { _id?: string; name?: string; logo?: string };
  secondaryGroup?: { _id?: string; name?: string; logo?: string };
  metadata?: { key: string; value: string }[];
  personnel?: { person?: { _id?: string; name?: string; title?: string; headshot?: string }; role?: string }[];
  monetization?: { mode?: 'free' | 'svod' | 'ppv' | 'rental' };
  entitled?: boolean;
  paywall?: PaywallBlock;
  entitlementExpiresAt?: string;
  // Optional short auto-play teaser. The newer API shape returns an object
  // with DASH + HLS variants and a poster; the older shape was just a
  // string URL. Accept both so we don't break old payloads.
  teaser?: string | TeaserAsset;
}

export interface TeaserAsset {
  duration?: number;
  resources?: { poster?: string };
  variants?: { protocol?: 'dash' | 'hls'; entrypoint?: string }[];
}

export interface PaywallBlock {
  mode?: 'svod' | 'ppv' | 'rental';
  reason?: 'signin_required' | 'no_subscription' | 'wrong_plan' | 'not_purchased' | 'expired';
  description?: string;
  detail?: {
    amount?: number;
    currency?: string;
    windowHours?: number;
    plans?: string[];
    planNames?: string[];
    currentPlan?: string | null;
  };
}

export interface MediaItem {
  title?: string;
  overview?: string;
  portrait?: string;
  landscape?: string;
  backdrop?: string;
  variants?: MediaVariant[];
}

export interface MediaVariant {
  protocol?: 'dash' | 'hls';
  entrypoint?: string;
  duration?: number;
  drm?: DrmConfig;
  resources?: { poster?: string; bif?: string; adbreaks?: string };
}

export interface DrmConfig {
  sessionDrm?: boolean;
  provider?: string;
  widevine?: { licenseUrl?: string };
  playready?: { licenseUrl?: string };
  fairplay?: { licenseUrl?: string; certificateUrl?: string };
}

export interface HomepageResponse {
  hero?: Content[];
  rows?: HomepageRow[];
}

export interface HomepageRow {
  items?: Content[];
  tileType?: 'portrait' | 'landscape';
  tileStyle?: 'default' | 'focused' | 'editorial';
  genre?: { _id?: string; name?: string };
}

export interface Category {
  _id: string;
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  order?: number;
  parent?: string | null;
  showInSidebar?: boolean;
  options?: { orientation?: 'portrait' | 'landscape' };
  image?: { portrait?: string; landscape?: string };
  children?: Category[];
}

export interface ContentPage {
  items?: Content[];
  total?: number;
  page?: number;
  totalPages?: number;
}

export interface DrmSession {
  token: string;
  expiresIn?: number;
}

export interface EPGProgram {
  _id?: string;
  title?: string;
  // Dashboard endpoint uses programName + durationSeconds; legacy endpoint
  // uses title + endTime. Either shape can land here; the EPG page
  // normalises to title/startTime/endTime before passing to the grid.
  programName?: string;
  contentId?: string;
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  description?: string;
  content?: { title?: string; thumbnail?: string; description?: string; genre?: string };
}

export interface EPGChannel {
  channel?: { _id?: string; name?: string; logo?: string };
  playbackUrl?: string;
  programs?: EPGProgram[];
}

export interface EPGResponse {
  channels?: EPGChannel[];
}

export interface SettingsResponseProfileLimit {
  enabled?: boolean;
  max?: number;
}

export interface SettingsResponse {
  viewerAuth?: {
    mode?: 'none' | 'otnet' | 'external';
    externalUrl?: string;
    plans?: { name: string; stripePriceId: string; amount: number; currency: string; interval: string }[];
  };
  myList?: { enabled?: boolean; showOnHomepage?: boolean; showInNav?: boolean };
  epg?: { enabled?: boolean; futureHours?: number; pastMinutes?: number };
  ageRatings?: { enabled?: boolean; ratingSystem?: string; ratings?: string[] };
  errorReporting?: { enabled?: boolean };
  adPolicy?: { blockSkipping?: boolean };
  branding?: { name?: string; logo?: string };
  // Newer publishers return { enabled, max } here; older just a number.
  profileLimit?: number | SettingsResponseProfileLimit;
}

// ---------- Safe accessors ----------

// API returns empty strings for unset fields. Treat them as missing.
const nonEmpty = (s?: string): string | undefined => (s && s.trim() ? s : undefined);

export const displayTitle = (c: Content) => nonEmpty(c.title) ?? 'Untitled';
export const displayDescription = (c: Content) => nonEmpty(c.description) ?? '';
export const posterUrl = (c: Content) =>
  nonEmpty(c.portrait) ?? nonEmpty(c.media?.[0]?.portrait);
export const landscapeUrl = (c: Content) =>
  nonEmpty(c.landscape) ??
  nonEmpty(c.media?.[0]?.landscape) ??
  nonEmpty(c.backdrop) ??
  nonEmpty(c.media?.[0]?.backdrop);
export const titleImageUrl = (c: Content) => nonEmpty(c.titleImage);
export const teaserUrl = (c: Content): string | undefined => {
  const t = c.teaser;
  if (!t) return undefined;
  // Legacy: teaser was a plain string URL.
  if (typeof t === 'string') return nonEmpty(t);
  // New shape: pick the first DASH variant (shaka loads it natively); fall
  // back to HLS, then to any entrypoint that's present.
  const variants = t.variants ?? [];
  const dash = variants.find((v) => v.protocol === 'dash')?.entrypoint;
  const hls = variants.find((v) => v.protocol === 'hls')?.entrypoint;
  const any = variants.find((v) => v.entrypoint)?.entrypoint;
  return nonEmpty(dash) ?? nonEmpty(hls) ?? nonEmpty(any);
};

export const teaserPoster = (c: Content): string | undefined => {
  const t = c.teaser;
  if (!t || typeof t === 'string') return undefined;
  return nonEmpty(t.resources?.poster);
};
export const isSeries = (c: Content) =>
  c.contentType === 'series' || (c.childCount ?? 0) > 0;
export const primaryGenreName = (c: Content) => c.genres?.[0]?.name;

export const allGenreNames = (c: Content, n = 3): string[] =>
  (c.genres ?? []).map((g) => g?.name).filter((x): x is string => Boolean(x)).slice(0, n);

export const displayYear = (c: Content): number | undefined => {
  if (!c.date) return undefined;
  const y = new Date(c.date).getUTCFullYear();
  return Number.isFinite(y) ? y : undefined;
};

export const contentDuration = (c: Content): number | undefined => {
  const v = c.media?.[0]?.variants?.[0];
  return v?.duration;
};

export const formatRuntime = (sec?: number): string | undefined => {
  if (!sec || !Number.isFinite(sec) || sec <= 0) return undefined;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h && m ? `${h}h ${m}m` : h ? `${h}h` : `${m}m`;
};

export const studioName = (c: Content) =>
  nonEmpty(c.organization?.name) ?? nonEmpty(c.primaryGroup?.name);
export const studioLogo = (c: Content) =>
  nonEmpty(c.organization?.logo) ?? nonEmpty(c.primaryGroup?.logo);

export const metadataValue = (c: Content, key: string) =>
  c.metadata?.find((m) => m.key?.toLowerCase() === key.toLowerCase())?.value;

export const heroBackdropUrl = (c: Content) =>
  nonEmpty(c.landscape) ??
  nonEmpty(c.media?.[0]?.landscape) ??
  nonEmpty(c.backdrop) ??
  nonEmpty(c.media?.[0]?.backdrop) ??
  nonEmpty(c.portrait) ??
  nonEmpty(c.media?.[0]?.portrait);

export const contentTypeLabel = (c: Content) => (isSeries(c) ? 'Series' : 'Film');

export const isPaywalled = (c: Content) => c.entitled === false && !!c.paywall;

export const formatPrice = (amount?: number, currency?: string): string => {
  if (typeof amount !== 'number' || !currency) return '';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;
  }
};

export const firstHlsVariant = (c: Content) =>
  c.media?.[0]?.variants?.find((v) => v.protocol === 'hls');
export const firstDashVariant = (c: Content) =>
  c.media?.[0]?.variants?.find((v) => v.protocol === 'dash');

export const hasPlayableVariant = (c: Content) =>
  (c.media?.[0]?.variants?.length ?? 0) > 0;

// True for anything the publisher curated into a feed. We render the tile and
// let the detail page handle "no playable variant" / "paywalled" cases — we
// shouldn't drop curated content just because variants haven't been encoded
// yet, otherwise the homepage hides 90% of the catalogue.
export const isFeedable = (c: Content): boolean => !!c._id;
