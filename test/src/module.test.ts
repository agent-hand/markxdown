/**
 * `src/module.ts` が利用側（Nuxt アプリ）へ約束していることを固定する。
 *
 * - 設定の口: `configKey: 'markxdown'`、既定値、利用側が上書きしたときに `@nuxtjs/mdc` へ渡る値
 * - 登録するもの: `#markdown` alias、`MarkxdownFence` の global 登録、`appConfig.ui` の Prose theme、
 *   `components:dirs` での `@nuxtjs/mdc` 側 Prose の priority 調整
 * - CSS の配布: `dist/runtime/index.css` と `package.json` の `exports`
 *
 * **module は `@nuxt/kit` の本物の `defineNuxtModule` を通して呼ぶ。** 置き換えるのは外へ出ていく
 * 2つ（`installModule` / `addComponent`）だけで、それを控えて値を見る。利用側の設定は
 * `nuxt.options.markxdown`（`configKey` の置き場）に置くので、`configKey` の経路もここで通る。
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { addComponent, installModule } from '@nuxt/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import markxdown, { type ModuleOptions } from '../../src/module';

vi.mock('@nuxt/kit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nuxt/kit')>();
  return {
    ...actual,
    installModule: vi.fn(async () => undefined),
    addComponent: vi.fn(),
  };
});

const installModuleMock = vi.mocked(installModule);
const addComponentMock = vi.mocked(addComponent);

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

type Hook = (...args: unknown[]) => unknown;

interface FakeNuxt {
  options: {
    alias: Record<string, string>;
    appConfig: Record<string, unknown>;
    markxdown?: ModuleOptions;
    [key: string]: unknown;
  };
  hooks: { addHooks: () => void };
  hook: ReturnType<typeof vi.fn>;
  /** `nuxt.hook(name, fn)` で登録されたもの */
  registered: Map<string, Hook[]>;
}

function fakeNuxt(options: Partial<FakeNuxt['options']> = {}): FakeNuxt {
  const registered = new Map<string, Hook[]>();
  return {
    options: { alias: {}, appConfig: {}, ...options },
    hooks: { addHooks: () => undefined },
    hook: vi.fn((name: string, fn: Hook) => {
      registered.set(name, [...(registered.get(name) ?? []), fn]);
    }),
    registered,
  };
}

async function run(nuxt: FakeNuxt, inline: ModuleOptions = {}): Promise<void> {
  await markxdown(inline, nuxt as unknown as Parameters<typeof markxdown>[1]);
}

/** `installModule('@nuxtjs/mdc', …)` に渡った設定 */
function mdcOptions(): Record<string, unknown> {
  const call = installModuleMock.mock.calls.find(([name]) => name === '@nuxtjs/mdc');
  expect(call, '`@nuxtjs/mdc` が入れられていない').toBeDefined();
  return call![1] as Record<string, unknown>;
}

const DEFAULTS = {
  headings: { anchorLinks: false },
  rehypePlugins: { 'rehype-raw': false },
  components: { prose: true, map: { pre: 'MarkxdownFence' } },
};

beforeEach(() => {
  installModuleMock.mockClear();
  addComponentMock.mockClear();
});

describe('設定の口', () => {
  it('`configKey` は `markxdown`', async () => {
    const meta = await markxdown.getMeta!();

    expect(meta.name).toBe('markxdown');
    expect(meta.configKey).toBe('markxdown');
  });

  it('何も渡さなければ、既定値がそのまま `@nuxtjs/mdc` へ渡る', async () => {
    await run(fakeNuxt());

    expect(mdcOptions()).toEqual(DEFAULTS);
  });

  it('`nuxt.options.markxdown` で上書きした項目だけが変わる', async () => {
    await run(fakeNuxt({ markxdown: { headings: { anchorLinks: true } } }));

    expect(mdcOptions()).toEqual({ ...DEFAULTS, headings: { anchorLinks: true } });
  });

  it('`rehype-raw` を利用側が有効にすれば、その値が渡る', async () => {
    await run(fakeNuxt({ markxdown: { rehypePlugins: { 'rehype-raw': {} } } }));

    expect(mdcOptions()).toEqual({ ...DEFAULTS, rehypePlugins: { 'rehype-raw': {} } });
  });

  it('`components.map` に足した分は既定の `pre` と並ぶ', async () => {
    await run(fakeNuxt({ markxdown: { components: { map: { h1: 'MyHeading' } } } }));

    expect(mdcOptions().components).toEqual({ prose: true, map: { pre: 'MarkxdownFence', h1: 'MyHeading' } });
  });

  it('`components.map.pre` を利用側が指定すれば、その値が勝つ', async () => {
    await run(fakeNuxt({ markxdown: { components: { map: { pre: 'MyPre' } } } }));

    expect(mdcOptions().components).toEqual({ prose: true, map: { pre: 'MyPre' } });
  });

  it('`modules` に直に渡した設定は `nuxt.options.markxdown` より勝つ', async () => {
    await run(fakeNuxt({ markxdown: { headings: { anchorLinks: true } } }), {
      headings: { anchorLinks: { h2: true } },
    });

    expect(mdcOptions().headings).toEqual({ anchorLinks: { h2: true } });
  });
});

