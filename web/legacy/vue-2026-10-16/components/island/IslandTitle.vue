<script setup lang="ts">
import type { IslandTone } from './palette';
withDefaults(defineProps<{ level?: 'h1' | 'h2' | 'h3'; tone?: IslandTone }>(), {
  level: 'h1',
  tone: 'blue',
});
</script>
<template>
  <component :is="level" class="island-title" :data-island-tone="tone">
    <span><slot /></span>
  </component>
</template>
<style scoped>
.island-title {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.5;
}
.island-title > span {
  display: inline-block;
  position: relative;
  padding: 4px 24px;
  background: var(--island-tone);
  color: var(--island-on-color);
  border-radius: 22px 22px 22px 8px;
  border: 2px solid var(--island-border);
  padding: 8px 22px;
}
.island-title[data-island-tone='green'] > span {
  background: var(--island-content);
  color: var(--island-heading);
}
@media (max-width: 600px) {
  .island-title {
    font-size: 24px;
  }
  .island-title > span {
    padding: 4px 20px;
  }
}
</style>
