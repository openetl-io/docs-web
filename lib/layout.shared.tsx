import type * as PageTree from 'fumadocs-core/page-tree';
import type { DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Blocks } from 'lucide-react';
import type { ReactNode } from 'react';
import { SidebarFooter } from '@/components/sidebar-footer';
import { connectorsRoute, docsRoute, repos, siteName } from './shared';
import { readSources } from './sources';

export function baseOptions(): BaseLayoutProps {
  const { defaultVersion } = readSources();
  return {
    nav: {
      title: (
        <>
          <img src="/logo.svg" alt="" className="size-6 rounded-md" />
          <span className="font-semibold">{siteName}</span>
        </>
      ),
      url: '/',
    },
    githubUrl: `https://github.com/${repos.openetl}`,
    links: [
      { text: 'Docs', url: `${docsRoute}/${defaultVersion}`, active: 'nested-url' },
      { text: 'Connectors', url: connectorsRoute, active: 'nested-url' },
      { text: 'Changelog', url: '/changelog' },
    ],
  };
}

// The docs' and the connectors' layouts. GitHub and the theme switch are in
// the sidebar's own footer, a framed bar like Fumadocs' with the link
// labelled (components/sidebar-footer.tsx). The open sidebar has the page's background: Fumadocs widens
// its panel into the left margin on a wide screen, which reads as an empty
// panel; it keeps its own background when collapsed, where it floats.
export function docsLayoutOptions(): Omit<DocsLayoutProps, 'tree'> {
  return {
    ...baseOptions(),
    githubUrl: undefined,
    themeSwitch: { enabled: false },
    sidebar: {
      footer: <SidebarFooter />,
      className: 'data-[collapsed=false]:bg-transparent',
    },
  };
}

// A section of the docs, or the connectors, as the home page lists them.
export interface Section {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  url: string;
}

export const connectorsSection: Section = {
  title: 'Connectors',
  description: 'The official connectors: what each reads or writes, and its config',
  url: connectorsRoute,
  icon: <Blocks />,
};

// The sections of a version: the folders of its folder in the page tree.
export function sections(tree: PageTree.Root, version: string): Section[] {
  const folder = versionFolder(tree, version);
  return (folder?.children ?? [])
    .filter((n): n is PageTree.Folder => n.type === 'folder')
    .map((s) => ({
      title: s.name,
      description: s.description,
      icon: s.icon,
      url: s.index?.url ?? firstPage(s) ?? `${docsRoute}/${version}`,
    }));
}

// The folder of a version in the docs' page tree.
export function versionFolder(tree: PageTree.Root, version: string): PageTree.Folder | undefined {
  const prefix = `${docsRoute}/${version}`;
  const inVersion = (url?: string) => url === prefix || url?.startsWith(`${prefix}/`) === true;
  return tree.children.find(
    (n): n is PageTree.Folder => n.type === 'folder' && (inVersion(n.index?.url) || inVersion(firstPage(n))),
  );
}

function firstPage(folder: PageTree.Folder): string | undefined {
  for (const n of folder.children) {
    if (n.type === 'page') return n.url;
    if (n.type === 'folder') {
      const url = n.index?.url ?? firstPage(n);
      if (url) return url;
    }
  }
}
