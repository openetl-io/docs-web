import { Callout } from 'fumadocs-ui/components/callout';
import { ImageZoom, Lightbox } from 'fumadocs-ui/components/image-zoom';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Mermaid } from './mermaid';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Callout,
    img: ({ src, ...props }) => {
      if (src instanceof Blob) return <img src={src} {...props} />;
      return (
        <Lightbox>
          <ImageZoom src={src} {...props} />
        </Lightbox>
      );
    },
    Mermaid,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
