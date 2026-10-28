import { fileURLToPath } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

const stub = (path: string): string => fileURLToPath(new URL(`./test/stubs/${path}`, import.meta.url));

/**
 * `@nuxt/test-utils` の `defineVitestConfig` は使わない。あれはこの package のルートで Nuxt を
 * 読み込み、その Nuxt の登録を元に `#components` の import を書き換える。ルートの Nuxt には
 * `@nuxt/ui` も markxdown も載っていないので `ProsePre` が見つからず、変換の段で落ちる
 * （実測: `[unimport] failed to find "ProsePre" imported from "#components"`）。
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    // `src/runtime/` は Nuxt の specifier（`#imports` / `#components` / `#ui/...`）を import する。
    // 単体テストでは解決先を `test/stubs/` に置き換える。スタブが真似るのは、package が頼っている
    // 形（`ProsePre` が入れ物の `div` と `pre` の両方に属性を出す、など）だけである。
    alias: [
      { find: '#imports', replacement: stub('imports.ts') },
      { find: '#components', replacement: stub('components.ts') },
      { find: /^#ui\/components\/(\w+)\.vue$/, replacement: stub('ui/$1.ts') },
    ],
  },
  test: {
    // 既定は node。DOM が要るファイルだけ `// @vitest-environment happy-dom` を付ける。
    // テストは `test/` に置き、写し元の構造をそのまま写す
    // （`src/runtime/position/plain.ts` ↔ `test/src/runtime/position/plain.test.ts`）。
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
  },
});
