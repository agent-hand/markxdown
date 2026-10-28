// @vitest-environment happy-dom
/**
 * フェンスの振り分け（`src/runtime/render/MarkxdownFence.vue`）。
 *
 * `@nuxtjs/mdc` は `components.map.pre` に従って、`pre` ノードの props（`language` / `code` /
 * 位置の印など）をこのコンポーネントへ属性で渡す。mermaid のフェンスだけが図
 * （`MarkdownDiagram`）へ回り、それ以外は `@nuxt/ui` の `ProsePre` へ行く。
 *
 * `ProsePre` は `test/stubs/components.ts` のスタブ（`@nuxt/ui` 実物の形の写し）。図は
 * サーバー側の枝（`import.meta.client` が偽）で描かれるので、mermaid は動かない。
 */
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { h } from 'vue';

import { SOURCE_END_ATTR, SOURCE_START_ATTR } from '../../../../src/runtime/position/source-span';
import type { SourceRange } from '../../../../src/runtime/position/types';
import MarkdownDiagram from '../../../../src/runtime/render/MarkdownDiagram.vue';
import MarkxdownFence from '../../../../src/runtime/render/MarkxdownFence.vue';
import { SOURCE_SHOWN_KEY } from '../../../../src/runtime/render/source-shown';

function mountFence(attrs: Record<string, unknown>, options: { shown?: SourceRange[]; slot?: string } = {}) {
  return mount(MarkxdownFence, {
    attrs,
    slots: options.slot ? { default: () => h('code', options.slot) } : undefined,
    global: { provide: options.shown ? { [SOURCE_SHOWN_KEY as symbol]: options.shown } : {} },
  });
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('mermaid のフェンスだけが図へ回る', () => {
  it('`language` が mermaid なら `MarkdownDiagram` に `code` を渡す。コードブロックは出ない', () => {
    const wrapper = mountFence({ language: 'mermaid', code: 'graph TD;\n  A-->B;\n' });

    expect(wrapper.findComponent(MarkdownDiagram).props('code')).toBe('graph TD;\n  A-->B;\n');
    expect(wrapper.find('[data-testid="mermaid-loading"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="code-block"]').exists()).toBe(false);
    expect(wrapper.find('pre').exists()).toBe(false);
  });

  it.each([['ts'], ['text'], ['mermaidx'], ['']])('`language` が %j なら `ProsePre` へ行く', (language) => {
    const wrapper = mountFence({ language, code: 'const a = 1;\n' });

    expect(wrapper.findComponent(MarkdownDiagram).exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'ProsePre' }).exists()).toBe(true);
  });
});

describe('`ProsePre` へ渡すもの', () => {
  const ATTRS = {
    language: 'ts',
    code: 'const a = 1;\nconst b = 2;\n',
    [SOURCE_START_ATTR]: 10,
    [SOURCE_END_ATTR]: 50,
  };

  it('位置の印・`data-language` は `ProsePre` の入れ物の `div` と `pre` の両方に出る', () => {
    const pre = mountFence(ATTRS).get('pre').element;

    for (const element of [pre, pre.parentElement!]) {
      expect(element.getAttribute(SOURCE_START_ATTR)).toBe('10');
      expect(element.getAttribute(SOURCE_END_ATTR)).toBe('50');
      expect(element.getAttribute('data-language')).toBe('ts');
      expect(element.getAttribute('data-testid')).toBe('code-block-body');
    }
  });

  it('写すボタンと filename の header を出さない', () => {
    const props = mountFence({ ...ATTRS, filename: 'a.ts' }).findComponent({ name: 'ProsePre' }).props();

    expect(props.copy).toBe(false);
    expect(props.filename).toBeUndefined();
  });

  it('言語名の札は `ProsePre` の外に出る。フェンスの字に混ざらない', () => {
    const wrapper = mountFence(ATTRS);

    expect(wrapper.get('[data-testid="code-block-language"]').text()).toBe('TypeScript');
    expect(wrapper.get('pre').text()).not.toContain('TypeScript');
  });

  it('shiki を通っていなければ、`code` の末尾を落として行ごとの `span.line` を組む', () => {
    const lines = mountFence({ ...ATTRS, code: 'a\n\tb\n\n' }).findAll('pre span.line');

    expect(lines.map((line) => line.element.textContent)).toEqual(['a\n', '\tb']);
  });

  it('shiki を通っていれば（`class` に `shiki`）、受けた中身をそのまま渡す', () => {
    const wrapper = mountFence({ ...ATTRS, class: 'shiki github-dark' }, { slot: 'highlighted' });

    expect(wrapper.get('pre').text()).toBe('highlighted');
    expect(wrapper.find('pre span.line').exists()).toBe(false);
  });
});

describe('図に生テキストを添えるかどうか', () => {
  const MERMAID = { language: 'mermaid', code: 'graph TD;\n', [SOURCE_START_ATTR]: 10, [SOURCE_END_ATTR]: 30 };

  it('渡された範囲がフェンスの範囲と重なれば添える。範囲も図へ渡す', () => {
    const diagram = mountFence(MERMAID, { shown: [{ start: 12, end: 14 }] }).findComponent(MarkdownDiagram);

    expect(diagram.props('showSource')).toBe(true);
    expect(diagram.props('sourceRange')).toEqual({ start: 10, end: 30 });
  });

  it('重ならなければ添えない（端が触れているだけも重ならない）', () => {
    const diagram = mountFence(MERMAID, { shown: [{ start: 30, end: 40 }] }).findComponent(MarkdownDiagram);

    expect(diagram.props('showSource')).toBe(false);
  });

  it('範囲を渡す側が居なければ添えない', () => {
    expect(mountFence(MERMAID).findComponent(MarkdownDiagram).props('showSource')).toBe(false);
  });

  it('フェンスの位置が届かなければ添えない（推測で添えない）', () => {
    const diagram = mountFence({ language: 'mermaid', code: 'graph TD;\n' }, { shown: [{ start: 0, end: 999 }] })
      .findComponent(MarkdownDiagram);

    expect(diagram.props('showSource')).toBe(false);
    expect(diagram.props('sourceRange')).toBeNull();
  });
});
