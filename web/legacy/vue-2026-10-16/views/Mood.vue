<script setup lang="ts">
import {
  IslandButton,
  IslandCard,
  IslandTag,
  IslandInput,
  IslandTextarea,
  IslandSelect,
  IslandProgress,
} from '../components/island';
import { computed, onMounted, ref } from 'vue';
import { auth, can } from '../stores/auth';
import { request, query } from '../lib/api';
import { messageOf, localDate, type RecordData } from '../lib/types';
import EditorDialog from '../components/EditorDialog.vue';
import PageHeader from '../components/PageHeader.vue';
import EmptyState from '../components/EmptyState.vue';
const own = computed(() => auth.user?.role === 'STUDENT'),
  students = ref<RecordData[]>([]),
  studentsError = ref(''),
  items = ref<RecordData[]>([]),
  studentId = ref(''),
  source = ref(''),
  from = ref(''),
  to = ref(''),
  page = ref(1),
  total = ref(0),
  loading = ref(false),
  error = ref(''),
  notice = ref(''),
  dialog = ref(false),
  saving = ref(false),
  formError = ref(''),
  baseline = ref(''),
  detail = ref<RecordData | null>(null),
  observations = ref<RecordData[]>([]),
  notes = ref(''),
  followError = ref('');
const moods = [
  { value: 1, title: '很低落', icon: 'mdi-emoticon-cry-outline' },
  { value: 2, title: '不太好', icon: 'mdi-emoticon-sad-outline' },
  { value: 3, title: '还不错', icon: 'mdi-emoticon-neutral-outline' },
  { value: 4, title: '很开心', icon: 'mdi-emoticon-happy-outline' },
  { value: 5, title: '非常棒', icon: 'mdi-emoticon-excited-outline' },
];
const blank = () => ({
    studentId: studentId.value,
    date: localDate(),
    mood: 0,
    event: '',
    feeling: '',
    thought: '',
    physicalSensation: '',
    intensity: 5,
  }),
  form = ref(blank());
const dirty = computed(() => JSON.stringify(form.value) !== baseline.value);
const sourceName = (value: string) =>
  value === 'student' ? '学生自述' : value === 'teacher' ? '老师观察' : '历史记录 · 来源未标注';
const name = (id: string) =>
  students.value.find((s) => s.id === id)?.name ||
  students.value.find((s) => s.id === id)?.username ||
  '学生';
