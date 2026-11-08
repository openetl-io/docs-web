import type { Blockquote, Root, RootContent } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { visit } from 'unist-util-visit';

// GitHub's alert kinds, each with the Callout type and title the site shows.
const kinds: Record<string, { type: string; title: string }> = {
  NOTE: { type: 'info', title: 'Note' },
  TIP: { type: 'idea', title: 'Tip' },
  IMPORTANT: { type: 'info', title: 'Important' },
  WARNING: { type: 'warning', title: 'Warning' },
  CAUTION: { type: 'error', title: 'Caution' },
};

const marker = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(\r?\n|$)/;

// Turns a blockquote that starts with GitHub's alert syntax, `> [!NOTE]`,
// into a Callout, the way GitHub renders one.
export function remarkGitHubAlerts() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
      if (index === undefined || !parent) return;
      const first = node.children[0];
      if (first?.type !== 'paragraph') return;
      const text = first.children[0];
      if (text?.type !== 'text') return;
      const m = marker.exec(text.value);
      if (!m) return;

      text.value = text.value.slice(m[0].length);
      if (text.value === '') first.children.shift();
      if (first.children[0]?.type === 'break') first.children.shift();
      if (first.children.length === 0) node.children.shift();

      const kind = kinds[m[1]];
      const callout: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'Callout',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'type', value: kind.type },
          { type: 'mdxJsxAttribute', name: 'title', value: kind.title },
        ],
        children: node.children,
      };
      parent.children[index] = callout as RootContent;
    });
  };
}
