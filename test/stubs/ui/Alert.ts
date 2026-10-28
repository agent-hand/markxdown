/** `#ui/components/Alert.vue` の代わり。題と `#description` を並べるだけ */
import { defineComponent, h } from 'vue';

export default defineComponent({
  name: 'UAlert',
  props: { title: String, color: String, variant: String, ui: Object },
  setup(props, { slots }) {
    return () => h('div', [props.title, slots.description?.()]);
  },
});
