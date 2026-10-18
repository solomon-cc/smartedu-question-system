<script setup lang="ts">
import { IslandSelect } from '../components/island';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auth } from '../stores/auth';
import { listAssessmentMethods, type AssessmentMethodInfo } from '../lib/assessments';
import { assessmentWorkspace } from '../lib/assessmentWorkspaces';
import { messageOf } from '../lib/types';
import PageHeader from '../components/PageHeader.vue';
import Feedback from '../components/Feedback.vue';
const route = useRoute(),
  router = useRouter();
const methods = ref<AssessmentMethodInfo[]>([]),
  loading = ref(false),
  error = ref('');
const selectedId = computed(() => String(route.query.methodId || methods.value[0]?.id || ''));
const selected = computed(() => methods.value.find((m) => m.id === selectedId.value));
const methodError = computed(() =>
  methods.value.length && !selected.value ? '该评估方法尚未接入，请选择已支持的方法' : '',
);
async function load() {
  loading.value = true;
  error.value = '';
  try {
    methods.value = await listAssessmentMethods();
    if (!methods.value.length) error.value = '暂时没有可用的评估方法';
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    loading.value = false;
  }
}
async function switchMethod(id: string) {
  if (id === selectedId.value) return;
  // Record IDs are scoped by method; never carry an old method's ID into a different renderer.
  await router.push({
    path: '/assessment',
    query: { studentId: route.query.studentId, methodId: id },
  });
}
onMounted(load);
</script>
<template>
  <template v-if="error || loading || methodError">
    <PageHeader />
    <Feedback :loading="loading" :error="error || methodError" @retry="load" />
    <IslandSelect
      v-if="methodError"
      :items="methods"
      item-title="name"
      item-value="id"
      label="选择评估方法"
      @update:model-value="switchMethod"
    />
  </template>
  <template v-else-if="selected">
    <div class="assessment-method-picker mb-6">
      <IslandSelect
        :model-value="selectedId"
        :items="methods"
        item-title="name"
        item-value="id"
        label="评估方法"
        hide-details
        @update:model-value="switchMethod"
      />
      <span v-if="auth.user?.role !== 'STUDENT'" class="muted">选择本次使用的评估方法。</span>
    </div>
    <component :is="assessmentWorkspace(selected.renderer)" :key="selected.id" :method="selected" />
  </template>
</template>
<style scoped>
.assessment-method-picker {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.assessment-method-picker :deep(.v-input) {
  flex: 0 1 360px;
  min-width: min(100%, 240px);
}
</style>
