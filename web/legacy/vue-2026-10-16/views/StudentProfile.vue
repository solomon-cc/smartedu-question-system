<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { auth, can } from '../stores/auth';
import { allQuestions, request } from '../lib/api';
import { localDate, messageOf, required, type Question, type RecordData } from '../lib/types';
import { validateForm } from '../lib/forms';
import {
  assessmentLabel,
  comparisonLabel,
  type LearningPlan,
  type PlanComparison,
} from '../lib/learningPlan';
import {
  assessmentClient,
  assessmentKey,
  listAssessmentMethods,
  listAssessmentRecords,
  responseLabel,
  type AssessmentRecord,
  type AssessmentResponse,
  type AssessmentItem,
  type AssessmentDefinition,
  type AssessmentMethodInfo,
} from '../lib/assessments';
import PageHeader from '../components/PageHeader.vue';
import Feedback from '../components/Feedback.vue';
import EmptyState from '../components/EmptyState.vue';
import EditorDialog from '../components/EditorDialog.vue';
const route = useRoute();
const studentId = computed(() => String(route.params.id));
const base = computed(() => `/students/${encodeURIComponent(studentId.value)}/learning-plans`);
const detail = ref<RecordData | null>(null),
  assessments = ref<AssessmentRecord[]>([]),
  plans = ref<LearningPlan[]>([]),
  catalog = ref<AssessmentItem[]>([]),
  topics = ref<RecordData[]>([]);
const methods = ref<AssessmentMethodInfo[]>([]),
  definition = ref<AssessmentDefinition>();
const methodId = (record?: { methodId?: string }) => record?.methodId || 'peak';
const methodInfo = (record?: { methodId?: string }) =>
  methods.value.find((m) => m.id === methodId(record));
const methodName = (record?: { methodId?: string }) => methodInfo(record)?.name || methodId(record);
const loading = ref(false),
  error = ref(''),
  assessmentError = ref(''),
  plansError = ref(''),
  notice = ref('');
const canPlans = computed(() => can('assessment_history') && can('ability_tracking'));
const canAssign = computed(
  () => canPlans.value && ['questions', 'papers', 'assignments'].every(can),
);
const owned = (plan: LearningPlan) =>
  auth.user?.role === 'ADMIN' || plan.confirmedBy === auth.user?.id;
const completed = computed(() => assessments.value.filter((a) => a.status === 'completed'));
const chosen = ref(''),
  scores = ref<AssessmentResponse[]>([]),
  findingsLoading = ref(false),
  findingsError = ref('');
const selectedCodes = ref<string[]>([]),
  showAll = ref(false);
const current = computed(() => assessments.value.find((a) => assessmentKey(a) === chosen.value));
const findings = computed(() =>
  catalog.value
    .filter((i) => i.module === current.value?.module)
    .map((i) => ({ ...i, result: scores.value.find((s) => s.code === i.code) }))
    .filter(
      (i) =>
        i.result &&
        (showAll.value ||
          !definition.value?.scoring.reviewValues?.length ||
          (i.result.score !== null &&
            definition.value.scoring.reviewValues.includes(i.result.score))),
    ),
);
const goals = computed(() =>
  topics.value.flatMap((t) =>
    (t.objectives || []).map((o: RecordData) => ({ ...o, title: `${o.name} · ${t.name}` })),
  ),
);
const homework = (plan: LearningPlan | null) =>
  plan ? detail.value?.homework?.find((h: RecordData) => h.id === plan.homeworkId) : undefined;
const followup = (plan: LearningPlan) =>
  assessments.value.find(
    (a) => a.id === plan.followupAssessmentId && methodId(a) === methodId(plan),
  );
const writer = computed(() => auth.user?.role === 'ADMIN' || auth.user?.role === 'TEACHER');
let loadSequence = 0,
  findingSequence = 0;
