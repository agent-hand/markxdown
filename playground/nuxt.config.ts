export default defineNuxtConfig({
  // markxdown は @nuxt/ui より前に並べる。@nuxt/ui は setup の時点で
  // `@nuxtjs/mdc` が入っているかを見て Prose 一式を登録するため
  modules: ['@agent-hand/markxdown', '@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',
  // 本家の ThemeProvider の初期値に合わせてダーク（stroke-board の nuxt.config.ts と同じ）
  colorMode: { preference: 'dark', fallback: 'dark' },
  // playground は Web フォントを取りに行かない（@nuxt/fonts がネットワークへ出る）
  ui: { fonts: false },
  // package の `src/` を playground の型検査に入れる（`yarn test:types`）。root の `.nuxt` には
  // `@nuxt/ui` が載らず `#ui/components/*.vue` が解けないため、`@nuxt/ui` を載せたここで検査する。
  // path は `playground/.nuxt/` から見た相対
  typescript: { tsConfig: { include: ['../../src/**/*'] } },
});