let loadSequence = 0;
async function load() {
  const sequence = ++loadSequence;
  loading.value = true;
  error.value = '';
  if (from.value && to.value && from.value > to.value) {
    error.value = '开始日期不能晚于结束日期';
    loading.value = false;
    return;
  }
  try {
    const data = await request(
      `/mood-diaries?${query({ studentId: studentId.value, source: source.value, dateFrom: from.value, dateTo: to.value, page: page.value, pageSize: 12 })}`,
    );
    if (sequence === loadSequence) {
      items.value = data.list;
      total.value = data.total;
    }
  } catch (e) {
    if (sequence === loadSequence) error.value = messageOf(e);
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}
async function filters() {
  page.value = 1;
  await load();
}
function chooseMood(value: number) {
  create();
  form.value.mood = value;
}
function create() {
  form.value = blank();
  baseline.value = JSON.stringify(form.value);
  formError.value = '';
  dialog.value = true;
}
async function save() {
  if (!form.value.mood) {
    formError.value = '请选择此刻的心情';
    return;
  }
  if (!own.value && !form.value.studentId) {
    formError.value = '请选择学生';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    await request('/mood-diaries', 'POST', form.value);
    dialog.value = false;
    notice.value = own.value ? '你的感受已记录。' : '课堂观察已记录，来源标记为老师。';
    await load();
  } catch (e) {
    formError.value = messageOf(e);
  } finally {
    saving.value = false;
  }
}
async function open(item: RecordData) {
  detail.value = item;
  notes.value = '';
  followError.value = '';
  observations.value = [];
  try {
    observations.value = await request(`/mood-diaries/${item.id}/observations`);
  } catch (e) {
    followError.value = messageOf(e);
  }
}
async function follow() {
  if (!detail.value || !notes.value.trim()) return;
  saving.value = true;
  followError.value = '';
  try {
    const o = await request(`/mood-diaries/${detail.value.id}/observations`, 'POST', {
      notes: notes.value,
    });
    observations.value.unshift(o);
    notes.value = '';
  } catch (e) {
    followError.value = messageOf(e);
  } finally {
    saving.value = false;
  }
}
async function loadStudents() {
  studentsError.value = '';
  if (!own.value) {
    try {
      students.value = can('students')
        ? await request('/students')
        : await request('/mood-diaries/students');
    } catch (e) {
      studentsError.value = messageOf(e);
    }
  }
}
onMounted(() => {
  loadStudents();
  load();
});
</script>
<template>
  <PageHeader
    :title="own ? '我的心情' : '学生心情历史'"
    :description="
      own
        ? '每一种心情都值得被倾听，留下一点此刻的感受。'
        : '查看学生自述与课堂观察，记录回应和后续支持。'
    "
  >
    <IslandButton
      v-if="!own && can('students')"
      color="primary"
      prepend-icon="mdi-plus"
      @click="create"
    >
      {{ own ? '记录心情' : '补充课堂观察' }}
    </IslandButton>
  </PageHeader>
  <v-alert v-if="error" type="error" class="mb-4" role="alert">
    {{ error }}
    <IslandButton variant="text" @click="load">重试</IslandButton>
  </v-alert>
  <v-alert v-if="notice" type="success" class="mb-4">{{ notice }}</v-alert>
  <IslandProgress v-if="loading" indeterminate color="primary" />
  <section v-if="own" class="student-mood-picker">
    <h2>今天，你感觉怎么样？</h2>
    <p>点一个表情。不想说的内容，可以留空。</p>
    <div class="mood-options" role="group" aria-label="记录此刻的心情">
      <button
        v-for="m in moods"
        :key="m.value"
        type="button"
        :data-island-tone="(['blue', 'purple', 'teal', 'yellow', 'pink'] as const)[m.value - 1]"
        @click="chooseMood(m.value)"
      >
        <v-icon :icon="m.icon" size="44" />
        <span>{{ m.title }}</span>
      </button>
    </div>
  </section>
  <IslandCard v-else class="pa-5 mb-6">
    <v-alert v-if="studentsError" type="warning" variant="tonal" class="mb-4">
      学生姓名暂时无法加载。
      <IslandButton variant="text" @click="loadStudents">重试学生列表</IslandButton>
    </v-alert>
    <div class="mood-filters">
      <IslandSelect
        v-model="studentId"
        :items="students.map((s) => ({ title: s.name || s.username, value: s.id }))"
        label="学生"
        clearable
        hide-details
        @update:model-value="filters"
      />
      <IslandSelect
        v-model="source"
        :items="[
          { title: '学生自述', value: 'student' },
          { title: '老师观察', value: 'teacher' },
          { title: '历史来源未标注', value: 'legacy' },
        ]"
        label="记录来源"
        clearable
        hide-details
        @update:model-value="filters"
      />
      <IslandInput
        v-model="from"
        label="开始日期"
        type="date"
        hide-details
        @update:model-value="filters"
      />
      <IslandInput
        v-model="to"
        label="结束日期"
        type="date"
        hide-details
        @update:model-value="filters"
      />
    </div>
    <p class="muted mt-4">共 {{ total }} 条记录。心情是本人感受，老师观察与跟进会单独标记。</p>
  </IslandCard>
  <div v-if="own && items.length && !loading && !error" class="section-grid">
    <IslandCard v-for="d in items" :key="d.id" class="pa-6">
      <div class="d-flex ga-3 align-center">
        <v-icon :icon="moods.find((m) => m.value === d.mood)?.icon" size="42" color="primary" />
        <div>
          <h3>{{ moods.find((m) => m.value === d.mood)?.title }}</h3>
          <p class="muted">{{ d.date }} · {{ sourceName(d.source) }}</p>
        </div>
      </div>
      <p v-if="d.event" class="mt-4">{{ d.event }}</p>
      <p v-if="d.feeling" class="muted mt-2">感受：{{ d.feeling }}</p>
      <p v-if="d.thought" class="muted mt-2">想法：{{ d.thought }}</p>
      <p v-if="d.physicalSensation" class="muted mt-2">身体感受：{{ d.physicalSensation }}</p>
      <p class="muted mt-4">强度 {{ d.intensity }} / 10</p>
    </IslandCard>
  </div>
  <IslandCard v-else-if="!own && items.length && !loading && !error">
    <div v-for="d in items" :key="d.id" class="mood-history-row">
      <v-icon :icon="moods.find((m) => m.value === d.mood)?.icon" size="36" color="primary" />
      <div class="history-main">
        <strong>
          {{ name(d.studentId) }} · {{ moods.find((m) => m.value === d.mood)?.title }}
        </strong>
        <p class="muted">{{ d.date }} · {{ sourceName(d.source) }} · 强度 {{ d.intensity }} / 10</p>
        <p v-if="d.event" class="event-excerpt">{{ d.event }}</p>
      </div>
      <IslandButton variant="tonal" color="primary" @click="open(d)">查看与跟进</IslandButton>
    </div>
  </IslandCard>
  <EmptyState
    v-else-if="!loading && !error"
    :title="own ? '还没有心情记录' : '此筛选下没有记录'"
    :description="own ? '点选一张心情图片，记录一下今天。' : '调整日期、学生或来源筛选查看历史。'"
  />
  <v-pagination
    v-if="total > 12 && !loading && !error"
    v-model="page"
    :length="Math.ceil(total / 12)"
    class="mt-5"
    @update:model-value="load"
  />
  <EditorDialog v-model="dialog" :dirty="dirty" :saving="saving" max-width="700" v-slot="{ close }">
    <IslandCard>
      <v-card-title>{{ own ? '此刻的心情' : '补充课堂观察' }}</v-card-title>
      <v-card-text>
        <v-alert v-if="formError" type="error" class="mb-4">{{ formError }}</v-alert>
        <IslandSelect
          v-if="!own"
          v-model="form.studentId"
          :items="students.map((s) => ({ title: s.name || s.username, value: s.id }))"
          label="学生"
        />
        <p v-if="!own" class="muted mb-4">
          以下内容会标为老师观察，请记录可观察到的情况；学生自己的感受请保留原话。
        </p>
        <IslandInput v-model="form.date" type="date" :max="localDate()" label="日期" />
        <div class="mood-options" role="group" aria-label="选择心情">
          <button
            v-for="m in moods"
            :key="m.value"
            :aria-pressed="form.mood === m.value"
            :disabled="saving"
            :class="{ chosen: form.mood === m.value }"
            :data-island-tone="
              own ? (['blue', 'purple', 'teal', 'yellow', 'pink'] as const)[m.value - 1] : undefined
            "
            @click="form.mood = m.value"
          >
            <v-icon :icon="m.icon" size="42" />
            <span>{{ m.title }}</span>
          </button>
        </div>
        <IslandTextarea
          v-model="form.event"
          :label="own ? '发生了什么？（可留空）' : '观察到的事件 / 行为'"
          :maxlength="2000"
          rows="2"
        />
        <IslandInput
          v-model="form.feeling"
          :label="own ? '我的感受（可留空）' : '学生表达的感受（原话，可留空）'"
          :maxlength="2000"
        />
        <IslandInput
          v-model="form.thought"
          :label="own ? '我的想法（可留空）' : '学生表达的想法（原话，可留空）'"
          :maxlength="2000"
        />
        <IslandInput
          v-model="form.physicalSensation"
          :label="own ? '身体的感觉（可留空）' : '身体表现 / 学生描述（可留空）'"
          :maxlength="2000"
        />
        <v-slider
          v-model="form.intensity"
          min="1"
          max="10"
          step="1"
          thumb-label
          :label="'强度 ' + form.intensity + ' / 10'"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <IslandButton :disabled="saving" @click="close">取消</IslandButton>
        <IslandButton color="primary" variant="flat" :loading="saving" @click="save">
          保存记录
        </IslandButton>
      </v-card-actions>
    </IslandCard>
  </EditorDialog>
  <EditorDialog
    :model-value="!!detail"
    :dirty="!!notes.trim()"
    :saving="saving"
    max-width="720"
    @update:model-value="detail = null"
    v-slot="{ close }"
  >
    <IslandCard v-if="detail">
      <v-card-title>{{ name(detail.studentId) }} · 心情与跟进</v-card-title>
      <v-card-text>
        <IslandTag color="primary" class="mb-4">{{ sourceName(detail.source) }}</IslandTag>
        <p>
          {{ detail.date }} · {{ moods.find((m) => m.value === detail!.mood)?.title }} · 强度
          {{ detail.intensity }} / 10
        </p>
        <div
          v-for="field in [
            { key: 'event', label: '事件' },
            { key: 'feeling', label: '感受' },
            { key: 'thought', label: '想法' },
            { key: 'physicalSensation', label: '身体感受' },
          ]"
          :key="field.key"
          class="mood-detail"
        >
          <strong>{{ field.label }}</strong>
          <p>{{ detail[field.key] || '未填写' }}</p>
        </div>
        <v-divider class="my-5" />
        <h3>老师跟进</h3>
        <p class="muted mt-2 mb-4">记录已提供的支持和后续安排，保留学生原始记录。</p>
        <v-alert v-if="followError" type="error" class="mb-4">{{ followError }}</v-alert>
        <IslandTextarea
          v-model="notes"
          label="本次跟进备注"
          rows="3"
          :maxlength="2000"
          :disabled="saving"
        />
        <IslandButton color="primary" :loading="saving" :disabled="!notes.trim()" @click="follow">
          保存跟进
        </IslandButton>
        <div v-for="o in observations" :key="o.id" class="mood-detail">
          <small class="muted">{{ new Date(o.createdAt).toLocaleString('zh-CN') }}</small>
          <p>{{ o.notes }}</p>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <IslandButton :disabled="saving" @click="close">关闭</IslandButton>
      </v-card-actions>
    </IslandCard>
  </EditorDialog>
