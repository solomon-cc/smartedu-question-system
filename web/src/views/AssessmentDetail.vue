<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, onBeforeRouteUpdate } from 'vue-router';
import { Message, Modal } from '@arco-design/web-vue';
import { IconArrowLeft, IconArrowRight, IconCheckCircle } from '@arco-design/web-vue/es/icon';
import { api, message } from '../lib/api';
import { manageQuestions } from '../lib/auth';
import { moduleName, type AssessmentDetail, type AssessmentResponse } from '../lib/assessments';
import type { Topic } from '../lib/types';
import PageState from '../components/PageState.vue';
import AssessmentMaterial from '../components/AssessmentMaterial.vue';
import { assessmentAsset } from '../lib/assessmentAssets';
import { useLeaveGuard } from '../components/useLeaveGuard';
const presentation = ref<Record<string, { steps: { instruction: string; visual: boolean }[] }>>({});
const route = useRoute(),
  data = ref<AssessmentDetail | null>(null),
  loading = ref(true),
  error = ref(''),
  saving = ref(false),
  saveError = ref(''),
  index = ref(0),
  page = ref(0),
  pdfLoading = ref(false),
  pdfError = ref(''),
  topics = ref<Topic[]>([]),
  targetOpen = ref(false),
  targetError = ref('');
const base = computed(
  () =>
    '/portal/assessments/' +
    encodeURIComponent(String(route.params.method)) +
    '/records/' +
    encodeURIComponent(String(route.params.id)),
);
const current = computed(() => data.value?.definition.items[index.value]);
const writable = computed(() => manageQuestions.value && data.value?.record.status === 'ongoing');
const form = ref({ score: null as number | null, response: '', notes: '' }),
  baseline = ref('');
const target = ref({ sourceCodes: [] as string[], objectiveId: '', target: '' }),
  targetBaseline = ref('');
const guard = useLeaveGuard(
  () =>
    (writable.value && JSON.stringify(form.value) !== baseline.value) ||
    (targetOpen.value && JSON.stringify(target.value) !== targetBaseline.value),
  () => saving.value,
);
const recorded = computed(() => data.value?.responses.length || 0),
  correct = computed(() => data.value?.responses.filter((r) => r.score === 1).length || 0),
  total = computed(() => data.value?.definition.items.length || 0);
const groups = computed(() =>
  [...new Set(data.value?.definition.items.map((i) => i.category) || [])].map((category) => {
    const items = data.value!.definition.items.filter((i) => i.category === category);
    const responses = data.value!.responses.filter((r) => items.some((i) => i.code === r.code));
    return {
      category,
      total: items.length,
      recorded: responses.length,
      correct: responses.filter((r) => r.score === 1).length,
    };
  }),
);
const instruction = computed(() => {
  if (!current.value) return '';
  const p = presentation.value[`${current.value.module}-${current.value.code}`];
  return p?.steps[page.value]?.instruction || current.value.script || '请根据原始材料施测。';
});
const steps = computed(() => {
  if (!current.value) return [];
  return presentation.value[`${current.value.module}-${current.value.code}`]?.steps || [];
});
const image = computed(() => {
  const i = current.value;
  if (!i) return '';
  if (i.definition?.responsePage) return 'response-' + i.definition.responsePage + '.png';
  if (steps.value.length && !steps.value[page.value]?.visual) return '';
  const p = i.definition?.stimulusPages[page.value];
  return p ? i.module + '-' + p + '.png' : '';
});
const stepCount = computed(() =>
  Math.max(steps.value.length, current.value?.definition?.stimulusPages.length || 0, 1),
);
const responseFor = (code: string) => data.value?.responses.find((r) => r.code === code);
const resultName = (score: number | null | undefined) =>
  score == null
    ? '未评估'
    : data.value?.definition.scoring.options.find((o) => o.value === score)?.title || String(score);
