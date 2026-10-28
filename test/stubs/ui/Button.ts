/** `#ui/components/Button.vue` の代わり。`button` を1つ描き、属性とクリックを素通しする */
import { defineComponent, h } from 'vue';

export default defineComponent({
  name: 'UButton',
  props: { size: String, color: String, variant: String, ui: Object },
  setup(_props, { slots }) {
    return () => h('button', slots.default?.());
  },
});