</template>
<style scoped>
.mood-welcome {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 16px;
  margin-bottom: 24px;
}
.mood-welcome h2 {
  font-size: 22px;
  margin-bottom: 8px;
}
.mood-welcome p {
  color: rgb(var(--v-theme-on-surface-variant));
}
.mood-welcome > div {
  flex: 1;
}
.mood-filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
.mood-history-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.mood-history-row:last-child {
  border: 0;
}
.history-main {
  flex: 1;
  min-width: 0;
}
.history-main > .muted {
  font-size: 12px;
  margin-top: 6px;
}
.event-excerpt {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  margin-top: 8px;
  font-size: 14px;
}
.mood-options {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}
.mood-options button {
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 12px 4px;
  min-height: 90px;
  border: 2px solid rgba(var(--v-theme-on-surface), 0.18);
  border-radius: 12px;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  background: rgb(var(--v-theme-surface));
}
.mood-options button.chosen {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-surface-variant));
}
.mood-options button:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
.mood-options span {
  font-size: 14px;
}
.mood-detail {
  padding: 16px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}
.mood-detail p {
  margin-top: 8px;
  white-space: pre-wrap;
}
@media (max-width: 800px) {
  .mood-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .mood-welcome {
    flex-wrap: wrap;
    gap: 16px;
  }
  .mood-welcome > .v-btn {
    width: 100%;
  }
  .mood-history-row {
    flex-wrap: wrap;
    padding: 16px;
  }
  .history-main {
    flex-basis: calc(100% - 60px);
  }
  .mood-history-row > .v-btn {
    margin-left: auto;
  }
  .mood-options button {
    min-height: 80px;
  }
  .mood-options span {
    font-size: 12px;
  }
}
@media (max-width: 420px) {
  .mood-options {
    gap: 4px;
  }
  .mood-options :deep(.v-icon) {
    font-size: 32px !important;
  }
  .mood-options button {
    padding: 10px 2px;
  }
  .mood-filters {
    grid-template-columns: 1fr;
  }
}
</style>
