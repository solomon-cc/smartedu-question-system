<script setup lang="ts">
import { IslandButton, IslandProgress } from './island';
defineProps<{ error?: string; loading?: boolean }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <v-alert v-if="error" type="error" variant="tonal" class="mb-5" role="alert">
    <div class="d-flex align-center justify-space-between ga-3 flex-wrap">
      <span>{{ error }}</span>
      <IslandButton size="small" variant="text" @click="$emit('retry')">重试</IslandButton>
    </div>
  </v-alert>
  <IslandProgress v-if="loading" indeterminate color="primary" class="mb-4" aria-label="正在加载" />
</template>
