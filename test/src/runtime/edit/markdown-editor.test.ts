// @vitest-environment happy-dom
/**
 * 文書を直して保存するコンポーネント（`src/runtime/edit/MarkdownEditor.vue`）。
 *
 * 保存そのものは package の責務ではない。受け取った `save` を呼ぶだけで、保存先も可否も
 * 呼ぶ側が決める。中身が無いときに何を出すかも呼ぶ側で、`#empty` を素通しする。
 *
 * `UButton` / `UTextarea` は `test/stubs/ui/` のスタブ、本文の `<MDC>` は解析しないスタブ。
 */
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import MarkdownEditor from '../../../../src/runtime/edit/MarkdownEditor.vue';

/** `<MDC>` の代わり。受けた字をそのまま出す */
const MDC = defineComponent({
  name: 'MDC',
  props: { value: String, parserOptions: Object },
  setup: (props) => () => h('div', { 'data-testid': 'mdc' }, props.value),
});

type Save = (content: string) => Promise<string | null>;

/**
 * 既定では `canSave: true` を渡す。`canSave` は boolean の props なので、省略すると Vue が
 * `false` に落とし「保存できない」側になる。呼ぶ側は常に明示する前提で扱う。
 */
function mountEditor(props: { content: string | null; save?: Save; canSave?: boolean; editOnOpen?: boolean }) {
  const save = props.save ?? vi.fn<Save>(async () => null);
  const wrapper = mount(MarkdownEditor, {
    props: { canSave: true, ...props, save },
    slots: { empty: () => h('p', { 'data-testid': 'empty' }, 'まだ作られていません') },
    attachTo: document.body,
    global: { stubs: { MDC } },
  });
  return { wrapper, save };
}

const button = (wrapper: ReturnType<typeof mountEditor>['wrapper'], id: string) => wrapper.find(`[data-testid="${id}"]`);

async function edit(wrapper: ReturnType<typeof mountEditor>['wrapper'], text: string): Promise<void> {
  await button(wrapper, 'document-edit').trigger('click');
  await wrapper.get('textarea').setValue(text);
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('`save` を呼ぶ', () => {
  it('直した内容で `save` を呼び、成功したら保存済みになる', async () => {
    const { wrapper, save } = mountEditor({ content: '# 元\n' });

    await edit(wrapper, '# 直した\n');
    expect(wrapper.get('[data-dirty]').attributes('data-dirty')).toBe('true');

    await button(wrapper, 'document-save').trigger('click');
    await flushPromises();

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('# 直した\n');
    expect(wrapper.get('[data-dirty]').attributes('data-dirty')).toBe('false');
    expect(button(wrapper, 'document-saved').exists()).toBe(true);
  });

  it('`save` が理由を返したら失敗として出し、直しかけを捨てない', async () => {
    const { wrapper } = mountEditor({ content: '# 元\n', save: async () => '書き込めません' });

    await edit(wrapper, '# 直した\n');
    await button(wrapper, 'document-save').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="document-save-error"]').text()).toBe('書き込めません');
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('# 直した\n');
    expect(wrapper.get('[data-dirty]').attributes('data-dirty')).toBe('true');
  });

  it('`canSave` が偽なら保存できない', async () => {
    const { wrapper, save } = mountEditor({ content: '# 元\n', canSave: false });

    await edit(wrapper, '# 直した\n');
    await button(wrapper, 'document-save').trigger('click');
    await flushPromises();

    expect(button(wrapper, 'document-save').attributes()).toHaveProperty('disabled');
    expect(button(wrapper, 'document-cannot-save').exists()).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });
});

describe('内容が変わっていないとき', () => {
  it('保存できず、`save` は呼ばれない', async () => {
    const { wrapper, save } = mountEditor({ content: '# 元\n' });

    await button(wrapper, 'document-edit').trigger('click');
    await button(wrapper, 'document-save').trigger('click');
    await flushPromises();

    expect(button(wrapper, 'document-save').attributes()).toHaveProperty('disabled');
    expect(save).not.toHaveBeenCalled();
  });

  it('直して元に戻したら、変更なしに戻る（操作の有無ではなく内容で比べる）', async () => {
    const { wrapper, save } = mountEditor({ content: '# 元\n' });

    await edit(wrapper, '# 直した\n');
    await wrapper.get('textarea').setValue('# 元\n');
    await button(wrapper, 'document-save').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-dirty]').attributes('data-dirty')).toBe('false');
    expect(button(wrapper, 'document-unsaved').exists()).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it('「やめる」は直しかけを捨てて読みに戻る', async () => {
    const { wrapper } = mountEditor({ content: '# 元\n' });

    await edit(wrapper, '# 直した\n');
    await button(wrapper, 'document-cancel').trigger('click');

    expect(wrapper.find('textarea').exists()).toBe(false);
    expect(wrapper.get('[data-testid="mdc"]').text()).toBe('# 元');
    expect(wrapper.get('[data-dirty]').attributes('data-dirty')).toBe('false');
  });
});

describe('`#empty` は呼ぶ側へ素通しする', () => {
  it('内容が無ければ呼ぶ側の `#empty` を出し、編集の口を出さない', () => {
    const { wrapper } = mountEditor({ content: null });

    expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
    expect(button(wrapper, 'document-edit').exists()).toBe(false);
  });

  it('直しかけを空にしてプレビューしても、呼ぶ側の `#empty` を出す', async () => {
    const { wrapper } = mountEditor({ content: '# 元\n' });

    await edit(wrapper, '');
    await button(wrapper, 'document-preview').trigger('click');

    expect(wrapper.find('[data-testid="empty"]').exists()).toBe(true);
  });

  it('プレビューは保存済みではなく直しかけを描く', async () => {
    const { wrapper } = mountEditor({ content: '# 元\n' });

    await edit(wrapper, '# 直した\n');
    await button(wrapper, 'document-preview').trigger('click');

    expect(wrapper.get('[data-testid="mdc"]').text()).toBe('# 直した');
  });
});

describe('開き方と文書の切り替え', () => {
  it('`editOnOpen` なら開いた時点で編集に入る', () => {
    const { wrapper } = mountEditor({ content: '# 元\n', editOnOpen: true });

    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('別の文書へ切り替えたら、前の直しかけを引きずらない', async () => {
    const { wrapper } = mountEditor({ content: '# 元\n' });

    await edit(wrapper, '# 直した\n');
    await wrapper.setProps({ content: '# 別の文書\n' });

    expect(wrapper.find('textarea').exists()).toBe(false);
    expect(wrapper.get('[data-dirty]').attributes('data-dirty')).toBe('false');
    expect(wrapper.get('[data-testid="mdc"]').text()).toBe('# 別の文書');
  });
});
