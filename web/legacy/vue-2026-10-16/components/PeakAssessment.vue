<script setup lang="ts">
import {
  IslandButton,
  IslandCard,
  IslandTag,
  IslandSelect,
  IslandProgress,
  IslandDialog,
} from './island';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { auth, can } from '../stores/auth';
import { request } from '../lib/api';
import { required, messageOf, type RecordData } from '../lib/types';
import { useTask } from '../lib/useData';
import { validateForm } from '../lib/forms';
import { peakAssessmentClient } from '../lib/assessmentPeak';
import { peakCategories, summarizePeak, type PeakItem, type PeakScore } from '../lib/peak';
import PageHeader from '../components/PageHeader.vue';
import Feedback from '../components/Feedback.vue';
import EmptyState from '../components/EmptyState.vue';
import LegacyAssessment from '../components/LegacyAssessment.vue';
import PeakSession from '../components/PeakSession.vue';
defineProps<{ method?: import('../lib/assessments').AssessmentMethodInfo }>();
const route = useRoute();
const client = peakAssessmentClient;
const { loading, error, success, run } = useTask();
const items = ref<RecordData[]>([]),
  students = ref<RecordData[]>([]),
  catalog = ref<PeakItem[]>([]);
const selected = ref<RecordData | null>(null),
  scores = ref<PeakScore[]>([]);
const dialog = ref(false),
  saving = ref(false),
  formError = ref(''),
  completeConfirm = ref(false),
  legacy = ref(false);
const studentId = ref(''),
  module = ref<'D' | 'G'>('D'),
  category = ref('FLS');
const statusFilter = ref('all');
const visibleItems = computed(() =>
  items.value.filter((item) => statusFilter.value === 'all' || item.status === statusFilter.value),
);
const groupSummaries = computed(() =>
  categories.value.map((code) => ({
    code,
    ...summarizePeak(
      moduleItems.value.filter((item) => item.category === code),
      scores.value,
    ),
  })),
);
const moduleName = (value: string) => (value === 'D' ? '直接训练预评估' : '泛化预评估');
const sessionOpen = ref(false),
  sessionCode = ref('');
const editable = computed(() => auth.user?.role === 'ADMIN' || auth.user?.role === 'TEACHER');
const writable = computed(() => editable.value && selected.value?.status === 'ongoing');
const moduleItems = computed(() =>
  catalog.value.filter((i) => i.module === selected.value?.module),
);
const categories = computed(() => peakCategories[(selected.value?.module || 'D') as 'D' | 'G']);
const summary = computed(() => summarizePeak(moduleItems.value, scores.value));
const rows = computed(() =>
  moduleItems.value
    .filter((i) => i.category === category.value)
    .map((i) => ({ ...i, result: scores.value.find((s) => s.code === i.code) })),
);
const studentName = (id: string) =>
  students.value.find((s) => s.id === id)?.name || (auth.user?.id === id ? auth.user.name : id);
