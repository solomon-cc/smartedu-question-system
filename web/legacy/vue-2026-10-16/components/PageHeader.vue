<script setup lang="ts">
import IslandTitle from './island/IslandTitle.vue';
import { moduleTone } from './island/palette';
import { computed } from 'vue';
import { auth } from '../stores/auth';
import { modulePresentation, workspaceLabel } from '../lib/workspace';
import { useRoute } from 'vue-router';
const route = useRoute();
defineProps<{ title?: string; description?: string }>();
const page = computed(() => modulePresentation(String(route.meta.module), auth.user?.role));
</script>
<template>
  <div class="page-heading">
    <div>
      <div v-if="auth.user?.role !== 'STUDENT'" class="eyebrow">
        {{ workspaceLabel(auth.user?.role) }}
      </div>
      <IslandTitle
        v-if="auth.user?.role === 'STUDENT'"
        :tone="moduleTone[String(route.meta.module)] || 'blue'"
      >
        {{ title || page?.title || route.meta.title }}
      </IslandTitle>
      <h1 v-else>{{ title || page?.title || route.meta.title }}</h1>
      <p>{{ description || page?.description || route.meta.description }}</p>
    </div>
    <div class="heading-actions"><slot /></div>
  </div>
</template>

<style scoped>
.page-heading h1 {
  margin: 0;
}
.page-heading p {
  margin: 8px 0 0;
}
</style>
