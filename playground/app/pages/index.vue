<script setup lang="ts">
/**
 * markxdown の playground。module が公開する3つ（描く・直す・位置を出す）を1画面で確かめる。
 *
 * - 描く: `MarkdownView` に見出し・表・インラインコード・引用・コードブロック・mermaid を渡す
 * - 直す: `MarkdownEditor` に同じ本文を渡し、保存はこの画面のメモリへ書き戻す
 * - 位置を出す: `MarkdownView` の上で選択した範囲を `toSourceRange` で生テキストの位置に写し、
 *   `toDomRange` で DOM の範囲へ戻して選択し直す
 */
import { ref, useTemplateRef } from 'vue';

import MarkdownEditor from '#markdown/edit/MarkdownEditor.vue';
import MarkdownSource from '#markdown/render/MarkdownSource.vue';
import MarkdownView from '#markdown/render/MarkdownView.vue';

import type { SourceRange } from '#markdown/position/types';

const SAMPLE = `---
title: markxdown playground
---

# 見出し 1

段落。\`inline code\` と [リンク](https://example.com) と **強調**。

## 見出し 2

- 箇条書き 1
- 箇条書き 2

> 引用。

| 列 A | 列 B |
| --- | --- |
| a1 | b1 |
| a2 | b2 |

\`\`\`ts
const answer: number = 42;
console.log(answer);
\`\`\`

\`\`\`
language の無いフェンス
2 行目
\`\`\`

\`\`\`mermaid
graph TD
  A[開始] --> B[終了]
\`\`\`
`;

const content = ref(SAMPLE);

async function save(next: string): Promise<string | null> {
  content.value = next;
  return null;
}

const view = useTemplateRef<InstanceType<typeof MarkdownView>>('view');
const source = useTemplateRef<InstanceType<typeof MarkdownSource>>('source');

const picked = ref<SourceRange | null>(null);
const pickedText = ref('');

function readSelection(): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    picked.value = null;
    pickedText.value = '';
    return;
  }
  const range = view.value?.toSourceRange(selection.getRangeAt(0)) ?? null;
  picked.value = range;
  pickedText.value = range ? content.value.slice(range.start, range.end) : '';
}

function selectInView(): void {
  if (!picked.value) return;
  const range = view.value?.toDomRange(picked.value);
  if (!range) return;
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function selectInSource(): void {
  if (!picked.value) return;
  const range = source.value?.toDomRange(picked.value);
  if (!range) return;
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
</script>

<template>
  <main class="mx-auto max-w-5xl space-y-10 p-8">
    <section>
      <h2 class="mb-2 text-lg font-semibold">描く（MarkdownView）</h2>
      <MarkdownView ref="view" :value="content" testid="playground-view" @mouseup="readSelection" />
    </section>

    <section>
      <h2 class="mb-2 text-lg font-semibold">位置の対応</h2>
      <p class="text-sm">
        上の本文で範囲を選ぶと、生テキストの位置が出る。
      </p>
      <p class="font-mono text-sm" data-testid="playground-picked">
        <template v-if="picked">start={{ picked.start }} end={{ picked.end }} text={{ JSON.stringify(pickedText) }}</template>
        <template v-else>（未選択）</template>
      </p>
      <div class="mt-2 flex gap-2">
        <UButton size="sm" :disabled="!picked" @click="selectInView">本文で選び直す</UButton>
        <UButton size="sm" :disabled="!picked" @click="selectInSource">生テキストで選び直す</UButton>
      </div>
    </section>

    <section>
      <h2 class="mb-2 text-lg font-semibold">生テキスト（MarkdownSource）</h2>
      <MarkdownSource ref="source" :value="content" testid="playground-source" />
    </section>

    <section>
      <h2 class="mb-2 text-lg font-semibold">直す（MarkdownEditor）</h2>
      <MarkdownEditor :content="content" :save="save" :can-save="true" framed testid="playground-editor" />
    </section>
  </main>
</template>
