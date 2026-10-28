// @vitest-environment happy-dom
/**
 * 整形された本文の面（`src/runtime/render/MarkdownView.vue`）のうち、位置の対応以外の約束。
 *
 * - 中身が無ければ `#empty` を出す（呼ぶ側が渡したものがそのまま出る）
 * - 呼ぶ側の `class` を器へ足す。`testid` の既定は `document-content`
 *
 * 位置の対応・`<MDC>` に解析を残すこと・`sourceShown` の写しは
 * `markdown-view-position.test.ts` と `markdown-view-source-shown.test.ts` が持つ。
 *
 * `<MDC>` はスタブに差し替える（解析と shiki を単体テストへ引き込まない）。
 */
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';

import type { PositionPort } from '../../../../src/runtime/position/types';
import MarkdownView from '../../../../src/runtime/render/MarkdownView.vue';
import { parse, type AstNode } from '../../../support/parse';

/** `<MDC>` が作られた回数 */
const mdc = { count: 0 };

/** `<MDC>` の代わり。渡された AST をスロットへ流す */
function mdcStub(body: AstNode | null) {
  return defineComponent({
    name: 'MDC',
    props: { value: String, parserOptions: Object },
    setup(_props, { slots }) {
      mdc.count += 1;
      return () => h('div', body ? slots.default?.({ body, data: {} }) : []);
    },
  });
}

async function mountView(value: string | null) {
  const body = value ? await parse(value) : null;
  return mount(MarkdownView, {
    props: { value },
    slots: { empty: () => h('p', { 'data-testid': 'empty' }, '空です') },
    attrs: { class: 'from-caller' },
    attachTo: document.body,
    global: { stubs: { MDC: mdcStub(body) } },
  });
}

/** `defineExpose` が出したものだけ（`wrapper.vm` は setup の束縛まで見えてしまう） */
function portOf(wrapper: Awaited<ReturnType<typeof mountView>>): PositionPort {
  return (wrapper.vm.$ as { exposed: unknown }).exposed as PositionPort;
}

beforeEach(() => {
  document.body.innerHTML = '';
  mdc.count = 0;
});

const SOURCE = 'まえ\n\nいろは**太字**にほへと\n';

describe('中身が無いとき', () => {
  it.each([null, ''])('%j: `#empty` を出し、`<MDC>` は描かず、口はどちらの向きも null', async (value) => {
    const wrapper = await mountView(value);
    const port = portOf(wrapper);
    const range = document.createRange();
    range.selectNodeContents(document.body);

    expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="document-content"]').exists()).toBe(false);
    expect(mdc.count).toBe(0);
    expect(port.toSourceRange(range)).toBeNull();
    expect(port.toDomRange({ start: 0, end: 1 })).toBeNull();
  });
});

describe('器', () => {
  it('呼ぶ側の `class` を器へ足す。`testid` の既定は `document-content`', async () => {
    const wrapper = await mountView(SOURCE);
    const container = wrapper.find('[data-testid="document-content"]');

    expect(container.classes()).toContain('from-caller');
    expect(container.classes()).toContain('prose');
  });
});
