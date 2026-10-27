<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { IconPlus } from '@arco-design/web-vue/es/icon';
import { api, message, query } from '../lib/api';
import { auth, canModule, type User } from '../lib/auth';
import PageState from '../components/PageState.vue';
import { useLeaveGuard } from '../components/useLeaveGuard';
interface Diary {
  id: string;
  studentId: string;
  date: string;
  source: string;
  mood: number;
  intensity: number;
  event: string;
  feeling: string;
  thought: string;
  physicalSensation: string;
}
interface Observation {
  id: string;
  notes: string;
  createdAt: string;
}
const own = computed(() => auth.user?.role === 'STUDENT');
const students = ref<User[]>([]),
  items = ref<Diary[]>([]),
  studentId = ref(''),
  source = ref(''),
  from = ref(''),
  to = ref(''),
  page = ref(1),
  total = ref(0),
  loading = ref(true),
  error = ref(''),
  studentsError = ref(''),
  dialog = ref(false),
  saving = ref(false),
  formError = ref(''),
  baseline = ref(''),
  notice = ref(''),
  detail = ref<Diary | null>(null),
  notes = ref(''),
  observations = ref<Observation[]>([]),
  followError = ref(''),
  followLoading = ref(false);
interface MoodForm {
  studentId: string;
  date: string;
  mood: number;
  intensity: number;
  event: string;
  feeling: string;
  thought: string;
  physicalSensation: string;
}
const today = () => new Date().toLocaleDateString('sv-SE');
const blank = (): MoodForm => ({
  studentId: studentId.value,
  date: today(),
  mood: 0,
  intensity: 5,
  event: '',
  feeling: '',
  thought: '',
  physicalSensation: '',
});
const form = ref(blank());
const moods = [
  { value: 1, label: '很低落' },
  { value: 2, label: '不太好' },
  { value: 3, label: '平静' },
  { value: 4, label: '开心' },
  { value: 5, label: '很开心' },
];
const moodName = (value: number) => moods.find((m) => m.value === value)?.label || '未标注';
const studentName = (id: string) =>
  students.value.find((s) => s.id === id)?.name ||
  students.value.find((s) => s.id === id)?.username ||
  '学生';
const sourceName = (value: string) =>
  value === 'student' ? '学生自述' : value === 'teacher' ? '老师观察' : '历史记录';
const dirty = computed(
  () =>
    (dialog.value && JSON.stringify(form.value) !== baseline.value) ||
    (!!detail.value && !!notes.value.trim()),
);
const guard = useLeaveGuard(
  () => dirty.value,
  () => saving.value,
);
let sequence = 0,
  detailSequence = 0;
