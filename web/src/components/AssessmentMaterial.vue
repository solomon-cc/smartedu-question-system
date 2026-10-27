<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import { assessmentAsset } from '../lib/assessmentAssets';
import { message } from '../lib/api';
const props = defineProps<{ file: string }>();
const src = ref(''),
  error = ref(''),
  loading = ref(true);
let controller: AbortController | undefined;
function release() {
  if (src.value) URL.revokeObjectURL(src.value);
  src.value = '';
}
async function load() {
  controller?.abort();
  const request = new AbortController();
  controller = request;
  release();
  loading.value = true;
  error.value = '';
  try {
    const blob = await assessmentAsset(props.file, request.signal);
    if (!request.signal.aborted) src.value = URL.createObjectURL(blob);
  } catch (e) {
    if (!request.signal.aborted) error.value = message(e);
  } finally {
    if (!request.signal.aborted) loading.value = false;
  }
}
watch(() => props.file, load, { immediate: true });
onBeforeUnmount(() => {
  controller?.abort();
  release();
});
</script>
<template>
  <div class="assessment-material">
    <p v-if="loading" role="status">正在加载材料…</p>
    <div v-else-if="error" role="alert">
      <p>{{ error }}</p>
      <a-button @click="load">重新加载</a-button>
    </div>
    <img v-else :src="src" alt="当前评估项目材料" @error="error = '材料无法显示，请重试'" />
  </div>
</template>
<style scoped>
.assessment-material img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: auto;
}
.assessment-material p {
  color: var(--muted);
}
</style>