function reset() {
  const r = responseFor(current.value?.code || '');
  form.value = { score: r?.score ?? null, response: r?.response || '', notes: r?.notes || '' };
  baseline.value = JSON.stringify(form.value);
  page.value = 0;
  pdfError.value = '';
  saveError.value = '';
}
let generation = 0;
async function load() {
  const seq = ++generation;
  loading.value = true;
  error.value = '';
  try {
    const [record, materialSteps] = await Promise.all([
      api<AssessmentDetail>(base.value),
      manageQuestions.value ? api('/portal/assessment-presentation') : Promise.resolve({}),
    ]);
    if (seq !== generation) return;
    data.value = record;
    presentation.value = materialSteps;
    index.value = Math.max(
      0,
      data.value.definition.items.findIndex((i) => !responseFor(i.code)),
    );
    reset();
  } catch (e) {
    if (seq === generation) error.value = message(e);
  } finally {
    if (seq === generation) loading.value = false;
  }
}
async function openOriginal() {
  if (!current.value || pdfLoading.value) return;
  const item = current.value;
  const tab = window.open('about:blank', '_blank');
  if (!tab) {
    pdfError.value = '请允许此网站打开材料窗口后重试';
    return;
  }
  tab.opener = null;
  pdfLoading.value = true;
  pdfError.value = '';
  try {
    const blob = await assessmentAsset(item.module + '.pdf');
    const url = URL.createObjectURL(blob);
    tab.location.href = url + '#page=' + (item.definition?.scriptPages[0] || 1);
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    tab.close();
    pdfError.value = message(e);
  } finally {
    pdfLoading.value = false;
  }
}
async function chooseItem(e: Event) {
  const el = e.target as HTMLSelectElement;
  await go(Number(el.value));
  el.value = String(index.value);
}
onBeforeRouteUpdate(() => guard.confirm());
watch(base, load);
async function go(n: number) {
  if (await guard.confirm()) {
    index.value = n;
    reset();
  }
}
async function save(next = false) {
  if (form.value.score == null) {
    saveError.value = '请记录本项反应后保存';
    return;
  }
  if (!current.value || saving.value) return;
  saving.value = true;
  saveError.value = '';
  try {
    const r = await api<AssessmentResponse>(base.value + '/responses', 'POST', {
      code: current.value.code,
      ...form.value,
    });
    data.value!.responses = data.value!.responses.filter((v) => v.code !== r.code).concat(r);
    baseline.value = JSON.stringify(form.value);
    Message.success('本项记录已保存');
    if (next && index.value < total.value - 1) {
      index.value++;
      reset();
    }
  } catch (e) {
    saveError.value = message(e);
  } finally {
    saving.value = false;
  }
}
async function finish() {
  if (!(await guard.confirm())) return;
  Modal.warning({
    title: '复核并完成本次评估？',
    content: '请确认所有项目已按实际反应记录。完成后评估记录将锁定为只读。',
    okText: '确认完成',
    cancelText: '继续核对',
    hideCancel: false,
    onOk: async () => {
      saving.value = true;
      saveError.value = '';
      try {
        await api(base.value + '/complete', 'POST', {});
        await load();
        Message.success('评估已完成，可查看报告并安排练习');
      } catch (e) {
        saveError.value = message(e);
      } finally {
        saving.value = false;
      }
    },
  });
}
async function openTarget() {
  targetError.value = '';
  target.value = {
    sourceCodes: [],
    objectiveId: '',
    target: '',
  };
  targetBaseline.value = JSON.stringify(target.value);
  targetOpen.value = true;
  try {
    topics.value = await api<Topic[]>('/portal/catalog');
  } catch (e) {
    targetError.value = message(e);
  }
}
async function closeTarget() {
  if (await guard.confirm()) targetOpen.value = false;
}
async function saveTarget() {
  if (saving.value) return;
  saving.value = true;
  targetError.value = '';
  try {
    await api(base.value + '/targets', 'POST', target.value);
    targetOpen.value = false;
    await load();
    Message.success('针对性练习目标已安排');
  } catch (e) {
    targetError.value = message(e);
  } finally {
    saving.value = false;
  }
}
onBeforeUnmount(() => {
  generation++;
});
onMounted(load);
</script>
<template>
  <section class="container section assessment-detail">
    <router-link to="/assessment" class="text-link">
      <IconArrowLeft />
      返回评估中心
    </router-link>
    <PageState :loading="loading" :error="error" @retry="load" />
    <template v-if="data && !loading && !error">
      <div class="page-heading detail-heading">
        <div>
          <span class="company-label">{{ data.studentName }} · {{ data.record.date }}</span>
          <h1>PEAK 预评估 · {{ moduleName(data.record.module) }}</h1>
          <p>
            {{
              writable
                ? '逐项施测并保存记录，稍后可从进度继续。'
                : data.record.status === 'completed'
                  ? '评估报告 · 根据本次反应记录，了解能力表现与练习方向。'
                  : '评估进行中，老师完成复核后可查看完整报告与练习目标。'
            }}
          </p>
        </div>
        <a-tag :color="data.record.status === 'completed' ? 'green' : 'gray'">
          {{ data.record.status === 'completed' ? '已完成 · 只读' : '进行中' }}
        </a-tag>
      </div>
      <div class="assessment-summary">
        <div>
          <strong>{{ recorded }} / {{ total }}</strong>
          <span>已记录项目</span>
        </div>
        <div>
          <strong>{{ correct }}</strong>
          <span>正确反应</span>
        </div>
        <div>
          <strong>{{ recorded - correct }}</strong>
          <span>未通过</span>
        </div>
        <div>
          <strong>{{ total - recorded }}</strong>
          <span>未评估</span>
        </div>
      </div>
      <a-progress
        :percent="total ? recorded / total : 0"
        :show-text="false"
        aria-label="评估记录进度"
      />
      <a-alert v-if="saveError" type="error" class="detail-alert">{{ saveError }}</a-alert>
      <div v-if="writable" class="assessment-session">
        <div class="session-top">
          <label>
            当前项目
            <select :value="index" @change="chooseItem" aria-label="选择评估项目">
              <option v-for="(item, n) in data.definition.items" :key="item.code" :value="n">
                {{ n + 1 }}. {{ item.category }} · {{ item.code }} ·
                {{ resultName(responseFor(item.code)?.score) }}
              </option>
            </select>
          </label>
          <span>第 {{ index + 1 }} / {{ total }} 项</span>
        </div>
        <div v-if="current" class="session-grid">
          <div class="session-material">
            <span class="caps-label">{{ current.category }} · {{ current.code }}</span>
            <h2>{{ current.title }}</h2>
            <details class="teacher-instructions" open>
              <summary>施测指令（老师查看）</summary>
              <p>{{ instruction }}</p>
              <p v-if="current.definition?.note">{{ current.definition.note }}</p>
              <a-button class="text-link" type="text" :loading="pdfLoading" @click="openOriginal">
                查阅原始材料 ↗
              </a-button>
              <p v-if="pdfError" role="alert">{{ pdfError }}</p>
            </details>
            <div v-if="image" class="stimulus"><AssessmentMaterial :file="image" /></div>
            <p v-else class="assessment-note">本步骤不展示图片，请根据施测指令开展。</p>
            <div v-if="stepCount > 1" class="material-pages">
              <a-button :disabled="page === 0" @click="page--">上一页材料</a-button>
              <span>{{ page + 1 }} / {{ stepCount }}</span>
              <a-button :disabled="page >= stepCount - 1" @click="page++">下一页材料</a-button>
            </div>
          </div>
          <form class="session-response" @submit.prevent="save(true)">
            <h2>记录本项反应</h2>
            <p class="muted">未评估的项目不默认记为 0。</p>
            <fieldset :disabled="saving">
              <legend>反应结果</legend>
              <label
                v-for="option in data.definition.scoring.options"
                :key="option.value"
                class="score-choice"
              >
                <input type="radio" v-model="form.score" :value="option.value" name="score" />
                {{ option.title }}
              </label>
            </fieldset>
            <label>
              学生反应
              <textarea
                v-model="form.response"
                rows="3"
                maxlength="3000"
                placeholder="记录实际表现与使用的提示"
                :disabled="saving"
              />
            </label>
            <label>
              施测备注
              <textarea v-model="form.notes" rows="2" maxlength="3000" :disabled="saving" />
            </label>
            <div class="session-save">
              <a-button :loading="saving" @click="save(false)">保存本项</a-button>
              <a-button type="primary" html-type="submit" :loading="saving">
                {{ index === total - 1 ? '保存本项' : '保存并下一项' }}
              </a-button>
            </div>
          </form>
        </div>
        <div class="session-bottom">
          <a-button :disabled="index === 0 || saving" @click="go(index - 1)">
            <IconArrowLeft />
            上一项
          </a-button>
          <a-button :disabled="index >= total - 1 || saving" @click="go(index + 1)">
            跳过，稍后评估
            <IconArrowRight />
          </a-button>
        </div>
        <div class="complete-assessment">
          <p>已记录 {{ recorded }} / {{ total }} 项。完成全部项目后，可复核并锁定本次评估。</p>
          <a-button type="primary" :disabled="recorded !== total || saving" @click="finish">
            <IconCheckCircle />
            复核完成评估
          </a-button>
        </div>
      </div>
      <template v-else>
        <section class="report-section">
          <h2>能力领域概览</h2>
          <p class="muted">各领域展示本次评估记录，不与其他版本、模块直接换算。</p>
          <div class="report-groups">
            <article v-for="g in groups" :key="g.category">
              <strong>{{ g.category }}</strong>
              <p>{{ g.correct }} 项正确反应 / {{ g.total }} 项</p>
              <a-progress
                :percent="g.correct / g.total"
                :aria-label="g.category + '领域正确反应比例'"
                :show-text="false"
              />
              <small>已记录 {{ g.recorded }} 项</small>
            </article>
          </div>
        </section>
        <section class="report-section">
          <div class="page-heading">
            <div>
              <h2>针对性练习</h2>
              <p>
                {{
                  manageQuestions
                    ? '确认评估发现并关联题库中的教学目标。'
                    : '按老师确认的目标进行练习，巩固本次评估中需要支持的能力。'
                }}
              </p>
            </div>
            <a-button
              v-if="manageQuestions && data.record.status === 'completed'"
              type="primary"
              @click="openTarget"
            >
              安排练习目标
            </a-button>
          </div>
          <p v-if="!data.targets.length" class="assessment-empty">
            {{
              data.record.status === 'completed'
                ? '老师尚未安排练习目标。评估项目与练习题库独立，需老师确认关联后展示。'
                : '完成评估后，老师会根据结果确认适合的练习目标。'
            }}
          </p>
          <div class="target-list">
            <article v-for="t in data.targets" :key="t.id">
              <div>
                <h3>{{ t.target }}</h3>
                <p>{{ t.objectiveName }} · 关联评估项目 {{ t.sourceCodes.join('、') }}</p>
                <small>老师确认于 {{ t.confirmedAt.slice(0, 10) }}</small>
              </div>
              <router-link
                v-if="t.questionCount"
                :to="{ path: '/practice', query: { planId: t.id, target: t.target } }"
                class="button primary"
              >
                {{ manageQuestions ? '预览练习' : '开始针对性练习' }}
                <IconArrowRight />
              </router-link>
              <span v-else>练习题整理中</span>
            </article>
          </div>
        </section>
      </template>
      <section class="report-section">
        <h2>逐项记录</h2>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>项目</th>
                <th>领域</th>
                <th>结果</th>
                <th>实际反应</th>
                <th v-if="writable">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, n) in data.definition.items" :key="item.code">
                <td>{{ item.code }} · {{ item.title }}</td>
                <td>{{ item.category }}</td>
                <td>{{ resultName(responseFor(item.code)?.score) }}</td>
                <td>{{ responseFor(item.code)?.response || '—' }}</td>
                <td v-if="writable"><a-button @click="go(n)">记录</a-button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <p class="assessment-note">
        {{
          data.definition.instructions ||
          '本报告为本次评估原始反应的汇总，不提供标准分或诊断结论。未评估项目不计为未通过。'
        }}
        <br />
        版本：{{ data.record.version }}
      </p>
    </template>
  </section>
  <a-modal
    :visible="targetOpen"
    title="从评估结果安排练习"
    :footer="false"
    :mask-closable="false"
    :closable="!saving"
    :width="640"
    @cancel="closeTarget"
  >
    <form class="dialog-form target-form" @submit.prevent="saveTarget">
      <a-alert v-if="targetError" type="error">{{ targetError }}</a-alert>
      <fieldset class="target-items">
        <legend>关联评估发现（可多选）</legend>
        <label
          v-for="item in data?.definition.items.filter((i) => responseFor(i.code))"
          :key="item.code"
        >
          <input type="checkbox" v-model="target.sourceCodes" :value="item.code" />
          {{ item.code }} · {{ item.title }} · {{ resultName(responseFor(item.code)?.score) }}
        </label>
      </fieldset>
      <p class="muted">请选择与本次练习目标相关的评估项目，由老师确认关联。</p>
      <label>
        题库教学目标
        <select v-model="target.objectiveId" required aria-label="题库教学目标">
          <option value="" disabled>请选择已有练习题的目标</option>
          <optgroup
            v-for="t in topics.filter((t) => t.objectives.some((o) => o.id && o.count > 0))"
            :key="t.id"
            :label="t.name + ' · ' + t.grade + '年级'"
          >
            <option
              v-for="o in t.objectives.filter((o) => o.id && o.count > 0)"
              :key="o.id"
              :value="o.id"
            >
              {{ o.name }}（{{ o.count }} 题）
            </option>
          </optgroup>
        </select>
      </label>
      <label>
        具体练习目标
        <textarea
          v-model="target.target"
          required
          maxlength="1000"
          rows="3"
          placeholder="描述孩子将练习的具体能力"
        />
      </label>
      <div class="dialog-actions">
        <a-button :disabled="saving" @click="closeTarget">取消</a-button>
        <a-button type="primary" html-type="submit" :loading="saving">确认安排</a-button>
      </div>
    </form>
  </a-modal>