async function load() {
  const sequence = ++loadSequence;
  loading.value = true;
  error.value = '';
  assessmentError.value = '';
  plansError.value = '';
  try {
    const data = await request(`/students/${encodeURIComponent(studentId.value)}`);
    if (sequence !== loadSequence) return;
    detail.value = data;
    const [a, p, t, defs] = await Promise.allSettled([
      can('assessment_history') ? listAssessmentRecords(studentId.value) : Promise.resolve([]),
      canPlans.value ? request<LearningPlan[]>(base.value) : Promise.resolve([]),
      can('ability_tracking') ? request<RecordData[]>('/skills') : Promise.resolve([]),
      can('assessment_history') ? listAssessmentMethods() : Promise.resolve([]),
    ]);
    if (sequence !== loadSequence) return;
    if (a.status === 'fulfilled') assessments.value = a.value;
    else assessmentError.value = messageOf(a.reason);
    if (p.status === 'fulfilled') plans.value = p.value;
    else plansError.value = messageOf(p.reason);
    if (t.status === 'fulfilled') topics.value = t.value;
    else plansError.value = messageOf(t.reason);
    if (defs.status === 'fulfilled') methods.value = defs.value;
    else assessmentError.value = messageOf(defs.reason);
    const requested = String(route.query.assessmentId || '');
    if (!chosen.value) {
      const selected = requested
        ? completed.value.find(
            (a) => a.id === requested && methodId(a) === String(route.query.methodId || 'peak'),
          )
        : completed.value[0];
      chosen.value = selected ? assessmentKey(selected) : '';
      if (requested && !selected)
        assessmentError.value = '指定的评估不存在或尚未完成，请从评估中心查看。';
    }
  } catch (e) {
    if (sequence === loadSequence) error.value = messageOf(e);
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}
async function loadFindings() {
  const sequence = ++findingSequence;
  const record = current.value;
  scores.value = [];
  catalog.value = [];
  definition.value = undefined;
  selectedCodes.value = [];
  showAll.value = false;
  findingsError.value = '';
  if (!record) {
    findingsLoading.value = false;
    return;
  }
  findingsLoading.value = true;
  try {
    const client = assessmentClient(methodId(record));
    const [def, responses] = await Promise.all([
      client.catalog(record.version),
      client.responses(record.id),
    ]);
    if (sequence !== findingSequence) return;
    definition.value = def;
    catalog.value = def.items;
    scores.value = responses;
  } catch (e) {
    if (sequence === findingSequence) findingsError.value = messageOf(e);
  } finally {
    if (sequence === findingSequence) findingsLoading.value = false;
  }
}
const goalOpen = ref(false),
  goalSaving = ref(false),
  goalError = ref('');
const goalForm = ref({
  methodId: '',
  assessmentId: '',
  sourceCodes: [] as string[],
  objectiveId: '',
  target: '',
  notes: '',
});
const goalBaseline = ref(''),
  lastSuggested = ref('');
const goalDirty = computed(() => JSON.stringify(goalForm.value) !== goalBaseline.value);
function openGoal() {
  goalForm.value = {
    methodId: methodId(current.value),
    assessmentId: current.value?.id || '',
    sourceCodes: [...selectedCodes.value],
    objectiveId: '',
    target: '',
    notes: '',
  };
  lastSuggested.value = '';
  goalBaseline.value = JSON.stringify(goalForm.value);
  goalError.value = '';
  goalOpen.value = true;
}
function goalChanged(id: string) {
  const suggested = goals.value.find((g) => g.id === id)?.target || '';
  if (!goalForm.value.target.trim() || goalForm.value.target === lastSuggested.value)
    goalForm.value.target = suggested;
  lastSuggested.value = suggested;
}
async function confirmGoal(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event)) || goalSaving.value) return;
  goalSaving.value = true;
  goalError.value = '';
  try {
    const plan = await request<LearningPlan>(base.value, 'POST', goalForm.value);
    plans.value = [plan, ...plans.value];
    goalOpen.value = false;
    selectedCodes.value = [];
    notice.value = '教学目标已确认，可以选择训练题并布置任务';
  } catch (e) {
    goalError.value = messageOf(e);
  } finally {
    goalSaving.value = false;
  }
}
const assignmentOpen = ref(false),
  assignmentSaving = ref(false),
  assignmentError = ref(''),
  questionsLoading = ref(false);
const activePlan = ref<LearningPlan | null>(null),
  questions = ref<Question[]>([]),
  search = ref('');
