/**
 * `#imports` の解決先（単体テスト用）。`vitest.config.ts` の alias が指す。
 *
 * `src/runtime/` が `#imports` から引くのは Vue の API（`useTemplateRef` / `computed` /
 * `ref` / `watch`）と、図が使う `useColorMode` だけである。Vue の分は本物を通し、
 * `useColorMode` だけを置く（`@nuxtjs/color-mode` はテストで立てない）。
 */
import { ref } from 'vue';

export * from 'vue';

export function useColorMode() {
  return ref('dark');
}
