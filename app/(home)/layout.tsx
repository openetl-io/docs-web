import { HomeShell } from '@/components/home-shell';
import { SiteFooter } from '@/components/site-footer';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <HomeShell {...baseOptions()}>
      {children}
      <SiteFooter />
    </HomeShell>
  );
}