async function load() {
  return run(async () => {
    const [list, defs] = await Promise.all([
      client.list(
        editable.value && route?.query.studentId ? String(route.query.studentId) : undefined,
      ),
      client.catalog(),
    ]);
    items.value = list || [];
    catalog.value = defs;
    if (editable.value && can('students')) students.value = (await request('/students')) || [];
  });
}
async function view(item: RecordData) {
  return run(async () => {
    const [list, defs] = await Promise.all([client.scores(item.id), client.catalog(item.version)]);
    catalog.value = defs;
    scores.value = list || [];
    selected.value = item;
    category.value = peakCategories[item.module as 'D' | 'G'][0];
    const first =
      moduleItems.value.find((i) => !scores.value.some((s) => s.code === i.code)) ||
      moduleItems.value[0];
    sessionCode.value = first?.code || '';
    sessionOpen.value = false;
  });
}
async function create(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event))) return;
  saving.value = true;
  formError.value = '';
  try {
    const item = await client.create(studentId.value, module.value);
    dialog.value = false;
    selected.value = null;
    sessionOpen.value = false;
    if (!(await load())) return;
    if (await view(item)) resume();
  } catch (e) {
    formError.value = messageOf(e);
  } finally {
    saving.value = false;
  }
}
function openItem(item: PeakItem) {
  sessionCode.value = item.code;
  sessionOpen.value = true;
}
function onSaved(saved: PeakScore) {
  scores.value = [...scores.value.filter((s) => s.code !== saved.code), saved];
}
function resume() {
  const first =
    moduleItems.value.find((i) => !scores.value.some((s) => s.code === i.code)) ||
    moduleItems.value[0];
  if (first) openItem(first);
}
async function complete() {
  if (!selected.value) return;
  completeConfirm.value = false;
  await run(async () => {
    selected.value = await client.complete(selected.value!.id);
    items.value = items.value.map((i) => (i.id === selected.value!.id ? selected.value! : i));
  }, '评估已完成，记录已设为只读');
}
const retry = () => (selected.value ? view(selected.value) : load());
async function initialize() {
  selected.value = null;
  sessionOpen.value = false;
  studentId.value = editable.value ? String(route?.query.studentId || '') : '';
  if (!(await load())) return;
  if (route?.query.assessmentId) {
    const item = items.value.find((i) => i.id === route.query.assessmentId);
    if (item) await view(item);
    else error.value = '未找到该评估，请返回学生档案刷新后重试';
  } else if (editable.value && route?.query.new === '1') {
    dialog.value = true;
    formError.value = '';
  }
}
watch(() => route?.fullPath, initialize);
onMounted(initialize);
</script>
<template>
  <template v-if="legacy">
    <IslandButton
      class="mb-4"
      variant="outlined"
      prepend-icon="mdi-arrow-left"
      @click="legacy = false"
    >
      返回评估中心
    </IslandButton>
    <LegacyAssessment />
  </template>
  <template v-else>
    <PageHeader>
      <IslandButton
        v-if="editable && can('students') && (selected?.studentId || route?.query.studentId)"
        variant="outlined"
        :to="`/students/${encodeURIComponent(String(selected?.studentId || route.query.studentId))}`"
      >
        学生档案
      </IslandButton>
      <IslandButton
        v-if="selected"
        variant="outlined"
        prepend-icon="mdi-arrow-left"
        :disabled="loading"
        @click="selected = null"
      >
        返回列表
      </IslandButton>
      <template v-else>
        <IslandButton
          v-if="editable"
          color="primary"
          prepend-icon="mdi-plus"
          :disabled="loading"
          @click="
            dialog = true;
            formError = '';
          "
        >
          新建 PEAK 评估
        </IslandButton>
      </template>
    </PageHeader>
    <Feedback :error="error" :loading="loading" @retry="retry" />
    <v-expansion-panels v-if="selected && editable" class="mb-6">
      <v-expansion-panel title="施测与评分说明">
        <v-expansion-panel-text>
          PEAK 预评估 · D / G 各 64
          项。按材料记录正确反应（1）或未通过（0）；未评项目单独保留。汇总为本次反应记录，不作标准分或诊断解释。D
          翻页册未附评分指南，当前沿用二元反应记录方式。
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
    <template v-if="selected">
      <IslandCard class="pa-6 mb-6">
        <div class="d-flex justify-space-between align-center ga-4 flex-wrap">
          <div>
            <div class="eyebrow">PEAK · {{ moduleName(selected.module) }}</div>
            <h2>{{ editable ? studentName(selected.studentId) + '的评估' : '我的评估进展' }}</h2>
            <p class="muted mt-2">
              {{ selected.date }} ·
              {{ selected.status === 'completed' ? '已完成 · 只读' : '评估中' }}
            </p>
          </div>
          <IslandButton
            v-if="editable"
            color="primary"
            size="large"
            prepend-icon="mdi-play-outline"
            @click="resume"
          >
            {{ writable ? '继续施测' : '回看题目' }}
          </IslandButton>
          <IslandButton
            v-if="writable"
            variant="outlined"
            :disabled="summary.recorded !== 64 || loading"
            @click="completeConfirm = true"
          >
            完成评估
          </IslandButton>
        </div>
        <div class="d-flex ga-6 flex-wrap my-4" aria-live="polite">
          <span>
            已评
            <strong>{{ summary.recorded }} / 64</strong>
          </span>
          <span>
            正确
            <strong>{{ summary.correct }}</strong>
          </span>
          <span>
            {{ editable ? '未通过' : '待巩固' }}
            <strong>{{ summary.recorded - summary.correct }}</strong>
          </span>
          <span>
            未评
            <strong>{{ 64 - summary.recorded }}</strong>
          </span>
        </div>
        <IslandProgress
          :model-value="(summary.recorded / 64) * 100"
          color="primary"
          height="8"
          rounded
          aria-label="评估记录进度"
        />
        <p v-if="writable && summary.recorded < 64" class="muted mt-3">
          所有项目均记录后可完成评估；可随时离开，已保存的记录会保留。
        </p>
        <div class="d-flex ga-2 flex-wrap mt-4">
          <IslandButton
            v-if="
              editable &&
              selected.status === 'completed' &&
              can('students') &&
              can('ability_tracking')
            "
            color="primary"
            :to="{
              path: `/students/${encodeURIComponent(selected.studentId)}`,
              query: { assessmentId: selected.id, methodId: 'peak' },
            }"
          >
            从评估发现确认目标
          </IslandButton>
          <IslandButton
            v-if="editable"
            variant="text"
            :href="`/peak/${selected.module}.pdf`"
            target="_blank"
            rel="noopener"
          >
            查看 {{ selected.module }} 原始翻页册
          </IslandButton>
          <IslandButton
            v-if="editable && selected.module === 'G'"
            variant="text"
            href="/peak/response.pdf"
            target="_blank"
            rel="noopener"
          >
            下载 / 打印 G 作答册
          </IslandButton>
        </div>
      </IslandCard>
      <p v-if="!editable" class="muted mb-4">
        由老师带领完成看图、口语或动作任务。下面是本次已记录的表现，未评项目不代表未通过。
      </p>
      <div class="assessment-groups mb-6" aria-label="分组评估进度">
        <IslandCard v-for="(group, index) in groupSummaries" :key="group.code" class="pa-4">
          <div class="d-flex justify-space-between ga-2">
            <h3>{{ editable ? group.code : `任务组 ${index + 1}` }}</h3>
            <span class="muted">{{ group.recorded }} / {{ group.total }}</span>
          </div>
          <IslandProgress
            class="my-3"
            :model-value="group.total ? (group.recorded / group.total) * 100 : 0"
            color="primary"
            height="6"
            :aria-label="`任务组 ${index + 1} 记录进度`"
          />
          <p>
            正确 {{ group.correct }} · {{ editable ? '未通过' : '待巩固' }}
            {{ group.recorded - group.correct }}
          </p>
          <IslandButton
            class="mt-3"
            variant="text"
            color="primary"
            :aria-pressed="category === group.code"
            @click="category = group.code"
          >
            查看本组记录
          </IslandButton>
        </IslandCard>
      </div>
      <IslandCard>
        <v-tabs v-model="category" color="primary" show-arrows aria-label="评估领域">
          <v-tab v-for="cat in categories" :key="cat" :value="cat">
            {{ editable ? cat : `任务组 ${categories.indexOf(cat) + 1}` }} ·
            {{ scores.filter((s) => s.code.startsWith(cat + '-')).length }}/16
          </v-tab>
        </v-tabs>
        <v-list :class="editable ? 'd-sm-none' : 'student-assessment-tasks'" lines="three">
          <v-list-item v-for="item in rows" :key="item.code">
            <v-list-item-title>
              {{ editable ? item.code : `任务 ${item.itemNumber}` }} ·
              {{
                item.result
                  ? item.result.score === 1
                    ? editable
                      ? '1 · 正确'
                      : '正确'
                    : editable
                      ? '0 · 未通过'
                      : '待巩固'
                  : '未评'
              }}
            </v-list-item-title>
            <p v-if="editable" class="my-2">{{ item.title }}</p>
            <IslandButton
              v-if="editable"
              variant="tonal"
              color="primary"
              :disabled="loading"
              @click="openItem(item)"
            >
              {{ writable ? (item.result ? '查看 / 修改' : '开始评估') : '查看详情' }}
            </IslandButton>
          </v-list-item>
        </v-list>
        <v-data-table
          v-if="editable"
          class="d-none d-sm-block"
          :items="rows"
          :items-per-page="16"
          hide-default-footer
          :headers="[
            { title: '项目', key: 'code' },
            ...(editable ? [{ title: '施测提示', key: 'title' }] : []),
            { title: '记录', key: 'result' },
            ...(editable ? [{ title: '操作', key: 'actions', sortable: false }] : []),
          ]"
        >
          <template #item.code="{ item }">
            {{ editable ? item.code : `任务 ${item.itemNumber}` }}
          </template>
          <template #item.result="{ item }">
            <IslandTag
              size="small"
              :color="item.result ? (item.result.score === 1 ? 'success' : 'warning') : undefined"
            >
              {{
                item.result
                  ? item.result.score === 1
                    ? editable
                      ? '1 · 正确'
                      : '正确'
                    : editable
                      ? '0 · 未通过'
                      : '待巩固'
                  : '未评'
              }}
            </IslandTag>
          </template>
          <template #item.actions="{ item }">
            <IslandButton
              v-if="editable"
              variant="text"
              color="primary"
              :disabled="loading"
              @click="openItem(item)"
            >
              {{ writable ? (item.result ? '查看 / 修改' : '开始评估') : '查看详情' }}
            </IslandButton>
          </template>
        </v-data-table>
      </IslandCard>
    </template>
    <div v-else>
      <section class="assessment-welcome" :class="{ 'is-teacher': editable }">
        <div>
          <div class="eyebrow">
            PEAK 预评估 · {{ editable ? '老师带领 · 孩子参与' : '和老师一起 · 看见成长' }}
          </div>
          <h2>{{ editable ? '老师引导，学生参与' : '一起看，一起试，发现每一份小小的成长。' }}</h2>
          <p>
            {{
              editable
                ? '把题目放到孩子面前。老师引导、孩子回应，在互动中记录真实表现。'
                : '评估由老师带领完成。这里会保留你的评估进度和结果，不需要自己开始答题。'
            }}
          </p>
        </div>
        <div class="welcome-materials" aria-label="评估图片示例">
          <div>
            <img src="/peak/G-7.png" alt="图片命名任务示例" />
            <span>看一看 · 说一说</span>
          </div>
          <div>
            <img src="/peak/D-7.png" alt="图片记忆任务示例" />
            <span>找一找 · 想一想</span>
          </div>
        </div>
      </section>
      <div class="record-heading">
        <h2>{{ editable ? '评估记录' : '我的评估记录' }}</h2>
        <span class="muted">
          {{ editable ? '继续上次的探索，或回顾已完成的记录' : '回顾老师为你记录的每一步成长' }}
        </span>
      </div>
      <v-btn-toggle
        v-model="statusFilter"
        mandatory
        color="primary"
        variant="outlined"
        class="assessment-filters mb-4"
        aria-label="筛选评估状态"
      >
        <IslandButton value="all">全部 {{ items.length }}</IslandButton>
        <IslandButton value="ongoing">
          进行中 {{ items.filter((i) => i.status === 'ongoing').length }}
        </IslandButton>
        <IslandButton value="completed">
          已完成 {{ items.filter((i) => i.status === 'completed').length }}
        </IslandButton>
      </v-btn-toggle>
      <div class="assessment-records" v-if="visibleItems.length">
        <IslandCard v-for="item in visibleItems" :key="item.id" class="pa-5">
          <div class="d-flex justify-space-between ga-3 align-center">
            <span class="eyebrow">PEAK · {{ item.module }}</span>
            <IslandTag size="small" :color="item.status === 'completed' ? 'success' : 'secondary'">
              {{ item.status === 'completed' ? '已完成' : '进行中' }}
            </IslandTag>
          </div>
          <h3 class="mt-4">{{ moduleName(item.module) }}</h3>
          <p class="muted mt-2">
            {{ editable ? studentName(item.studentId) + ' · ' : '' }}{{ item.date }}
          </p>
          <p class="mt-3">4 个任务组 · 64 个项目</p>
          <p class="muted mt-2">
            {{
              item.status === 'completed'
                ? '老师已完成记录，可以回顾本次表现。'
                : '已保存的记录会保留，由老师继续完成评估。'
            }}
          </p>
          <IslandButton
            class="mt-4"
            variant="tonal"
            color="primary"
            :disabled="loading"
            @click="view(item)"
          >
            {{ item.status === 'completed' ? '查看结果' : '查看进度' }}
          </IslandButton>
        </IslandCard>
      </div>
      <EmptyState
        v-else-if="!loading && !error"
        :title="items.length ? '没有符合筛选的评估' : '还没有 PEAK 评估记录'"
        :description="
          items.length
            ? '可以切换其他状态查看记录。'
            : editable
              ? '选择学生，建立 D 或 G 预评估，开始图片互动与记录。'
              : '老师为你开展评估后，进度和结果就会显示在这里。'
        "
        icon="mdi-clipboard-pulse-outline"
      />
      <v-expansion-panels class="mt-6">
        <v-expansion-panel title="其他评估与历史档案">
          <v-expansion-panel-text>
            <p class="muted mb-3">
              当前可开展 PEAK D / G 预评估。不同评估方法的记录分别保存、分别查看。
            </p>
            <IslandButton variant="outlined" @click="legacy = true">
              查看 VB-MAPP 历史档案
            </IslandButton>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>
    <IslandDialog v-model="dialog" max-width="480" :persistent="saving">
      <IslandCard title="新建 PEAK 预评估">
        <v-form @submit.prevent="create">
          <v-card-text>
            <v-alert v-if="formError" type="error" class="mb-4">{{ formError }}</v-alert>
            <v-autocomplete
              v-model="studentId"
              label="选择学生"
              :items="students.map((s) => ({ title: s.name || s.username, value: s.id }))"
              :rules="[required]"
              :disabled="saving"
            />
            <IslandSelect
              v-model="module"
              label="评估模块"
              :items="[
                { title: 'PEAK-D · 直接训练预评估', value: 'D' },
                { title: 'PEAK-G · 泛化预评估', value: 'G' },
              ]"
              :disabled="saving"
            />
            <p class="muted">
              每个模块 4 个领域、64 个项目；请准备对应翻页册，G 的书写任务还需作答册和铅笔。
            </p>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <IslandButton :disabled="saving" @click="dialog = false">取消</IslandButton>
            <IslandButton type="submit" color="primary" :loading="saving">创建评估</IslandButton>
          </v-card-actions>
        </v-form>
      </IslandCard>
    </IslandDialog>
    <IslandDialog
      v-if="editable"
      v-model="sessionOpen"
      fullscreen
      persistent
      :max-width="undefined"
      transition="fade-transition"
    >
      <PeakSession
        v-if="sessionOpen && selected"
        :items="moduleItems"
        :scores="scores"
        :assessment-id="selected.id"
        :student-name="studentName(selected.studentId)"
        :writable="writable"
        :start-code="sessionCode"
        :save-response="(score: PeakScore) => client.save(selected!.id, score)"
        @saved="onSaved"
        @close="sessionOpen = false"
      />
    </IslandDialog>
    <IslandDialog v-model="completeConfirm" max-width="440">
      <IslandCard title="完成本次 PEAK 评估？">
        <v-card-text>
          已记录 {{ summary.recorded }} 项，其中
          {{ summary.correct }} 项正确。完成后记录不可修改，请确认施测与评分已核对。
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <IslandButton @click="completeConfirm = false">继续核对</IslandButton>
          <IslandButton color="primary" @click="complete">确认完成</IslandButton>
        </v-card-actions>
      </IslandCard>
    </IslandDialog>
    <v-snackbar :model-value="!!success" @update:model-value="success = ''">
      {{ success }}
    </v-snackbar>
  </template>