describe('module が登録するもの', () => {
  it('`#markdown` は `runtime` を指す', async () => {
    const nuxt = fakeNuxt();
    await run(nuxt);

    expect(nuxt.options.alias['#markdown']).toBe(resolve(ROOT, 'src/runtime'));
  });

  it('フェンスの振り分け（`MarkxdownFence`）を global に登録する。`components.map.pre` と同じ名前', async () => {
    await run(fakeNuxt());

    expect(addComponentMock).toHaveBeenCalledWith({
      name: 'MarkxdownFence',
      filePath: resolve(ROOT, 'src/runtime/render/MarkxdownFence.vue'),
      global: true,
    });
    const { filePath, name } = addComponentMock.mock.calls[0]![0];
    expect(existsSync(filePath)).toBe(true);
    expect((mdcOptions().components as { map: { pre: string } }).map.pre).toBe(name);
  });

  it('本文の theme を `appConfig.ui.prose` へ入れる', async () => {
    const nuxt = fakeNuxt();
    await run(nuxt);

    const prose = (nuxt.options.appConfig.ui as { prose: Record<string, unknown> }).prose;
    expect(Object.keys(prose).sort()).toEqual(
      ['a', 'blockquote', 'code', 'h1', 'pre', 'table', 'tbody', 'td', 'th', 'thead', 'tr'].sort(),
    );
    expect(prose.pre).toMatchObject({ slots: { root: expect.any(String), base: expect.any(String) } });
  });

  it('先に入っている `appConfig.ui` は残り、同じ項目は先に入っている値が勝つ', async () => {
    const nuxt = fakeNuxt({
      appConfig: { ui: { colors: { primary: 'green' }, prose: { h1: { slots: { base: 'user-h1' } } } } },
    });
    await run(nuxt);

    const ui = nuxt.options.appConfig.ui as {
      colors: unknown;
      prose: { h1: { slots: { base: string } }; pre: unknown };
    };
    expect(ui.colors).toEqual({ primary: 'green' });
    expect(ui.prose.h1.slots.base).toBe('user-h1');
    expect(ui.prose.pre).toBeDefined();
  });

  describe('`components:dirs` で `@nuxtjs/mdc` の Prose を後回しにする', () => {
    /** `@nuxtjs/mdc` が `addComponentsDir` に渡す実際の置き場（`dist/module.mjs` の `./runtime/components/prose`） */
    const MDC_PROSE = resolve(ROOT, 'node_modules/@nuxtjs/mdc/dist/runtime/components/prose');
    /** `@nuxt/ui` の Prose の置き場。こちらは触らない */
    const UI_PROSE = '/app/node_modules/@nuxt/ui/dist/runtime/components/prose';

    async function dirsAfterHook(dirs: unknown[]): Promise<unknown[]> {
      const nuxt = fakeNuxt();
      await run(nuxt);
      const hooks = nuxt.registered.get('components:dirs') ?? [];
      expect(hooks).toHaveLength(1);
      for (const hook of hooks) await hook(dirs);
      return dirs;
    }

    it('想定している置き場が実在する', () => {
      expect(existsSync(resolve(MDC_PROSE, 'ProsePre.vue'))).toBe(true);
    });

    it('`@nuxtjs/mdc` の Prose だけ priority を下げ、`@nuxt/ui` の Prose が名前を取る', async () => {
      const mdc = { path: MDC_PROSE, prefix: '' };
      const ui = { path: UI_PROSE, prefix: '' };
      const mdcOther = { path: resolve(ROOT, 'node_modules/@nuxtjs/mdc/dist/runtime/components'), prefix: '' };

      await dirsAfterHook(['~/components', mdc, mdcOther, ui]);

      expect(mdc).toMatchObject({ priority: -1 });
      expect(ui).not.toHaveProperty('priority');
      expect(mdcOther).not.toHaveProperty('priority');
    });

    it('文字列だけの登録や `path` を持たない登録は素通しする', async () => {
      const dirs = await dirsAfterHook(['~/components', { prefix: 'x' }]);

      expect(dirs).toEqual(['~/components', { prefix: 'x' }]);
    });
  });
});

/**
 * **`dist/` を見る。`yarn build` の後に走らせること。** 利用側が受け取るのは `dist/` で、
 * `src/` ではない。`dist/` が無ければここは落ちる（読み飛ばさない）。
 */
describe('CSS の配布', () => {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
    style?: string;
    exports: Record<string, Record<string, string>>;
  };

  it('`exports` の `style` 条件と `style` が同じ CSS の入口を指し、それが `dist/` に在る', () => {
    expect(pkg.exports['.']?.style).toBe('./dist/runtime/index.css');
    expect(pkg.style).toBe(pkg.exports['.']?.style);
    expect(existsSync(resolve(ROOT, 'dist/runtime/index.css')), '`yarn build` を先に走らせること').toBe(true);
  });

  it('入口の CSS は `@source` を持ち、それが配布された runtime の部品を覆う', () => {
    const entry = resolve(ROOT, 'dist/runtime/index.css');
    const css = readFileSync(entry, 'utf8');

    const sources = [...css.matchAll(/@source\s+"([^"]+)"/g)].map((m) => resolve(dirname(entry), m[1]!));
    expect(sources.length).toBeGreaterThan(0);

    for (const component of ['render/MarkdownView.vue', 'render/MarkxdownFence.vue', 'edit/MarkdownEditor.vue']) {
      const file = resolve(ROOT, 'dist/runtime', component);
      expect(existsSync(file), `${component} が配布されていない`).toBe(true);
      expect(sources.some((dir) => file.startsWith(`${dir}/`)),component).toBe(true);
    }
  });

  it('入口の CSS が `@import` する先も配布されている', () => {
    const entry = resolve(ROOT, 'dist/runtime/index.css');
    const imports = [...readFileSync(entry, 'utf8').matchAll(/@import\s+"([^"]+)"/g)].map((m) => m[1]!);

    expect(imports.length).toBeGreaterThan(0);
    for (const path of imports) expect(existsSync(resolve(dirname(entry), path)), path).toBe(true);
  });
});
