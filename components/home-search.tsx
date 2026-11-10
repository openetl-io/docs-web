'use client';

import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { Search } from 'lucide-react';

export function HomeSearch() {
  const { setOpenSearch, hotKey } = useSearchContext();

  return (
    <button
      type="button"
      className="home-search"
      onClick={() => setOpenSearch(true)}
      aria-haspopup="dialog"
    >
      <Search aria-hidden="true" size={19} />
      <span>Search the documentation</span>
      <span className="home-search-shortcut" aria-hidden="true">
        {hotKey.map((key, index) => <kbd key={index}>{key.display}</kbd>)}
      </span>
    </button>
  );
}
