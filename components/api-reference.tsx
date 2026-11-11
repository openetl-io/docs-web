'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { APIPage } from './api-page';

// The API reference's page, loaded with next/dynamic from a client component,
// which splits it from the docs' code: fumadocs-openapi's UI and the Shiki it
// highlights examples with load on the API reference's pages only, not on
// every page of the docs. It's still rendered at build, like any other page.
const LazyAPIPage = dynamic(() => import('./api-page').then((m) => m.APIPage));

export function APIReference(props: ComponentProps<typeof APIPage>) {
  return <LazyAPIPage {...props} />;
}
