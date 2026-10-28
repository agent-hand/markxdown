/** `#ui/components/Skeleton.vue` の代わり。中身を `div` に入れるだけ */
import { defineComponent, h } from 'vue';

export default defineComponent({
  name: 'USkeleton',
  props: { ui: Object },
  setup(_props, { slots }) {
    return () => h('div', slots.default?.());
  },
});
