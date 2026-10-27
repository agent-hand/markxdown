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
});
