'use client';

import { createOpenAPIPage } from 'fumadocs-openapi/ui';

// An operation of the API reference. There's no playground: every
// installation has its own server, which the site can't reach.
export const APIPage = createOpenAPIPage({
  playground: { enabled: false },
});
