# markxdown

markdown を描く・直す・位置を出す、を `@nuxt/ui` の上で提供する Nuxt module。
package 名は `@agent-hand/markxdown`、module 名と `configKey` はどちらも `markxdown`。

## 設置

`nuxt.config.ts` の `modules` には `@agent-hand/markxdown` を `@nuxt/ui` より前に並べる。

```ts
export default defineNuxtConfig({
  modules: ['@agent-hand/markxdown', '@nuxt/ui'],
});
```

`main.css` には `@import "@nuxt/ui";` の後に1行足す。

```css
@import "tailwindcss";
@import "@nuxt/ui";
@import "@agent-hand/markxdown";
```

## 開発

```sh
yarn install
yarn dev        # playground を起動する
yarn build      # dist/ を作る
yarn test
```
