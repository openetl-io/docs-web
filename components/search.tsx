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

// Searches the static index of /api/search, in the version of the docs the
// reader is on (or the default one), with the connectors.
export default function DocsSearchDialog(props: SharedProps) {
  const pathname = usePathname();
  const { versions, defaultVersion } = useVersions();
  const segment = pathname.split('/')[2];
  const tag = pathname.startsWith('/docs/') && versions.includes(segment) ? segment : defaultVersion;
  const search = useStaticSearch({ tag });

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
