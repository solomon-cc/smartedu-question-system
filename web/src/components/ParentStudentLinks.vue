<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Message } from '@arco-design/web-vue';
import type { User } from '../lib/auth';
import { api, message } from '../lib/api';
import { useLeaveGuard } from './useLeaveGuard';
const props = defineProps<{ users: User[] }>();
const links = ref<{ parentId: string; studentId: string }[]>([]),
  parent = ref(''),
  selected = ref<string[]>([]),
  error = ref(''),
  loadError = ref(''),
  loading = ref(true),
  saving = ref(false),
  baseline = ref('[]');
const parents = computed(() =>
    props.users.filter((u) => u.role === 'PARENT' && u.status === 'active'),
  ),
  students = computed(() =>
    props.users.filter((u) => u.role === 'STUDENT' && u.status === 'active'),
  );
const guard = useLeaveGuard(
  () => JSON.stringify(selected.value) !== baseline.value,
  () => saving.value,
);
async function load() {
  loading.value = true;
  loadError.value = '';
  try {
    links.value = (await api('/portal/manage/parent-links')) || [];
  } catch (e) {
    loadError.value = message(e);
  } finally {
    loading.value = false;
  }
}
async function choose(e: Event) {
  const el = e.target as HTMLSelectElement;
  const desired = el.value;
  if (!(await guard.confirm())) {
    el.value = parent.value;
    return;
  }
  parent.value = desired;
  selected.value = links.value.filter((l) => l.parentId === parent.value).map((l) => l.studentId);
  baseline.value = JSON.stringify(selected.value);
}
async function save() {
  if (saving.value || loading.value || loadError.value || !parent.value) return;
  saving.value = true;
  error.value = '';
  try {
    const saved = await api<{ parentId: string; studentId: string }[]>(
      '/portal/manage/parent-links/' + encodeURIComponent(parent.value),
      'PUT',
      { studentIds: selected.value },
    );
    links.value = links.value.filter((l) => l.parentId !== parent.value).concat(saved);
    baseline.value = JSON.stringify(selected.value);
    Message.success('家长与学生关联已保存');
  } catch (e) {
    error.value = message(e);
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section class="parent-link-panel">
    <div>
      <h2>家长与学生关联</h2>
      <p>关联后，家长可查看所关联孩子的评估报告，并陪伴完成针对性练习。</p>
    </div>
    <a-alert v-if="loadError" type="error">
      {{ loadError }}
      <a-button @click="load">重试</a-button>
    </a-alert>
    <a-alert v-if="error" type="error">{{ error }}</a-alert>
    <p v-if="loading" role="status">正在加载关联…</p>
    <p v-else-if="!parents.length" class="muted">添加家长账号后，可在这里关联孩子。</p>
    <template v-else-if="!loadError">
      <label>
        家长账号
        <select :value="parent" @change="choose" :disabled="saving" aria-label="关联家长账号">
          <option value="">请选择家长</option>
          <option v-for="p in parents" :value="p.id" :key="p.id">
            {{ p.name || p.username }}（{{ p.username }}）
          </option>
        </select>
      </label>
      <fieldset v-if="parent" :disabled="saving">
        <legend>关联学生（可多选）</legend>
        <div class="linked-students">
          <label v-for="s in students" :key="s.id">
            <input type="checkbox" v-model="selected" :value="s.id" />
            {{ s.name || s.username }}（{{ s.username }}）
          </label>
        </div>
        <a-button type="primary" :loading="saving" @click="save">保存关联</a-button>
      </fieldset>
    </template>
  </section>
</template>
<style scoped>
.parent-link-panel {
  margin: 32px 0;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}
h2 {
  font-size: 22px;
  margin-bottom: 8px;
}
.parent-link-panel p {
  color: var(--muted);
  margin-bottom: 20px;
}
.parent-link-panel > label {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
select {
  border: 1px solid var(--line);
  padding: 10px 12px;
  min-height: 44px;
  border-radius: 6px;
  background: white;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 24px 0 0;
}
.linked-students {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 12px 0 24px;
}
.linked-students label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  border: 1px solid var(--line);
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
}
input {
  accent-color: var(--brand);
}
</style>
