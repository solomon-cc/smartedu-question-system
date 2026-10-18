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
  <div v-if="loading" class="page-state" role="status"><p>正在加载，请稍候…</p></div>
  <div v-else-if="error" class="page-state" role="alert">
    <h3>暂时无法加载</h3>
    <p>{{ error }}</p>
    <button class="button outline" @click="$emit('retry')">重新加载</button>
  </div>
  <div v-else-if="empty" class="page-state">
    <h3>{{ title || '内容整理中' }}</h3>
    <p>{{ description || '公开内容发布后会在这里展示。' }}</p>
  </div>
</template>
