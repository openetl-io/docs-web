'use client';

import { useStaticSearch } from 'fumadocs-core/search/client';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { usePathname } from 'next/navigation';
import { useVersions } from './versions';

// Searches the version of the docs the reader is on (or the default one), with
// the connectors, in that version's static index. The browser downloads an
// index once, the first time it's searched, and keeps it while the tab is open.
export default function DocsSearchDialog(props: SharedProps) {
  const pathname = usePathname();
  const { versions, defaultVersion } = useVersions();
  const segment = pathname.split('/')[2];
  const version = pathname.startsWith('/docs/') && versions.includes(segment) ? segment : defaultVersion;
  const search = useStaticSearch({ from: `/api/search/${version}.json` });

  return (
    <SearchDialog {...search} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList />
      </SearchDialogContent>
    </SearchDialog>
  );
}
