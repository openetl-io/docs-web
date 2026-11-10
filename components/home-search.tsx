'use client';

import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { Search } from 'lucide-react';

export function HomeSearch() {
  const { setOpenSearch, hotKey } = useSearchContext();

  return (
    <button
      type="button"
      className="text-fd-muted-foreground bg-fd-secondary/50 hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:ring-fd-ring flex min-h-11 w-full max-w-md cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
      onClick={() => setOpenSearch(true)}
      aria-haspopup="dialog"
    >
      <Search aria-hidden="true" size={19} />
      <span>Search the documentation</span>
      <span className="ms-auto flex gap-0.5" aria-hidden="true">
        {hotKey.map((key, index) => (
          <kbd key={index} className="bg-fd-background rounded-md border px-1.5 text-xs">
            {key.display}
          </kbd>
        ))}
      </span>
    </button>
  );
}
