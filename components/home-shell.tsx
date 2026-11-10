'use client';

import { HomeLayout, type HomeLayoutProps } from 'fumadocs-ui/layouts/home';
import type { ComponentProps } from 'react';

// HomeLayout's default container is a main. Pages provide their own main,
// so use a neutral container to keep a single main landmark per page.
function Container({ ref: _ref, className, children, ...props }: ComponentProps<'main'>) {
  return (
    <div {...props} className={`flex flex-1 flex-col [--fd-layout-width:1400px] ${className ?? ''}`}>
      <a
        href="#main-content"
        className="focus:bg-fd-background focus:ring-fd-ring sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:z-50 focus:rounded-lg focus:border focus:px-4 focus:py-3 focus:text-sm focus:ring-2 focus:outline-none"
      >
        Skip to content
      </a>
      {children}
    </div>
  );
}

export function HomeShell(props: HomeLayoutProps) {
  return <HomeLayout {...props} slots={{ container: Container }} />;
}
