import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { docsLayoutOptions } from '@/lib/layout.shared';
import { connectorsSource } from '@/lib/source';

export default function Layout({ children }: LayoutProps<'/connectors'>) {
  return (
    <DocsLayout tree={connectorsSource.getPageTree()} tabs={false} {...docsLayoutOptions()}>
      {children}
    </DocsLayout>
  );
}
