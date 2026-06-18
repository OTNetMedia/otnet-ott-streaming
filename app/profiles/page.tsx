import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getActiveProfileIndex } from '@/lib/profile';
import { getPublisherConfig } from '@/lib/config';
import { ProfilesManager } from '@/components/ProfilesManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profiles' };

export default async function ProfilesPage() {
  const config = await getPublisherConfig();
  if (config.viewerAuthNone) redirect('/');

  const token = cookies().get('otnet_viewer')?.value;
  if (!token) redirect('/login?next=/profiles');

  let profiles: { index: number; name: string; avatar?: string; kids?: boolean }[] = [];
  try {
    const resp = await api.profiles();
    profiles = (resp.profiles ?? []).map((p, i) => ({
      index: i,
      name: p.name ?? 'Profile',
      avatar: p.avatar,
      kids: !!p.kids || (typeof p.maxRating === 'string' && p.maxRating.length > 0),
    }));
  } catch {
    profiles = [];
  }

  const activeIndex = getActiveProfileIndex();

  return (
    <div className="px-4 sm:px-8 lg:px-12 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Who's watching?</h1>
          <p className="text-sm text-text-tertiary mt-1">
            Up to {config.profileLimit} profiles per account.
          </p>
        </div>
        <Link href="/" className="text-sm text-text-tertiary hover:text-text-primary">
          Done
        </Link>
      </div>

      <ProfilesManager
        profiles={profiles}
        activeIndex={activeIndex}
        limit={config.profileLimit}
      />
    </div>
  );
}
