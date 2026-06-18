import { api } from './api';

export interface PublisherConfig {
  viewerAuthMode: 'none' | 'otnet' | 'external';
  viewerAuthNone: boolean;
  viewerAuthExternalUrl?: string;
  paidSubscriptionsRequired: boolean;
  plans: { name: string; amount: number; currency: string; interval: string }[];
  myListEnabled: boolean;
  myListShowOnHomepage: boolean;
  myListShowInNav: boolean;
  epgEnabled: boolean;
  epgFutureHours: number;
  epgPastMinutes: number;
  ageRatingsEnabled: boolean;
  ageRatingSystem?: string;
  errorReportingEnabled: boolean;
  blockAdSkipping: boolean;
  profileLimit: number;
  brandName: string;
  brandLogo?: string;
}

export async function getPublisherConfig(): Promise<PublisherConfig> {
  const s = await api.settings().catch(() => ({} as Awaited<ReturnType<typeof api.settings>>));
  const rawMode = s?.viewerAuth?.mode;
  const mode: 'none' | 'otnet' | 'external' =
    rawMode === 'none' || rawMode === 'external' ? rawMode : 'otnet';
  return {
    viewerAuthMode: mode,
    viewerAuthNone: mode === 'none',
    viewerAuthExternalUrl:
      typeof s?.viewerAuth?.externalUrl === 'string' ? s.viewerAuth.externalUrl : undefined,
    paidSubscriptionsRequired:
      Array.isArray(s?.viewerAuth?.plans) && (s?.viewerAuth?.plans?.length ?? 0) > 0,
    plans: (s?.viewerAuth?.plans ?? []).map((p) => ({
      name: p.name,
      amount: p.amount,
      currency: p.currency,
      interval: p.interval,
    })),
    myListEnabled: !!s?.myList?.enabled,
    myListShowOnHomepage: !!s?.myList?.showOnHomepage,
    myListShowInNav: !!s?.myList?.showInNav,
    epgEnabled: !!s?.epg?.enabled,
    epgFutureHours: s?.epg?.futureHours ?? 2,
    epgPastMinutes: s?.epg?.pastMinutes ?? 30,
    ageRatingsEnabled: !!s?.ageRatings?.enabled,
    ageRatingSystem: s?.ageRatings?.ratingSystem,
    errorReportingEnabled: !!s?.errorReporting?.enabled,
    blockAdSkipping: !!s?.adPolicy?.blockSkipping,
    profileLimit:
      typeof s?.profileLimit === 'number'
        ? s.profileLimit
        : s?.profileLimit?.max ?? 5,
    brandName: s?.branding?.name || 'OTNet',
    brandLogo: s?.branding?.logo || undefined,
  };
}