const assignmentForm = ref({
  name: '',
  questionIds: [] as string[],
  startDate: localDate(),
  endDate: localDate(),
});
const assignmentBaseline = ref('');
const assignmentDirty = computed(
  () => JSON.stringify(assignmentForm.value) !== assignmentBaseline.value,
);
const visibleQuestions = computed(() =>
  questions.value.filter((q) =>
    q.stemText.toLowerCase().includes(search.value.trim().toLowerCase()),
  ),
);
async function openAssignment(plan: LearningPlan) {
  activePlan.value = plan;
  questions.value = [];
  search.value = '';
  assignmentError.value = '';
  assignmentForm.value = {
    name: `${plan.objectiveName} · 训练`,
    questionIds: [],
    startDate: localDate(),
    endDate: localDate(),
  };
  assignmentBaseline.value = JSON.stringify(assignmentForm.value);
  assignmentOpen.value = true;
  await loadQuestions();
}
async function loadQuestions() {
  if (!activePlan.value) return;
  questionsLoading.value = true;
  assignmentError.value = '';
  try {
    questions.value = await allQuestions({ objectiveId: activePlan.value.objectiveId });
  } catch (e) {
    assignmentError.value = messageOf(e);
  } finally {
    questionsLoading.value = false;
  }
}
async function assign(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event)) || assignmentSaving.value || !activePlan.value) return;
  assignmentSaving.value = true;
  assignmentError.value = '';
  try {
    const updated = await request<LearningPlan>(
      `${base.value}/${activePlan.value.id}/assign`,
      'POST',
      assignmentForm.value,
    );
    plans.value = plans.value.map((p) => (p.id === updated.id ? updated : p));
    assignmentOpen.value = false;
    notice.value = '训练任务已布置，学生可在「我的作业」中打开';
    await load();
  } catch (e) {
    assignmentError.value = messageOf(e);
  } finally {
    assignmentSaving.value = false;
  }
}
const reassessPlan = ref<LearningPlan | null>(null),
  reassessBusy = ref(false),
  actionError = ref('');
async function reassess() {
  if (!reassessPlan.value || reassessBusy.value) return;
  reassessBusy.value = true;
  actionError.value = '';
  try {
    const updated = await request<LearningPlan>(
      `${base.value}/${reassessPlan.value.id}/reassessment`,
      'POST',
      {},
    );
    plans.value = plans.value.map((p) => (p.id === updated.id ? updated : p));
    reassessPlan.value = null;
    await load();
    notice.value = '复测已创建，点击「继续复测」开始施测';
  } catch (e) {
    actionError.value = messageOf(e);
  } finally {
    reassessBusy.value = false;
  }
}
const comparisonOpen = ref(false),
  comparisonBusy = ref(false),
  comparisonError = ref(''),
  comparison = ref<PlanComparison | null>(null);
