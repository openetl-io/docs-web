'use client';

import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import SearchDialog from './search';
import { VersionsProvider } from './versions';

export function Provider({
  children,
  versions,
  defaultVersion,
}: {
  children: ReactNode;
  versions: string[];
  defaultVersion: string;
}) {
  return (
    <VersionsProvider versions={versions} defaultVersion={defaultVersion}>
      <RootProvider search={{ SearchDialog }}>{children}</RootProvider>
    </VersionsProvider>
  );
}