</template>
<style scoped>
.assessment-filters {
  max-width: 100%;
  height: auto;
  flex-wrap: wrap;
}
@media (max-width: 600px) {
  .assessment-filters :deep(.v-btn) {
    padding-inline: 10px;
    font-size: 14px;
  }
}
.assessment-records,
.assessment-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.assessment-groups {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
@media (max-width: 1100px) {
  .assessment-groups {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .assessment-records,
  .assessment-groups {
    grid-template-columns: 1fr;
  }
}
.assessment-welcome {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: center;
  padding: 32px;
  margin-bottom: 32px;
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), 0.1);
}
.assessment-welcome h2 {
  font-size: 30px;
  line-height: 1.6;
  margin: 12px 0;
}
.assessment-welcome p {
  font-size: 15px;
  line-height: 1.9;
  margin: 0;
  color: rgb(var(--v-theme-on-surface-variant));
}
.welcome-materials {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.welcome-materials > div {
  text-align: center;
  border-radius: 16px;
  padding: 12px;
  background: rgba(var(--v-theme-primary), 0.05);
}
.welcome-materials img {
  width: 100%;
  height: 160px;
  object-fit: contain;
  background: white;
  border-radius: 12px;
}
.welcome-materials span {
  display: block;
  padding: 14px 0 4px;
  font-size: 14px;
}
.assessment-welcome.is-teacher {
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
  padding: 24px;
  margin-bottom: 24px;
}
.is-teacher h2 {
  font-size: 20px;
  line-height: 1.4;
  margin: 12px 0;
}
.is-teacher p {
  font-size: 16px;
  line-height: 1.6;
}
.is-teacher .welcome-materials img {
  height: 88px;
}
.is-teacher .welcome-materials span {
  font-size: 12px;
  padding: 8px 0 0;
}
.is-teacher .welcome-materials > div {
  padding: 8px;
  border-radius: 12px;
}
.record-heading {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.record-heading h2 {
  font-size: 20px;
}
@media (max-width: 900px) {
  .assessment-welcome,
  .assessment-welcome.is-teacher {
    grid-template-columns: 1fr;
    padding: 24px;
  }
  .assessment-welcome h2 {
    font-size: 25px;
  }
  .assessment-welcome.is-teacher h2 {
    font-size: 20px;
  }
}
</style>
