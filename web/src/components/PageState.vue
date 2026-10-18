<script setup lang="ts">
defineProps<{
  loading?: boolean;
  error?: string;
  empty?: boolean;
  title?: string;
  description?: string;
}>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="loading" class="page-state" role="status">
    <a-spin :size="28" />
    <p>加载中…</p>
  </div>
  <div v-else-if="error" class="page-state" role="alert">
    <h3>暂时无法加载</h3>
    <p>{{ error }}</p>
    <a-button @click="$emit('retry')">重新加载</a-button>
  </div>
  <div v-else-if="empty" class="page-state">
    <h3>{{ title || '暂无内容' }}</h3>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.page-state {
  min-height: 100px;
  padding: 24px;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  margin-block: 16px;
}
.page-state h3 {
  font-size: 14px;
  font-weight: 400;
}
.page-state[role='status'] {
  flex-direction: row;
  justify-content: center;
  gap: 12px;
}
</style>