const comparisonPlan = ref<LearningPlan | null>(null);
async function compare(plan: LearningPlan) {
  comparisonPlan.value = plan;
  comparisonOpen.value = true;
  comparison.value = null;
  comparisonBusy.value = true;
  comparisonError.value = '';
  try {
    comparison.value = await request<PlanComparison>(`${base.value}/${plan.id}/comparison`);
  } catch (e) {
    comparisonError.value = messageOf(e);
  } finally {
    comparisonBusy.value = false;
  }
}
watch(chosen, loadFindings);
watch(studentId, () => {
  detail.value = null;
  assessments.value = [];
  plans.value = [];
  chosen.value = '';
  void load();
});
onMounted(load);
</script>
<template>
  <PageHeader
    :title="detail ? `${detail.student.name || detail.student.username}的学生档案` : '学生档案'"
    description="从评估发现到教学目标、训练任务与复测，持续跟进同一名学生。"
  >
    <v-btn variant="outlined" to="/students" prepend-icon="mdi-arrow-left">学生列表</v-btn>
    <v-btn variant="outlined" :loading="loading" @click="load">刷新档案</v-btn>
  </PageHeader>
  <Feedback :error="error" :loading="loading" @retry="load" />
  <template v-if="detail && !error">
    <v-card class="pa-6 mb-6">
      <div class="d-flex ga-4 align-center flex-wrap">
        <v-avatar color="primary" variant="tonal" size="56">
          <v-icon icon="mdi-account-school-outline" />
        </v-avatar>
        <div>
          <h2>{{ detail.student.name || detail.student.username }}</h2>
          <p class="muted">
            账号 {{ detail.student.username }} ·
            {{ detail.student.status === 'active' ? '在读' : '已停用' }}
          </p>
        </div>
      </div>
      <ol class="workflow-path" aria-label="教学跟进流程">
        <li
          v-for="(step, index) in [
            '学生档案',
            '评估发现',
            '确认目标',
            '选择训练题',
            '布置任务',
            '复测对比',
          ]"
          :key="step"
        >
          <span>{{ index + 1 }}</span>
          {{ step }}
        </li>
      </ol>
    </v-card>
    <div class="profile-grid">
      <section aria-labelledby="findings-title">
        <v-card class="pa-6">
          <div class="section-heading">
            <div>
              <div class="eyebrow">了解学生</div>
              <h2 id="findings-title">评估发现</h2>
            </div>
            <v-btn
              v-if="writer && can('assessment_history')"
              variant="outlined"
              :to="{ path: '/assessment', query: { studentId, new: '1' } }"
            >
              新建评估
            </v-btn>
          </div>
          <p v-if="!can('assessment_history')" class="muted mt-4">当前账号没有评估查看权限。</p>
          <Feedback v-else-if="assessmentError" :error="assessmentError" @retry="load" />
          <template v-else-if="!loading">
            <EmptyState
              v-if="!assessments.length"
              title="还没有评估"
              description="先完成一次评估，记录学生的实际反应。"
              icon="mdi-clipboard-text-outline"
            />
            <template v-else>
              <div
                v-for="a in assessments.filter((a) => a.status !== 'completed')"
                :key="assessmentKey(a)"
                class="assessment-brief"
              >
                <span>{{ assessmentLabel(a, methodName(a)) }}</span>
                <v-btn
                  variant="text"
                  :to="{
                    path: '/assessment',
                    query: { studentId, methodId: methodId(a), assessmentId: a.id },
                  }"
                >
                  继续评估
                </v-btn>
              </div>
              <v-select
                v-if="completed.length"
                v-model="chosen"
                class="mt-4"
                label="用于确认目标的已完成评估"
                :items="
                  completed.map((a) => ({
                    title: assessmentLabel(a, methodName(a)),
                    value: assessmentKey(a),
                  }))
                "
                hide-details
              />
              <p v-else class="muted mt-4">完成评估后，可从已记录的项目确认教学目标。</p>
              <template v-if="current">
                <div class="d-flex align-center ga-3 flex-wrap mt-4">
                  <v-switch
                    v-if="definition?.scoring.reviewValues?.length"
                    v-model="showAll"
                    color="primary"
                    :label="definition?.scoring.reviewToggleLabel || '包含所有已记录项目'"
                    hide-details
                    density="compact"
                  />
                  <v-btn
                    variant="text"
                    :to="{
                      path: '/assessment',
                      query: { studentId, methodId: methodId(current), assessmentId: current.id },
                    }"
                  >
                    查看完整评估
                  </v-btn>
                </div>
                <p class="muted mb-3">
                  选择需要跟进的项目，结合实际反应由老师确认目标。评估项目不会自动变成训练题。
                </p>
                <Feedback :error="findingsError" :loading="findingsLoading" @retry="loadFindings" />
                <div v-if="!findingsLoading && !findingsError" class="findings-list">
                  <label v-for="item in findings" :key="item.code" class="finding-row">
                    <v-checkbox
                      v-model="selectedCodes"
                      :value="item.code"
                      :aria-label="`选择 ${item.code} ${item.title}`"
                      hide-details
                      density="compact"
                      :disabled="!canPlans || !writer || !methodInfo(current)?.canLinkTargets"
                    />
                    <div>
                      <strong>{{ item.title }}</strong>
                      <p class="muted">
                        {{ item.code }} · {{ responseLabel(item.result || null, definition) }}
                      </p>
                      <p v-if="item.result?.response">反应：{{ item.result.response }}</p>
                      <p v-if="item.result?.notes" class="muted">记录：{{ item.result.notes }}</p>
                    </div>
                  </label>
                  <EmptyState
                    v-if="!findings.length"
                    title="当前没有待跟进项目"
                    description="可调整项目筛选，或查看完整评估中的反应记录。"
                  />
                </div>
                <v-btn
                  v-if="writer && canPlans && methodInfo(current)?.canLinkTargets"
                  block
                  color="primary"
                  class="mt-4"
                  :disabled="
                    !selectedCodes.length ||
                    findingsLoading ||
                    !!findingsError ||
                    loading ||
                    detail.student.status !== 'active'
                  "
                  @click="openGoal"
                >
                  确认教学目标{{ selectedCodes.length ? ` · 已选 ${selectedCodes.length} 项` : '' }}
                </v-btn>
                <p v-else class="muted mt-4">此评估的目标关联能力或当前账号权限尚未开放。</p>
              </template>
            </template>
          </template>
        </v-card>
      </section>
      <section aria-labelledby="plans-title">
        <div class="section-heading mb-4">
          <div>
            <div class="eyebrow">安排下一步</div>
            <h2 id="plans-title">目标与训练计划</h2>
          </div>
          <v-btn
            v-if="can('ability_tracking')"
            variant="text"
            :to="{ path: '/ability-tracking', query: { studentId } }"
          >
            管理教学目标
          </v-btn>
        </div>
        <p v-if="!canPlans" class="muted">需要教学目标与评估模块权限才能查看计划。</p>
        <Feedback v-else-if="plansError" :error="plansError" @retry="load" />
        <EmptyState
          v-else-if="!plans.length && !loading"
          title="从一条评估发现开始"
          description="选择评估项目，确认教学目标，再为学生安排训练。"
          icon="mdi-target"
        />
        <v-card v-for="plan in plans" v-else :key="plan.id" class="pa-6 mb-4">
          <div class="d-flex ga-3 justify-space-between flex-wrap">
            <h3>{{ plan.objectiveName }}</h3>
            <v-chip size="small" :color="plan.homeworkId ? 'primary' : 'secondary'">
              {{
                plan.followupAssessmentId
                  ? followup(plan)?.status === 'completed'
                    ? '复测已完成'
                    : '复测中'
                  : plan.homeworkId
                    ? '已布置训练'
                    : '待选题布置'
              }}
            </v-chip>
          </div>
          <p class="plan-target mt-3">{{ plan.target }}</p>
          <p class="muted mt-3">
            老师确认于 {{ plan.confirmedAt.slice(0, 10) }} · {{ methodName(plan) }}
            {{ plan.module }} ·
            {{ plan.sourceCodes.join('、') }}
          </p>
          <p v-if="plan.notes" class="muted mt-2">{{ plan.notes }}</p>
          <div v-if="plan.homeworkId" class="task-summary mt-4">
            <strong>{{ homework(plan)?.name || '训练任务已创建' }}</strong>
            <p class="muted">{{ homework(plan)?.startDate }} — {{ homework(plan)?.endDate }}</p>
            <p v-if="homework(plan)?.status === 'completed'">
              学生已提交 · 答对 {{ homework(plan)?.correctCount }} / {{ homework(plan)?.total }} 题
            </p>
            <p v-else>
              {{
                homework(plan)?.status === 'overdue'
                  ? '已过截止日期，尚未提交'
                  : '等待学生在「我的作业」中完成'
              }}
            </p>
          </div>
          <p v-if="!owned(plan)" class="muted mt-3">由其他老师确认；当前可查看记录。</p>
          <div class="d-flex ga-2 flex-wrap mt-4">
            <v-btn
              v-if="!plan.homeworkId && owned(plan)"
              color="primary"
              :disabled="!canAssign || loading || detail.student.status !== 'active'"
              @click="openAssignment(plan)"
            >
              选择训练题并布置
            </v-btn>
            <v-btn
              v-if="plan.homeworkId && !plan.followupAssessmentId && owned(plan)"
              color="primary"
              :disabled="loading || detail.student.status !== 'active'"
              @click="
                reassessPlan = plan;
                actionError = '';
              "
            >
              开始复测
            </v-btn>
            <v-btn
              v-if="plan.followupAssessmentId"
              color="primary"
              :to="{
                path: '/assessment',
                query: {
                  studentId,
                  methodId: methodId(plan),
                  assessmentId: plan.followupAssessmentId,
                },
              }"
            >
              {{ followup(plan)?.status === 'completed' ? '查看复测' : '继续复测' }}
            </v-btn>
            <v-btn
              v-if="plan.followupAssessmentId && methodInfo(plan)?.canCompare"
              variant="outlined"
              @click="compare(plan)"
            >
              复测对比
            </v-btn>
          </div>
          <p v-if="!plan.homeworkId && !canAssign" class="muted mt-3">
            选题布置需要题库、试卷和作业模块权限。
          </p>
        </v-card>
      </section>
    </div>
    <v-card class="pa-6 mt-6">
      <h2>近期训练记录</h2>
      <p class="muted mt-2">答题结果用于回看训练表现；一次正确率不等同于稳定掌握。</p>
      <EmptyState
        v-if="!detail.history?.length"
        title="还没有训练记录"
        description="学生提交训练后，记录会显示在这里。"
      />
      <div v-for="h in detail.history" :key="h.id" class="history-row">
        <div>
          <strong>{{ h.name }}</strong>
          <p class="muted">{{ h.date }}</p>
        </div>
        <span>答对 {{ h.correctCount }} / {{ h.total }} 题</span>
      </div>
    </v-card>
  </template>
  <EditorDialog
    v-model="goalOpen"
    :dirty="goalDirty"
    :saving="goalSaving"
    :max-width="720"
    v-slot="{ close }"
  >
    <v-card title="老师确认教学目标">
      <v-form @submit.prevent="confirmGoal">
        <v-card-text>
          <p class="muted mb-4">
            已选
            {{ goalForm.sourceCodes.length }}
            条评估发现。请根据学生表现确认已有教学目标，并填写本次训练的具体要求。
          </p>
          <v-alert v-if="goalError" type="error" variant="tonal" class="mb-4" role="alert">
            {{ goalError }}
          </v-alert>
          <div class="mb-4">
            <p v-for="code in goalForm.sourceCodes" :key="code" class="muted">
              {{ code }} ·
              {{
                catalog.find((item) => item.code === code && item.module === current?.module)?.title
              }}
            </p>
          </div>
          <v-autocomplete
            v-model="goalForm.objectiveId"
            label="关联教学目标"
            :items="goals"
            item-title="title"
            item-value="id"
            :rules="[required]"
            @update:model-value="goalChanged"
          />
          <v-alert v-if="!goals.length" type="info" variant="tonal" class="mb-4">
            还没有可选择的教学目标。请先到「管理教学目标」添加目标，再返回确认。
          </v-alert>
          <v-textarea
            v-model="goalForm.target"
            label="本次训练目标"
            hint="例如：在三种不同材料中，独立选择指定图片。写明行为、条件和观察要求。"
            persistent-hint
            :rules="[required]"
            :maxlength="4000"
            auto-grow
            rows="3"
          />
          <v-textarea
            v-model="goalForm.notes"
            label="老师备注（选填）"
            :maxlength="4000"
            rows="2"
            class="mt-4"
          />
          <p class="muted mt-3">确认后保留目标与评估关联记录；需要调整方向时可确认一个新目标。</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="goalSaving" @click="close">取消</v-btn>
          <v-btn
            type="submit"
            color="primary"
            variant="flat"
            :loading="goalSaving"
            :disabled="!goals.length"
          >
            确认并保存目标
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </EditorDialog>
  <EditorDialog
    v-model="assignmentOpen"
    :dirty="assignmentDirty"
    :saving="assignmentSaving"
    :max-width="900"
    v-slot="{ close }"
  >
    <v-card title="选择训练题并布置">
      <v-form @submit.prevent="assign">
        <v-card-text>
          <p class="mb-4">
            <strong>{{ activePlan?.objectiveName }}</strong>
            · {{ activePlan?.target }}
          </p>
          <v-alert v-if="assignmentError" type="error" variant="tonal" role="alert" class="mb-4">
            {{ assignmentError }}
            <v-btn v-if="!questions.length" variant="text" @click="loadQuestions">
              重试加载题目
            </v-btn>
          </v-alert>
          <v-text-field
            v-model="assignmentForm.name"
            label="任务名称"
            :rules="[required]"
            maxlength="100"
          />
          <div class="date-fields">
            <v-text-field
              v-model="assignmentForm.startDate"
              label="开始日期"
              type="date"
              :rules="[required]"
            />
            <v-text-field
              v-model="assignmentForm.endDate"
              label="截止日期"
              type="date"
              :min="assignmentForm.startDate"
              :rules="[
                required,
                (value: string) => value >= assignmentForm.startDate || '截止日期不能早于开始日期',
              ]"
            />
          </div>
          <p class="muted mb-4">
            仅显示关联此教学目标的训练题。任务保存题目快照，后续题库修改不会改变已布置的内容。
          </p>
          <v-text-field
            v-model="search"
            label="搜索训练题"
            prepend-inner-icon="mdi-magnify"
            hide-details
            class="mb-4"
          />
          <v-progress-linear
            v-if="questionsLoading"
            indeterminate
            color="primary"
            aria-label="加载训练题"
          />
          <div v-if="!questionsLoading && !assignmentError" class="training-questions">
            <EmptyState
              v-if="!questions.length"
              title="此教学目标还没有训练题"
              description="先在题库添加或关联训练题，再回到本档案布置。"
            />
            <EmptyState
              v-else-if="!visibleQuestions.length"
              title="没有匹配的训练题"
              description="试试其他搜索词。"
            />
            <label v-for="q in visibleQuestions" :key="q.id" class="training-row">
              <v-checkbox
                v-model="assignmentForm.questionIds"
                :value="q.id"
                :aria-label="`选择 ${q.stemText || '图片题'}`"
                hide-details
                density="compact"
              />
              <div>
                <strong>{{ q.stemText || '图片题' }}</strong>
                <img v-if="q.stemImage" :src="q.stemImage" alt="训练题题干图片" loading="lazy" />
                <div class="option-previews">
                  <span v-for="o in q.options" :key="o.value">
                    {{ o.value }} {{ o.text }}
                    <img v-if="o.image" :src="o.image" :alt="`选项 ${o.value}`" loading="lazy" />
                  </span>
                </div>
              </div>
            </label>
          </div>
          <div class="d-flex flex-wrap ga-2 mt-4">
            <v-btn variant="outlined" :disabled="questionsLoading" @click="loadQuestions">
              刷新训练题
            </v-btn>
            <v-btn
              v-if="activePlan"
              variant="text"
              :to="{
                path: '/questions',
                query: { objectiveId: activePlan.objectiveId, studentId },
              }"
            >
              补充训练题
            </v-btn>
            <span class="muted align-self-center">
              已选 {{ assignmentForm.questionIds.length }} / 100 题 · 布置给
              {{ detail?.student.name }}
            </span>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :disabled="assignmentSaving" @click="close">取消</v-btn>
          <v-btn
            type="submit"
            color="primary"
            variant="flat"
            :loading="assignmentSaving"
            :disabled="
              questionsLoading ||
              !assignmentForm.questionIds.length ||
              assignmentForm.questionIds.length > 100
            "
          >
            布置给学生
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </EditorDialog>
  <v-dialog
    :model-value="!!reassessPlan"
    :persistent="reassessBusy"
    max-width="580"
    @update:model-value="reassessPlan = null"
  >
    <v-card title="开始同模块复测">
      <v-card-text>
        <p>
          将为 {{ detail?.student.name }} 创建新的 {{ methodName(reassessPlan || undefined) }}
          {{ reassessPlan?.module }} 评估，保留同版本、同模块的基线用于对比。
        </p>
        <p class="muted mt-3">
          {{
            homework(reassessPlan)?.status === 'completed'
              ? '学生已提交训练任务。'
              : '训练任务尚未提交，请结合线下训练情况决定复测时间。'
          }}复测按原评估方法的完成规则复核；未评项目不会按零分处理。
        </p>
        <v-alert v-if="actionError" type="error" class="mt-3" role="alert">
          {{ actionError }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="reassessBusy" @click="reassessPlan = null">取消</v-btn>
        <v-btn color="primary" variant="flat" :loading="reassessBusy" @click="reassess">
          创建复测
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="comparisonOpen" max-width="1000" scrollable>
    <v-card title="复测对比">
      <v-card-text>
        <Feedback
          :error="comparisonError"
          :loading="comparisonBusy"
          @retry="comparisonPlan && compare(comparisonPlan)"
        />
        <template v-if="comparison && !comparisonError">
          <p>{{ comparisonPlan?.objectiveName }} · {{ comparisonPlan?.target }}</p>
          <p class="muted mt-2">
            {{ methodName(comparison.baseline) }} {{ comparison.baseline.module }} · 基线
            {{ comparison.baseline.date }} → 复测 {{ comparison.followup.date }} ·
            {{ comparison.followup.status === 'completed' ? '已完成' : '评估中，结果待补全' }}
          </p>
          <p class="muted my-4">
            以下仅比较此目标关联项目的原始反应。未评不参与比较，单次变化不代表稳定掌握或训练的因果效果。
          </p>
          <div class="comparison-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">关联项目</th>
                  <th scope="col">基线</th>
                  <th scope="col">复测</th>
                  <th scope="col">观察</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in comparison.items" :key="row.code">
                  <th scope="row">
                    {{ row.title }}
                    <p class="muted">{{ row.code }}</p>
                  </th>
                  <td>
                    {{
                      responseLabel(
                        row.before,
                        comparison.scoring ? { scoring: comparison.scoring } : undefined,
                      )
                    }}
                    <p class="muted">{{ row.before?.response }} {{ row.before?.notes }}</p>
                  </td>
                  <td>
                    {{
                      responseLabel(
                        row.after,
                        comparison.scoring ? { scoring: comparison.scoring } : undefined,
                      )
                    }}
                    <p class="muted">{{ row.after?.response }} {{ row.after?.notes }}</p>
                  </td>
                  <td>{{ comparisonLabel(row.before, row.after, row.observation) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="flat" color="primary" @click="comparisonOpen = false">关闭对比</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-snackbar :model-value="!!notice" color="success" @update:model-value="notice = ''">
    {{ notice }}
  </v-snackbar>
</template>
<style scoped>
.workflow-path {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  margin-top: 24px;
}
.workflow-path li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.workflow-path span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 24px;
  align-items: start;
}
.section-heading,
.assessment-brief,
.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.assessment-brief,
.history-row {
  padding: 16px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
.findings-list,
.training-questions {
  max-height: 520px;
  overflow-y: auto;
}
.finding-row,
.training-row {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  align-items: flex-start;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  cursor: pointer;
}
.finding-row :deep(.v-checkbox),
.training-row :deep(.v-checkbox) {
  flex: 0 0 44px;
}
.finding-row > div:last-child,
.training-row > div:last-child {
  min-width: 0;
  overflow-wrap: anywhere;
}
.plan-target {
  font-size: 16px;
  overflow-wrap: anywhere;
}
.task-summary {
  background: rgba(var(--v-theme-primary), 0.06);
  padding: 16px;
  border-radius: var(--app-control-radius);
}
.date-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.training-row img {
  display: block;
  max-width: 160px;
  max-height: 120px;
  object-fit: contain;
  margin-top: 8px;
}
.option-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 14px;
  margin-top: 8px;
}
.option-previews img {
  width: 72px;
  height: 72px;
}
.comparison-table {
  overflow-x: auto;
}
.comparison-table table {
  width: 100%;
  border-collapse: collapse;
  min-width: 580px;
}
.comparison-table th,
.comparison-table td {
  padding: 16px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  overflow-wrap: anywhere;
}
.comparison-table th {
  font-weight: 600;
}
.comparison-table p {
  font-weight: 400;
}
@media (max-width: 1000px) {
  .profile-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (max-width: 600px) {
  .date-fields {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
  .workflow-path {
    gap: 12px 16px;
  }
}
</style>
