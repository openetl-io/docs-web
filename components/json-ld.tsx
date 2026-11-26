// Structured data, rendered into the page's HTML. JSON.stringify leaves a `<`
// as it is, which could end the script early, so it's escaped.
export function JsonLd({ data }: { data: object | undefined }) {
  if (!data) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
