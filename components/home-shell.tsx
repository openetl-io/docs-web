'use client';

import { HomeLayout, type HomeLayoutProps } from 'fumadocs-ui/layouts/home';
import type { ComponentProps } from 'react';

// HomeLayout's default container is a main. Pages provide their own main,
// so use a neutral container to keep a single main landmark per page.
function Container({ ref: _ref, className, children, ...props }: ComponentProps<'main'>) {
  return (
    <div {...props} className={`home-shell flex flex-1 flex-col ${className ?? ''}`}>
      <a href="#main-content" className="home-skip">Skip to content</a>
      {children}
    </div>
  );
}

export function HomeShell(props: HomeLayoutProps) {
  return <HomeLayout {...props} slots={{ container: Container }} />;
}