async function load() {
  const seq = ++sequence;
  loading.value = true;
  error.value = '';
  if (from.value && to.value && from.value > to.value) {
    error.value = '开始日期不能晚于结束日期';
    loading.value = false;
    return;
  }
  try {
    const d = await api<{ list: Diary[]; total: number }>(
      '/mood-diaries?' +
        query({
          studentId: studentId.value,
          source: source.value,
          dateFrom: from.value,
          dateTo: to.value,
          page: page.value,
          pageSize: 12,
        }),
    );
    if (seq === sequence) {
      items.value = d.list;
      total.value = d.total;
    }
  } catch (e) {
    if (seq === sequence) error.value = message(e);
  } finally {
    if (seq === sequence) loading.value = false;
  }
}
async function loadStudents() {
  if (own.value) return;
  studentsError.value = '';
  try {
    students.value =
      (await api<User[]>(canModule('students') ? '/students' : '/mood-diaries/students')) || [];
  } catch (e) {
    studentsError.value = message(e);
  }
}
function create(value = 0) {
  form.value = blank();
  baseline.value = JSON.stringify(form.value);
  form.value.mood = value;
  formError.value = '';
  dialog.value = true;
  notice.value = '';
}
async function closeForm() {
  if (await guard.confirm()) dialog.value = false;
}
async function save() {
  if (saving.value) return;
  if (!form.value.mood) {
    formError.value = '请选择心情';
    return;
  }
  if (!own.value && !form.value.studentId) {
    formError.value = '请选择学生';
    return;
  }
  if (!form.value.date || form.value.date > today()) {
    formError.value = '请选择有效日期，不能晚于今天';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    await api('/mood-diaries', 'POST', form.value);
    dialog.value = false;
    notice.value = '记录已保存';
    page.value = 1;
    await load();
  } catch (e) {
    formError.value = message(e);
  } finally {
    saving.value = false;
  }
}
async function open(item: Diary) {
  detail.value = item;
  notes.value = '';
  observations.value = [];
  followError.value = '';
  if (!own.value) await loadObservations();
}
async function loadObservations() {
  if (!detail.value || own.value) return;
  const id = detail.value.id,
    seq = ++detailSequence;
  followLoading.value = true;
  followError.value = '';
  try {
    const d = await api<Observation[]>('/mood-diaries/' + id + '/observations');
    if (seq === detailSequence && detail.value?.id === id) observations.value = d;
  } catch (e) {
    if (seq === detailSequence) followError.value = message(e);
  } finally {
    if (seq === detailSequence) followLoading.value = false;
  }
}
async function closeDetail() {
  if (await guard.confirm()) {
    detail.value = null;
    detailSequence++;
  }
}
async function follow() {
  if (saving.value || !detail.value) return;
  if (!notes.value.trim()) {
    followError.value = '请填写跟进记录';
    return;
  }
  saving.value = true;
  followError.value = '';
  try {
    const o = await api<Observation>('/mood-diaries/' + detail.value.id + '/observations', 'POST', {
      notes: notes.value.trim(),
    });
    observations.value.unshift(o);
    notes.value = '';
  } catch (e) {
    followError.value = message(e);
  } finally {
    saving.value = false;
  }
}
watch([studentId, source, from, to], () => {
  page.value = 1;
  void load();
});
watch(page, load);
onMounted(() => {
  void load();
  void loadStudents();
});
</script>
<template>
  <section class="container section mood-page">
    <div class="page-heading">
      <h1>{{ own ? '我的情绪' : '情绪记录' }}</h1>
      <a-button v-if="own || canModule('students')" type="primary" size="large" @click="create()">
        <IconPlus />
        {{ own ? '记录心情' : '记录观察' }}
      </a-button>
    </div>
    <a-alert v-if="notice" type="success" class="mb-24" closable @close="notice = ''">
      {{ notice }}
    </a-alert>
    <a-alert v-if="studentsError" type="error" class="mb-24">
      {{ studentsError }}
      <a-button @click="loadStudents">重试学生列表</a-button>
    </a-alert>
    <div v-if="own" class="mood-quick" aria-label="快速记录心情">
      <button v-for="m in moods" :key="m.value" @click="create(m.value)">
        <svg viewBox="0 0 60 60" fill="none" aria-hidden="true">
          <circle cx="30" cy="30" r="26" stroke="currentColor" stroke-width="2" />
          <circle cx="21" cy="25" r="2" fill="currentColor" />
          <circle cx="39" cy="25" r="2" fill="currentColor" />
          <path
            :d="
              m.value < 3
                ? 'M20 40Q30 30 40 40'
                : m.value === 3
                  ? 'M21 38H39'
                  : 'M20 35Q30 49 40 35'
            "
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <span>{{ m.label }}</span>
      </button>
    </div>
    <div class="mood-filters">
      <label v-if="!own">
        学生
        <select v-model="studentId" aria-label="筛选情绪学生">
          <option value="">全部学生</option>
          <option v-for="student in students" :key="student.id" :value="student.id">
            {{ student.name || student.username }}
          </option>
        </select>
      </label>
      <label v-if="!own">
        来源
        <select v-model="source" aria-label="记录来源">
          <option value="">全部来源</option>
          <option value="student">学生自述</option>
          <option value="teacher">老师观察</option>
          <option value="legacy">历史记录</option>
        </select>
      </label>
      <label>
        开始日期
        <input v-model="from" type="date" :max="today()" aria-label="开始日期" />
      </label>
      <label>
        结束日期
        <input v-model="to" type="date" :max="today()" aria-label="结束日期" />
      </label>
    </div>
    <PageState
      :loading="loading"
      :error="error"
      :empty="!items.length"
      title="暂无情绪记录"
      @retry="load"
    />
    <div v-if="!loading && !error && items.length" class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>日期</th>
            <th v-if="!own">学生</th>
            <th>心情</th>
            <th>强度</th>
            <th>事件</th>
            <th>来源</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.date }}</td>
            <td v-if="!own">{{ studentName(item.studentId) }}</td>
            <td>{{ moodName(item.mood) }}</td>
            <td>{{ item.intensity }} / 10</td>
            <td class="mood-event">{{ item.event || '—' }}</td>
            <td>{{ sourceName(item.source) }}</td>
            <td>
              <a-button type="text" @click="open(item)">{{ own ? '查看' : '查看与跟进' }}</a-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <a-pagination
      v-if="total > 12"
      v-model:current="page"
      :total="total"
      :page-size="12"
      :show-total="true"
    />
  </section>
  <a-modal
    :visible="dialog"
    :title="own ? '记录心情' : '记录学生观察'"
    :footer="false"
    :mask-closable="false"
    :closable="!saving"
    @cancel="closeForm"
  >
    <form class="mood-form" @submit.prevent="save">
      <a-alert v-if="formError" type="error">{{ formError }}</a-alert>
      <label v-if="!own">
        学生
        <select v-model="form.studentId" aria-label="记录学生" required :disabled="saving">
          <option value="">请选择学生</option>
          <option v-for="student in students" :key="student.id" :value="student.id">
            {{ student.name || student.username }}
          </option>
        </select>
      </label>
      <label>
        日期
        <input
          v-model="form.date"
          type="date"
          :max="today()"
          required
          :disabled="saving"
          aria-label="记录日期"
        />
      </label>
      <fieldset :disabled="saving">
        <legend>心情</legend>
        <div class="mood-options">
          <label v-for="m in moods" :key="m.value" :class="{ selected: form.mood === m.value }">
            <input v-model="form.mood" type="radio" name="mood" :value="m.value" />
            {{ m.label }}
          </label>
        </div>
      </fieldset>
      <label>
        情绪强度（{{ form.intensity }} / 10）
        <input
          v-model.number="form.intensity"
          type="range"
          min="1"
          max="10"
          :disabled="saving"
          aria-label="情绪强度"
        />
        <small class="muted">1 很轻 · 10 很强烈</small>
      </label>
      <label>
        发生了什么
        <textarea
          v-model="form.event"
          maxlength="2000"
          rows="2"
          :disabled="saving"
          aria-label="发生了什么"
        />
      </label>
      <label>
        {{ own ? '我的感受' : '学生表达或观察到的感受' }}
        <textarea
          v-model="form.feeling"
          maxlength="2000"
          rows="2"
          :disabled="saving"
          :aria-label="own ? '我的感受' : '学生感受'"
        />
      </label>
      <details>
        <summary>想法和身体感受（选填）</summary>
        <label>
          当时的想法
          <textarea v-model="form.thought" maxlength="2000" rows="2" :disabled="saving" />
        </label>
        <label>
          身体感受
          <textarea v-model="form.physicalSensation" maxlength="2000" rows="2" :disabled="saving" />
        </label>
      </details>
      <div class="dialog-actions">
        <a-button :disabled="saving" @click="closeForm">取消</a-button>
        <a-button type="primary" html-type="submit" :loading="saving">保存记录</a-button>
      </div>
    </form>
  </a-modal>
  <a-modal
    :visible="!!detail"
    title="情绪记录"
    :footer="false"
    :mask-closable="false"
    :closable="!saving"
    @cancel="closeDetail"
  >
    <template v-if="detail">
      <div class="diary-meta">
        {{ detail.date }} · {{ moodName(detail.mood) }} · 强度 {{ detail.intensity }} / 10 ·
        {{ sourceName(detail.source) }}
      </div>
      <dl class="diary-detail">
        <template
          v-for="field in [
            { key: 'event', label: '发生的事情' },
            { key: 'feeling', label: '感受' },
            { key: 'thought', label: '当时的想法' },
            { key: 'physicalSensation', label: '身体感受' },
          ]"
          :key="field.key"
        >
          <dt>{{ field.label }}</dt>
          <dd>{{ detail[field.key as keyof Diary] || '未填写' }}</dd>
        </template>
      </dl>
      <section v-if="!own" class="mood-follow">
        <h3>老师跟进</h3>
        <PageState :loading="followLoading" :error="followError" @retry="loadObservations" />
        <article v-for="o in observations" :key="o.id">
          <p>{{ o.notes }}</p>
          <small>{{ new Date(o.createdAt).toLocaleString('zh-CN') }}</small>
        </article>
        <form @submit.prevent="follow">
          <label>
            本次跟进
            <textarea
              v-model="notes"
              rows="3"
              maxlength="2000"
              :disabled="saving || followLoading"
              aria-label="本次跟进备注"
            />
          </label>
          <a-button type="primary" html-type="submit" :loading="saving" :disabled="followLoading">
            保存跟进
          </a-button>
        </form>
      </section>
    </template>
  </a-modal>
