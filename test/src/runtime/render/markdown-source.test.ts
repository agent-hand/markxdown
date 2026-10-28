// @vitest-environment happy-dom
/**
 * 生テキストの面（`src/runtime/render/MarkdownSource.vue`）。
 *
 * `MarkdownView` と**同じ形**の位置の口（`defineExpose` の2つのメソッド）を出すこと、
 * 生テキストを1つの text ノードとして書いてある通りに出すこと、中身が無ければ `#empty` を出すこと。
 */
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { h } from 'vue';

import type { PositionPort } from '../../../../src/runtime/position/types';
import MarkdownSource from '../../../../src/runtime/render/MarkdownSource.vue';

const SOURCE = '# 見出し\n\n本文の**一行目**\n';

function mountSource(value: string | null, props: Record<string, unknown> = {}) {
  return mount(MarkdownSource, {
    props: { value, ...props },
    slots: { empty: () => h('p', { 'data-testid': 'empty' }, '空です') },
    attrs: { class: 'from-caller' },
    attachTo: document.body,
  });
}

function exposedOf(wrapper: ReturnType<typeof mountSource>): Record<string, unknown> | null {
  return (wrapper.vm.$ as { exposed: Record<string, unknown> | null }).exposed;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('生テキストをそのまま出す', () => {
  it('整形せず、1つの text ノードとして出す', () => {
    const pre = mountSource(SOURCE).get('[data-testid="document-source"]').element;

    expect(pre.tagName).toBe('PRE');
    expect(pre.childNodes).toHaveLength(1);
    expect(pre.textContent).toBe(SOURCE);
    expect(pre.querySelector('strong')).toBeNull();
  });

  it('呼ぶ側の `class` と `testid` を受ける。`surface` を寝かせると余白を持たない', () => {
    const wrapper = mountSource(SOURCE, { testid: 'other', surface: false });
    const pre = wrapper.get('[data-testid="other"]');

    expect(pre.classes()).toContain('from-caller');
    expect(pre.classes()).not.toContain('p-3');
  });
});

describe('位置の口', () => {
  it('`MarkdownView` と同じく、`toSourceRange` と `toDomRange` の2つだけを出す', () => {
    expect(Object.keys(exposedOf(mountSource(SOURCE)) ?? {}).sort()).toEqual(['toDomRange', 'toSourceRange']);
  });

  it('文字の対応は恒等で、両方向に引ける', () => {
    const wrapper = mountSource(SOURCE);
    const port = exposedOf(wrapper) as unknown as PositionPort;
    const text = wrapper.get('pre').element.firstChild!;

    const range = document.createRange();
    range.setStart(text, 12);
    range.setEnd(text, 15);
    expect(port.toSourceRange(range)).toEqual({ start: 12, end: 15 });
    expect(port.toDomRange({ start: 2, end: 5 })!.toString()).toBe(SOURCE.slice(2, 5));
  });
});

describe('中身が無いとき', () => {
  it.each([null, ''])('%j: `#empty` を出し、口はどちらの向きも null', (value) => {
    const wrapper = mountSource(value);
    const port = exposedOf(wrapper) as unknown as PositionPort;
    const range = document.createRange();
    range.selectNodeContents(document.body);

    expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
    expect(wrapper.find('pre').exists()).toBe(false);
    expect(port.toSourceRange(range)).toBeNull();
    expect(port.toDomRange({ start: 0, end: 0 })).toBeNull();
  });
});
