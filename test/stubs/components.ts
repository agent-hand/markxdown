/**
 * `#components` の解決先（単体テスト用）。`vitest.config.ts` の alias が指す。
 *
 * - `MDCRenderer`: 何も描かない。`MarkdownView` のテストは `<MDC>` をスタブに差し替え、
 *   スロットの中まで見るテストだけが `global.stubs` で描くスタブに替える。
 * - `ProsePre`: `@nuxt/ui` の `prose/Pre.vue` の**形だけ**を写す。入れ物の `div`（単一の根
 *   なので属性が落ちる）と、`v-bind="$attrs"` を持つ `pre` の両方に同じ属性が付く。
 *   `code` `language` などは props で吸われて属性に出ない。位置の口はこの形を前提に
 *   読むので（`src/runtime/position/preview.ts` の `WRAPPER_TAG`）、ここを崩さないこと。
 */
import { defineComponent, h } from 'vue';

export const MDCRenderer = defineComponent({
  name: 'MDCRenderer',
  render: () => null,
});

export const ProsePre = defineComponent({
  name: 'ProsePre',
  props: {
    icon: { type: null, required: false },
    code: { type: String, required: false },
    language: { type: String, required: false },
    filename: { type: String, required: false },
    highlights: { type: Array, required: false },
    hideHeader: { type: Boolean, required: false },
    meta: { type: String, required: false },
    copy: { type: [Boolean, Object], required: false, default: true },
    class: { type: null, required: false },
    ui: { type: Object, required: false },
  },
  setup(props, { attrs, slots }) {
    return () => h('div', [h('pre', { ...attrs, class: props.class }, slots.default?.())]);
  },
});
