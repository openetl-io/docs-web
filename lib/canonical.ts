// Which of the versions' copies of a docs page search engines should index.
// No imports, so it can be tried on its own with a list of made-up pages.

// The slugs of the page a docs page names as canonical: the same page in the
// default version, when that version has it, so that next's and stable's
// copies of a page aren't indexed as two; otherwise the page's own. A page
// that only one version has is its own canonical, wherever it is.
//
// slugs are a page's, with its version first, such as ['next', 'use', 'cli'];
// exists says whether a page has the given slugs.
export function canonicalSlugs(
  slugs: string[],
  defaultVersion: string,
  exists: (slugs: string[]) => boolean,
): string[] {
  const [version, ...rest] = slugs;
  if (version === undefined || version === defaultVersion) return slugs;
  const inDefault = [defaultVersion, ...rest];
  return exists(inDefault) ? inDefault : slugs;
}
