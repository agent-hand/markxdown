/** `#ui/components/Textarea.vue` の代わり。`v-model` だけを持つ `textarea` */
import { defineComponent, h } from 'vue';

export default defineComponent({
  name: 'UTextarea',
  props: { modelValue: String, variant: String, fixed: Boolean, ui: Object },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('textarea', {
        value: props.modelValue,
        onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
      });
  },
});
