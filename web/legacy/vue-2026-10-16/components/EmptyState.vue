<script setup lang="ts">
import { IslandAvatar } from './island';
import { auth } from '../stores/auth';
withDefaults(
  defineProps<{ title?: string; description?: string; icon?: string; heading?: 'h2' | 'h3' }>(),
  {
    title: '这里还没有记录',
    description: '添加第一条记录，从这里开始。',
    icon: 'mdi-tray-arrow-up',
    heading: 'h3',
  },
);
</script>
<template>
  <div class="empty-state">
    <IslandAvatar color="surface-variant" :size="auth.user?.role === 'STUDENT' ? 88 : 64">
      <v-icon
        :icon="auth.user?.role === 'STUDENT' ? 'naive:snail' : icon"
        :size="auth.user?.role === 'STUDENT' ? 70 : 30"
      />
    </IslandAvatar>
    <component :is="heading" class="empty-state-title">{{ title }}</component>
    <p>{{ description }}</p>
    <slot />
  </div>
</template>
