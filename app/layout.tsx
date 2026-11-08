import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './global.css';
import type { Metadata } from 'next';
import { Provider } from '@/components/provider';
import { readSources } from '@/lib/sources';

export const metadata: Metadata = {
  title: { template: '%s · OpenETL', default: 'OpenETL documentation' },
  description: 'Guides and reference for using, running, integrating and extending OpenETL.',
  icons: { icon: '/logo.svg' },
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
