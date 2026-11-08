'use client';

import { createContext, type ReactNode, use } from 'react';

interface Versions {
  // The slugs of the docs' versions.
  versions: string[];
  defaultVersion: string;
}

const VersionsContext = createContext<Versions>({ versions: [], defaultVersion: 'next' });

export function VersionsProvider({ children, ...value }: Versions & { children: ReactNode }) {
  return <VersionsContext value={value}>{children}</VersionsContext>;
}

export function useVersions() {
  return use(VersionsContext);
}
