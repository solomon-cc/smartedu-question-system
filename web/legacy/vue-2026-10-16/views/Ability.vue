<script setup lang="ts">
import { useRoute } from 'vue-router';
import { can } from '../stores/auth';
import { validateForm } from '../lib/forms';
import { computed, onMounted, ref } from 'vue';
import { request } from '../lib/api';
import { subjects, subjectLabel, required, messageOf, type RecordData } from '../lib/types';
import { useTask } from '../lib/useData';
import EditorDialog from '../components/EditorDialog.vue';
import PageHeader from '../components/PageHeader.vue';
import Feedback from '../components/Feedback.vue';
import EmptyState from '../components/EmptyState.vue';
const route = useRoute();
const { loading: matrixLoading, error: matrixError, refresh: refreshMatrix } = useTask();
const { loading, error, success, run } = useTask(),
  topics = ref<RecordData[]>([]),
  students = ref<RecordData[]>([]),
  studentId = ref(String(route?.query.studentId || '')),
  matrix = ref<RecordData[]>([]),
  dialog = ref(false),
  isObjective = ref(false),
  selected = ref<RecordData | null>(null),
  parentId = ref(''),
  saving = ref(false),
  formError = ref(''),
  deleting = ref<{ id: string; kind: string; name: string } | null>(null);