</template>
<style scoped>
.mood-quick {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}
.mood-quick button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: white;
  padding: 16px 24px;
  color: var(--brand);
  min-width: 100px;
  font: inherit;
}
.mood-quick svg {
  width: 48px;
  height: 48px;
}
.mood-quick button:hover {
  background: var(--soft);
  border-color: var(--brand);
}
.mood-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}
.mood-filters label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.mood-page input,
.mood-page select,
.mood-form input:not([type='radio']):not([type='range']),
.mood-form textarea,
.mood-form select,
.mood-follow textarea {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: white;
  color: var(--ink);
  padding: 10px 12px;
  min-height: 44px;
  font: inherit;
  max-width: 100%;
}
.mood-form,
.mood-follow form {
  display: grid;
  gap: 20px;
}
.mood-form label,
.mood-follow label {
  display: grid;
  gap: 8px;
}
.mood-form fieldset {
  border: 0;
  padding: 0;
}
.mood-form legend {
  margin-bottom: 8px;
}
.mood-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.mood-options label {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 10px;
  min-height: 44px;
  cursor: pointer;
}
.mood-options .selected {
  border-color: var(--brand);
  background: var(--soft);
}
.mood-form input[type='range'] {
  width: 100%;
  min-height: 44px;
  accent-color: var(--brand);
}
.mood-form details label {
  margin-top: 16px;
}
.mood-form summary {
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  color: var(--brand);
}
.diary-meta {
  font-size: 14px;
  color: var(--muted);
  margin-bottom: 24px;
}
.diary-detail dt {
  font-weight: 600;
  margin: 16px 0 6px;
}
.diary-detail dd {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.mood-follow {
  border-top: 1px solid var(--line);
  margin-top: 24px;
  padding-top: 20px;
}
.mood-follow article {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}
.mood-follow article p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.mood-follow article small {
  color: var(--muted);
}
.mood-follow form {
  margin-top: 20px;
}
.mood-event {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arco-pagination {
  margin-top: 20px;
}
button:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 3px;
}
@media (max-width: 650px) {
  .mood-quick {
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .mood-quick button {
    min-width: 80px;
    padding: 12px;
  }
  .mood-filters label {
    flex-wrap: wrap;
  }
  .mood-options label {
    padding: 8px;
  }
}
</style>
