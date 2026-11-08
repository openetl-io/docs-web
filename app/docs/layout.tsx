import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { docsLayoutOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';

// The sidebar shows the version you're reading, every section in it, and a
// picker of the versions.
export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <DocsLayout tree={source.getPageTree()} {...docsLayoutOptions()}>
      {children}
    </DocsLayout>
  );
}