const form = ref({ name: '', subject: 'MATH', grade: 1, target: '', topicId: '' });
const baseline = ref('');
const dirty = computed(() => JSON.stringify(form.value) !== baseline.value);
async function load() {
  await run(async () => {
    [topics.value, students.value] = await Promise.all([
      request('/skills'),
      can('students') ? request('/students') : Promise.resolve([]),
    ]);
    topics.value ||= [];
    students.value ||= [];
  });
}
async function loadMatrix() {
  matrix.value = [];
  const id = studentId.value;
  await refreshMatrix(async () => {
    const result = id
      ? (await request<RecordData[]>('/ability/matrix?studentId=' + encodeURIComponent(id))) || []
      : [];
    if (studentId.value === id) matrix.value = result;
  });
}
function edit(objective: boolean, item?: RecordData, topicId = '') {
  isObjective.value = objective;
  selected.value = item || null;
  parentId.value = topicId;
  form.value = {
    name: item?.name || '',
    subject: item?.subject || 'MATH',
    grade: item?.grade || 1,
    target: item?.target || '',
    topicId,
  };
  formError.value = '';
  baseline.value = JSON.stringify(form.value);
  dialog.value = true;
}
async function save(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event))) return;
  saving.value = true;
  formError.value = '';
  try {
    await request(
      `/${isObjective.value ? 'objectives' : 'skills'}${selected.value ? '/' + selected.value.id : ''}`,
      selected.value ? 'PUT' : 'POST',
      form.value,
    );
    dialog.value = false;
    await load();
    success.value = '教学目标已保存';
  } catch (e) {
    formError.value = messageOf(e);
  } finally {
    saving.value = false;
  }
}
async function remove() {
  if (!deleting.value) return;
  const d = deleting.value;
  deleting.value = null;
  await run(async () => {
    await request(`/${d.kind}/${d.id}`, 'DELETE');
  }, '已删除');
  await load();
}
async function reorder(index: number, direction: number) {
  const sorted = [...topics.value];
  [sorted[index], sorted[index + direction]] = [sorted[index + direction], sorted[index]];
  if (
    await run(async () => {
      await request('/skills/order', 'PUT', { ids: sorted.map((t) => t.id) });
    })
  )
    topics.value = sorted;
}
onMounted(async () => {
  await load();
  if (studentId.value) await loadMatrix();
});
</script>
<template>
  <PageHeader>
    <v-btn
      v-if="route?.query.studentId && can('students')"
      variant="outlined"
      :to="`/students/${encodeURIComponent(String(route.query.studentId))}`"
    >
      返回学生档案
    </v-btn>
    <v-btn color="primary" prepend-icon="mdi-plus" @click="edit(false)">新增主题</v-btn>
  </PageHeader>
  <Feedback :error="error" :loading="loading" @retry="load" />
  <v-card class="mb-6">
    <div class="panel-header">
      <div>
        <h2>学生能力记录</h2>
        <p>选择学生，查看由练习结果汇总的能力记录</p>
      </div>
    </div>
    <v-card-text>
      <v-select
        v-model="studentId"
        label="选择学生"
        :items="students.map((s) => ({ title: s.name || s.username, value: s.id }))"
        clearable
        style="max-width: 340px"
        @update:model-value="loadMatrix"
      />
      <Feedback :error="matrixError" @retry="loadMatrix" />
      <v-data-table
        v-if="studentId"
        :loading="matrixLoading"
        no-data-text="该学生暂无能力记录，完成关联教学目标的练习后会在这里显示"
        :items="matrix"
        :headers="[
          { title: '教学目标', key: 'objectiveId' },
          { title: '日期', key: 'date' },
          { title: '达标', key: 'status' },
          { title: '正确率', key: 'accuracy' },
        ]"
      >
        <template #item.objectiveId="{ item }">
          {{
            topics.flatMap((t) => t.objectives || []).find((o) => o.id === item.objectiveId)
              ?.name || item.objectiveId
          }}
        </template>
        <template #item.status="{ item }">
          <v-chip size="small" :color="item.status === 'Y' ? 'success' : 'secondary'">
            {{ item.status === 'Y' ? '本次达到阈值' : '继续练习' }}
          </v-chip>
        </template>
        <template #item.accuracy="{ item }">{{ Number(item.accuracy).toFixed(0) }}%</template>
      </v-data-table>
    </v-card-text>
  </v-card>
  <div class="d-flex justify-space-between align-center mb-5">
    <h2>教学主题与目标</h2>
    <span class="muted">{{ topics.length }} 个主题</span>
  </div>
  <v-expansion-panels v-if="topics.length" variant="accordion">
    <v-expansion-panel v-for="(topic, index) in topics" :key="topic.id">
      <v-expansion-panel-title>
        <div class="d-flex align-center ga-3 flex-wrap">
          <v-icon icon="mdi-bullseye-arrow" color="primary" />
          <h3>{{ topic.name }}</h3>
          <v-chip size="x-small">{{ subjectLabel(topic.subject) }} · {{ topic.grade }} 年级</v-chip>
          <span class="muted">{{ topic.objectives?.length || 0 }} 个目标</span>
        </div>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <div class="card-action-row mb-4">
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-plus"
            @click="edit(true, undefined, topic.id)"
          >
            新增目标
          </v-btn>
          <v-btn size="small" variant="text" @click="edit(false, topic)">编辑主题</v-btn>
          <v-btn
            size="small"
            variant="text"
            color="error"
            @click="deleting = { id: topic.id, kind: 'skills', name: topic.name }"
          >
            删除主题
          </v-btn>
          <v-spacer />
          <v-btn
            icon="mdi-arrow-up"
            size="small"
            variant="text"
            aria-label="上移主题"
            :disabled="index === 0 || loading"
            @click="reorder(index, -1)"
          />
          <v-btn
            icon="mdi-arrow-down"
            size="small"
            variant="text"
            aria-label="下移主题"
            :disabled="index === topics.length - 1 || loading"
            @click="reorder(index, 1)"
          />
        </div>
        <v-list v-if="topic.objectives?.length" lines="two">
          <v-list-item
            v-for="objective in topic.objectives"
            :key="objective.id"
            :title="objective.name"
            :subtitle="objective.target || '尚未设置达标描述'"
          >
            <template #prepend><v-icon icon="mdi-checkbox-marked-circle-outline" /></template>
            <template #append>
              <v-btn
                icon="mdi-pencil-outline"
                variant="text"
                size="small"
                :aria-label="`编辑 ${objective.name}`"
                @click="edit(true, objective, topic.id)"
              />
              <v-btn
                icon="mdi-trash-can-outline"
                variant="text"
                size="small"
                color="error"
                :aria-label="`删除 ${objective.name}`"
                @click="deleting = { id: objective.id, kind: 'objectives', name: objective.name }"
              />
            </template>
          </v-list-item>
        </v-list>
        <EmptyState
          v-else
          title="主题下还没有目标"
          description="添加具体目标，再在题目编辑中按名称选择关联。"
        />
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
  <v-card v-else-if="!loading && !error">
    <EmptyState
      title="从第一个教学目标开始"
      description="建立主题与目标，再将题目关联到目标，追踪练习后的成长。"
      icon="mdi-bullseye-arrow"
    />
  </v-card>
  <EditorDialog
    v-model="dialog"
    :dirty="dirty"
    :saving="saving"
    :max-width="680"
    v-slot="{ close }"
  >
    <v-card :title="`${selected ? '编辑' : '新增'}${isObjective ? '目标' : '主题'}`">
      <v-form @submit.prevent="save">
        <v-card-text>
          <v-alert v-if="formError" type="error" class="mb-4">{{ formError }}</v-alert>
          <v-text-field v-model="form.name" label="名称" :rules="[required]" />
          <v-textarea v-if="isObjective" v-model="form.target" label="达标描述" rows="3" />
          <template v-else>
            <v-select v-model="form.subject" :items="subjects" label="学科" />
            <v-select
              v-model="form.grade"
              :items="Array.from({ length: 12 }, (_, i) => i + 1)"
              label="年级"
            />
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="saving" @click="close">取消</v-btn>
          <v-btn type="submit" color="primary" variant="flat" :loading="saving">保存</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </EditorDialog>
  <v-dialog :model-value="!!deleting" @update:model-value="deleting = null" max-width="420">
    <v-card title="确认删除？">
      <v-card-text>删除「{{ deleting?.name }}」后无法恢复。主题下的目标将一并删除。</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="deleting = null">取消</v-btn>
        <v-btn color="error" @click="remove">确认删除</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-snackbar :model-value="!!success" @update:model-value="success = ''">{{ success }}</v-snackbar>
</template>
