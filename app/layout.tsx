import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './global.css';
import type { Metadata } from 'next';
import { Provider } from '@/components/provider';
import { defaultSocial, definition } from '@/lib/metadata';
import { siteName, siteTitle, siteUrl } from '@/lib/shared';
import { readSources } from '@/lib/sources';

// What a page that gives no metadata of its own has. Pages give theirs with
// pageMetadata (lib/metadata.ts).
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { template: `%s · ${siteName}`, default: siteTitle },
  description: definition,
  icons: { icon: '/logo.svg' },
  ...defaultSocial,
};

export default function Layout({ children }: LayoutProps<'/'>) {
  const { versions, defaultVersion } = readSources();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans">
        <Provider versions={versions.map((v) => v.slug)} defaultVersion={defaultVersion}>
          {children}
        </Provider>
      </body>
    </html>
  );
}
