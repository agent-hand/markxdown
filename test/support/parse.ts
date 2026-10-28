/**
 * 解析の道具。`parseMarkdown` を package と同じ設定で呼ぶ。
 *
 * `test/support/` はテストではないファイルの置き場で、テストから import される道具だけを置く
 * （`vitest.config.ts` の `include` は `*.test.ts` だけを拾う）。
 */
import { parseMarkdown } from '@nuxtjs/mdc/runtime';

import markxdown from '../../src/module';

export interface AstNode {
  type: string;
  tag?: string;
  props?: Record<string, unknown>;
  children?: AstNode[];
  value?: string;
  position?: { start: number; end: number };
}

/**
 * module の既定値を `parseMarkdown` の設定へ写したもの。
 *
 * `@nuxtjs/mdc` は module の `rehypePlugins` を `rehype.plugins` として parser に渡す
 * （`@nuxtjs/mdc/dist/runtime/parser/index.js` の `rehype: { plugins: moduleOptions?.rehypePlugins }`）。
 * 値を手で書かずに module から引くので、既定値を変えればここも変わる。
 * `keepPosition` は module の設定ではなく `MarkdownView` が `<MDC>` の `parser-options` で渡すもの。
 */
export async function parseOptions(): Promise<Parameters<typeof parseMarkdown>[1]> {
  const nuxt = { options: {} } as unknown as Parameters<NonNullable<typeof markxdown.getOptions>>[1];
  const options = await markxdown.getOptions!({}, nuxt);
  return {
    keepPosition: true,
    rehype: { plugins: options.rehypePlugins },
  } as unknown as Parameters<typeof parseMarkdown>[1];
}

/** 解析して AST を返す（位置の印はまだ付けない） */
export async function parse(source: string): Promise<AstNode> {
  const { body } = await parseMarkdown(source, await parseOptions());
  return body as unknown as AstNode;
}

/** 木を平らにする */
export function flatten(node: AstNode, out: AstNode[] = []): AstNode[] {
  out.push(node);
  for (const child of node.children ?? []) flatten(child, out);
  return out;
}

/** 木を掘って最初に見つかった tag のノード */
export function find(node: AstNode, tag: string): AstNode | undefined {
  return flatten(node).find((n) => n.tag === tag);
}
