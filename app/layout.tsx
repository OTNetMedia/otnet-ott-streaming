import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { api } from '@/lib/api';
import { getPublisherConfig } from '@/lib/config';
import { getActiveProfileIndex } from '@/lib/profile';
import { Header } from '@/components/Header';
import type { ProfileSummary } from '@/components/ProfileSwitcher';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await getPublisherConfig();
    return {
      title: { default: config.brandName, template: `%s · ${config.brandName}` },
      description: 'Stream movies, series and live TV.',
    };
  } catch {
    return { title: 'OTNet' };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getPublisherConfig();
  const signedIn = !!cookies().get('otnet_viewer')?.value;
  const activeProfileIndex = getActiveProfileIndex();
  let profiles: ProfileSummary[] = [];
  if (signedIn) {
    try {
      const resp = await api.profiles();
      profiles = (resp.profiles ?? []).map((p, i) => ({
        // OTNet returns _id + name + avatar but no explicit index — the
        // array position is the profileIndex used by the rest of the API.
        index: i,
        name: p.name ?? 'Profile',
        avatar: p.avatar,
        kids: !!p.kids || (typeof p.maxRating === 'string' && p.maxRating.length > 0),
      }));
    } catch {
      profiles = [];
    }
  }
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-text-primary min-h-screen font-sans">
        <Header
          config={config}
          brandName={config.brandName}
          brandLogo={config.brandLogo}
          signedIn={signedIn}
          profiles={profiles}
          activeProfileIndex={activeProfileIndex}
        />
        <main>{children}</main>
        <footer className="mt-16 border-t border-border py-8 text-center text-xs text-text-tertiary">
          <p>© {new Date().getFullYear()} {config.brandName}. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