</template>
<style scoped>
.target-items {
  max-height: 240px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 12px;
}
.target-items label {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 8px;
}
.target-items input {
  min-height: 0;
  accent-color: var(--brand);
}
.assessment-detail.section {
  padding-top: 28px;
}
.assessment-detail .page-heading {
  margin-bottom: 20px;
}
.assessment-detail .page-heading h1 {
  margin-top: 8px;
}
.assessment-detail .assessment-summary {
  padding: 16px 0;
}
.assessment-detail .assessment-session {
  margin-top: 24px;
}
.detail-heading {
  margin-top: 28px;
}
.detail-heading h1 {
  font-size: 30px;
}
.assessment-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--line);
  padding: 16px 0;
  gap: 16px;
}
.assessment-summary div {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}
.assessment-summary strong {
  font-size: 16px;
}
.assessment-summary span,
.assessment-note {
  font-size: 14px;
  color: var(--muted);
}
.assessment-session {
  margin-top: 32px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 28px;
}
.session-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 28px;
}
.session-top label {
  display: flex;
  gap: 12px;
  align-items: center;
}
.session-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 1fr);
  gap: 36px;
}
.session-grid h2 {
  font-size: 22px;
  margin: 12px 0 20px;
}
.session-material {
  min-width: 0;
}
.teacher-instructions {
  background: var(--soft);
  padding: 16px;
  border-radius: 6px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.teacher-instructions summary {
  cursor: pointer;
  color: var(--brand);
  min-height: 28px;
}
.teacher-instructions p {
  margin: 14px 0;
  font-size: 14px;
}
.stimulus {
  background: white;
  border: 1px solid var(--line);
  min-height: 180px;
  margin-top: 20px;
  padding: 12px;
  text-align: center;
}
.stimulus img {
  max-height: 480px;
  width: 100%;
  object-fit: contain;
}
.material-pages,
.session-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  gap: 12px;
}
.session-response {
  border-left: 1px solid var(--line);
  padding-left: 32px;
}
.session-response > label,
.target-form > label {
  display: grid;
  gap: 8px;
  margin-top: 20px;
}
.session-response fieldset {
  border: 0;
  padding: 0;
  margin: 24px 0;
}
.score-choice {
  display: flex;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--line);
  margin-top: 10px;
  border-radius: 6px;
  cursor: pointer;
}
.score-choice input {
  min-height: 0;
  accent-color: var(--brand);
}
select,
textarea,
input {
  border: 1px solid var(--line);
  background: white;
  color: var(--ink);
  padding: 10px 12px;
  border-radius: 6px;
  min-height: 44px;
  max-width: 100%;
}
.session-save {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}
.complete-assessment {
  border-top: 1px solid var(--line);
  margin-top: 28px;
  padding-top: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.complete-assessment p {
  color: var(--muted);
  font-size: 14px;
}
.report-section {
  margin-top: 48px;
}
.report-section > h2 {
  font-size: 24px;
  margin-bottom: 16px;
}
.report-groups {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-top: 24px;
}
.report-groups article {
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 20px;
}
.report-groups strong {
  font-size: 20px;
}
.report-groups p,
.report-groups small {
  color: var(--muted);
  font-size: 14px;
  margin: 12px 0;
  display: block;
}
.target-list article {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 6px;
  margin-top: 16px;
}
.target-list h3 {
  font-size: 20px;
}
.target-list p {
  margin: 8px 0;
  overflow-wrap: anywhere;
}
.target-list small {
  color: var(--muted);
}
.assessment-empty {
  padding: 24px;
  background: var(--soft);
  color: var(--muted);
}
.assessment-note {
  margin-top: 28px;
  line-height: 1.9;
}
.detail-alert {
  margin: 20px 0;
}
.report-section td {
  max-width: 400px;
  white-space: normal;
  overflow-wrap: anywhere;
}
@media (max-width: 900px) {
  .session-grid {
    grid-template-columns: 1fr;
  }
  .session-response {
    border-left: 0;
    padding-left: 0;
    border-top: 1px solid var(--line);
    padding-top: 24px;
  }
  .report-groups {
    grid-template-columns: 1fr 1fr;
  }
  .target-list article {
    align-items: start;
    flex-direction: column;
  }
}
@media (max-width: 540px) {
  .assessment-summary {
    gap: 12px;
  }
  .assessment-summary strong {
    font-size: 22px;
  }
  .assessment-summary span {
    font-size: 12px;
  }
  .assessment-session {
    padding: 16px;
  }
  .session-top,
  .session-top label,
  .complete-assessment {
    align-items: start;
    flex-direction: column;
  }
  .detail-heading h1 {
    font-size: 24px;
  }
  .report-groups {
    gap: 12px;
  }
  .session-save > * {
    flex: 1;
  }
}
</style>
