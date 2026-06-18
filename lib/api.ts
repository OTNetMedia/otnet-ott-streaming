import { cookies } from 'next/headers';
import type {
  Category,
  Content,
  ContentPage,
  DrmSession,
  EPGResponse,
  HomepageResponse,
  SettingsResponse,
} from './types';

const BASE = 'https://otnet.io/api/v1';

function getKey(): string {
  const k = process.env.OTNET_API_KEY;
  if (!k) throw new Error('OTNET_API_KEY env var is required');
  return k;
}

type FetchOpts = { revalidate?: number; tags?: string[]; skipViewerAuth?: boolean };

export class APIError extends Error {
  constructor(public status: number, public body: string) {
    super(`HTTP ${status}`);
  }
}

function safeViewerToken(): string | undefined {
  try {
    return cookies().get('otnet_viewer')?.value;
  } catch {
    return undefined;
  }
}

export async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = path.startsWith('http') ? path : BASE + path;
  const viewerToken = opts.skipViewerAuth ? undefined : safeViewerToken();
  const headers: Record<string, string> = { 'X-Api-Key': getKey() };
  // Profile binding is encoded inside the JWT — the server ignores
  // X-Profile-Index on viewer-authed calls. Just send the Bearer.
  if (viewerToken) headers['Authorization'] = `Bearer ${viewerToken}`;

  const init: RequestInit = { headers };
  if (viewerToken) {
    // Per-viewer responses (entitlement, my-list) must not be cached across viewers.
    (init as { cache: 'no-store' }).cache = 'no-store';
  } else {
    (init as { next: { revalidate: number; tags?: string[] } }).next = {
      revalidate: opts.revalidate ?? 60,
      tags: opts.tags,
    };
  }

  const res = await fetch(url, init);
  console.log(
    `[OTNetAPI] GET ${res.status} ${path}${viewerToken ? ' (viewer)' : ''}`,
  );
  if (!res.ok) {
    const body = await res.text();
    throw new APIError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const viewerToken = safeViewerToken();
  const headers: Record<string, string> = {
    'X-Api-Key': getKey(),
    'Content-Type': 'application/json',
  };
  if (viewerToken) headers['Authorization'] = `Bearer ${viewerToken}`;
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  console.log(`[OTNetAPI] POST ${res.status} ${path}`);
  if (!res.ok) throw new APIError(res.status, await res.text());
  return res.json() as Promise<T>;
}

export const api = {
  homepage: () => apiFetch<HomepageResponse>('/catalog/homepage', { revalidate: 60 }),
  content: (id: string) =>
    apiFetch<Content>(`/catalog/content/${id}`, { revalidate: 60, tags: [`content:${id}`] }),
  children: (id: string) =>
    apiFetch<{ items: Content[] }>(`/catalog/content/${id}/children`, { revalidate: 60 }),
  contentByCat: (id: string, page = 1) =>
    apiFetch<ContentPage>(`/catalog/content/category/${id}?page=${page}&limit=24`, { revalidate: 60 }),
  categories: () => apiFetch<Category[]>('/catalog/categories', { revalidate: 300 }),
  categoriesTree: () => apiFetch<Category[]>('/catalog/categories/tree', { revalidate: 300 }),
  search: (q: string) =>
    apiFetch<ContentPage>(`/catalog/content?search=${encodeURIComponent(q)}`, { revalidate: 0 }),
  person: (id: string) =>
    apiFetch<{
      _id?: string;
      name?: string;
      title?: string;
      headshot?: string;
      bio?: string;
      birthDate?: string;
      birthplace?: string;
    }>(`/catalog/people/${id}`, { revalidate: 300 }),
  personContent: (id: string) =>
    apiFetch<ContentPage>(`/catalog/content?personnelId=${id}&limit=48`, {
      revalidate: 60,
    }),
  epg: () => apiFetch<EPGResponse>('/catalog/epg', { revalidate: 60 }),
  channelEpg: (id: string, opts: { back?: number; ahead?: number } = {}) => {
    const params = new URLSearchParams({ channelId: id });
    if (opts.back !== undefined) params.set('back', String(opts.back));
    if (opts.ahead !== undefined) params.set('ahead', String(opts.ahead));
    return apiFetch<EPGResponse>(
      `/catalog/epg?${params.toString()}`,
      { revalidate: 0 },
    );
  },
  channels: () =>
    apiFetch<{
      channels?: {
        _id: string;
        channelNumber?: number;
        name?: string;
        description?: string;
        logo?: string;
        backgroundImage?: string;
        monetization?: { mode?: 'free' | 'svod' | 'ppv' | 'rental' };
      }[];
    }>('/catalog/channels', { revalidate: 300 }),
  settings: () => apiFetch<SettingsResponse>('/catalog/settings', { revalidate: 30 }),
  profiles: () =>
    apiFetch<{
      profiles?: {
        _id?: string;
        name?: string;
        avatar?: string;
        maxRating?: string;
        kids?: boolean;
      }[];
    }>('/viewer/profiles', { revalidate: 0 }),
  drmSession: (contentId: string, mediaIndex = 0) =>
    apiPost<DrmSession>('/playback/session', { contentId, mediaIndex }),
};
