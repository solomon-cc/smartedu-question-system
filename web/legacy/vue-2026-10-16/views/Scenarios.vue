<script setup lang="ts">
import {
  IslandButton,
  IslandCard,
  IslandSelect,
  IslandProgress,
  IslandDialog,
} from '../components/island';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { auth, can } from '../stores/auth';
import { request, query } from '../lib/api';
import { messageOf, type RecordData } from '../lib/types';
import type { GameScenario, GameSession, GameSummary, GameResult } from '../lib/lifeGames';
import PageHeader from '../components/PageHeader.vue';
import EmptyState from '../components/EmptyState.vue';
import Feedback from '../components/Feedback.vue';
import LifeGamePlayer from '../components/LifeGamePlayer.vue';
import { sceneTone } from '../components/island/palette';
import ScenarioLibrary from '../components/ScenarioLibrary.vue';
const route = useRoute();
const library = ref(false);
const previewOnly = computed(() => auth.user?.role === 'TEACHER' && route.query.mode === 'preview');
const own = computed(() => auth.user?.role === 'STUDENT');
const scenarios = ref<GameScenario[]>([]),
  students = ref<RecordData[]>([]),
  records = ref<GameSummary[]>([]),
  selected = ref<GameScenario | null>(null),
  levelId = ref(''),
  studentId = ref(''),
  player = ref<GameSession | null>(null),
  detail = ref<GameSession | null>(null),
  loading = ref(false),
  busy = ref(false),
  error = ref(''),
  historyError = ref(''),
  historyLoading = ref(false),
  page = ref(1),
  total = ref(0);
const courses = computed(() => scenarios.value.filter((s) => s.game));
const level = computed(() => selected.value?.game?.levels.find((l) => l.id === levelId.value));
let historySequence = 0;
async function history() {
  const sequence = ++historySequence;
  historyLoading.value = true;
  historyError.value = '';
  try {
    const data = await request(
      `/scenario-sessions?${query({ studentId: studentId.value, page: page.value, pageSize: 10 })}`,
    );
    if (sequence === historySequence) {
      records.value = data.list;
      total.value = data.total;
    }
  } catch (e) {
    if (sequence === historySequence) historyError.value = messageOf(e);
  } finally {
    if (sequence === historySequence) historyLoading.value = false;
  }
}
async function load() {
  loading.value = true;
  error.value = '';
  try {
    scenarios.value = await request('/scenarios');
    if (!own.value && !previewOnly.value && can('students'))
      students.value = await request('/students');
    if (!previewOnly.value) await history();
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    loading.value = false;
  }
}
function select(s: GameScenario) {
  selected.value = s;
  levelId.value = s.game!.levels[0].id;
}
async function start(preview = false) {
  if (!selected.value || !level.value) return;
  busy.value = true;
  error.value = '';
  try {
    player.value = preview
      ? (
          await request<GameResult>(`/scenarios/${selected.value.id}/preview`, 'POST', {
            levelId: levelId.value,
            actions: [],
          })
        ).session
      : await request<GameSession>('/scenario-sessions', 'POST', {
          scenarioId: selected.value.id,
          levelId: levelId.value,
          studentId: studentId.value,
        });
    selected.value = null;
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    busy.value = false;
  }
}
async function open(record: GameSummary) {
  busy.value = true;
  error.value = '';
  try {
    const s = await request<GameSession>(`/scenario-sessions/${record.id}`);
    if (s.status === 'ongoing' && (s.actorId === auth.user?.id || auth.user?.role === 'ADMIN'))
      player.value = s;
    else detail.value = s;
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    busy.value = false;
  }
}
async function close() {
  player.value = null;
  try {
    if (!previewOnly.value) await history();
  } catch (e) {
    error.value = messageOf(e);
  }
}
async function filter() {
  page.value = 1;
  try {
    await history();
  } catch (e) {
    error.value = messageOf(e);
  }
}
onMounted(load);
</script>
<template>
  <PageHeader
    :title="
      own
        ? '生活练习'
        : previewOnly
          ? '游戏与练习'
          : auth.user?.role === 'TEACHER'
            ? '生活技能'
            : '生活能力教学'
    "
    :description="
      own
        ? '去小小世界里，把生活里的事情练一练。'
        : previewOnly
          ? '课前试玩互动场景，熟悉拖拽与反馈；试玩不保存学生学习记录。'
          : '准备任务、陪同练习，回看学生每一步的操作与提示。'
    "
  >
    <IslandButton
      v-if="!own"
      variant="outlined"
      prepend-icon="mdi-folder-outline"
      @click="library = true"
    >
      场景与素材库
    </IslandButton>
  </PageHeader>
  <v-alert v-if="error" type="error" class="mb-5" role="alert">
    {{ error }}
    <IslandButton variant="text" @click="load">重新加载</IslandButton>
  </v-alert>
  <IslandProgress v-if="loading" indeterminate color="primary" class="mb-5" />
  <div v-if="courses.length" class="worlds">
    <article
      v-for="course in courses"
      :key="course.id"
      class="world-card"
      :data-island-tone="own ? sceneTone[course.type] || 'teal' : undefined"
    >
      <div class="world-cover" aria-hidden="true">
        <img
          v-if="course.game?.background || course.image"
          :src="course.game?.background || course.image"
          alt=""
          loading="lazy"
          width="1536"
          height="1024"
        />
        <v-icon v-else icon="mdi-image-outline" size="48" />
        <span class="world-format">拖拽互动</span>
      </div>
      <div class="world-text">
        <h2>{{ course.name }}</h2>
        <p class="world-description">{{ course.description }}</p>
        <p v-if="!own && course.game?.goals?.length" class="course-goals">
          {{ course.game.goals.join(' · ') }}
        </p>
        <div class="world-footer">
          <span class="world-task-count">{{ course.game?.levels.length || 0 }} 个练习任务</span>
          <IslandButton
            color="primary"
            variant="tonal"
            :aria-label="`选择${course.name}`"
            append-icon="mdi-arrow-right"
            @click="select(course)"
          >
            {{ own ? '选一个任务' : previewOnly ? '试玩场景' : '准备教学' }}
          </IslandButton>
        </div>
      </div>
    </article>
  </div>
  <EmptyState
    v-else-if="!loading && !error"
    title="生活任务正在准备中"
    description="老师配置任务后，就可以开始练习。"
  />
  <section v-if="!previewOnly" class="life-records">
    <div class="history-heading">
      <div>
        <h2>{{ own ? '我的练习' : '学生练习记录' }}</h2>
        <p class="muted">
          {{
            own
              ? '还没完成的任务，可以接着做。'
              : '记录操作、计算尝试和提示使用，供课堂观察与后续指导参考。'
          }}
        </p>
      </div>
      <IslandSelect
        v-if="!own && students.length"
        v-model="studentId"
        :items="students.map((s) => ({ title: s.name || s.username, value: s.id }))"
        label="筛选学生"
        clearable
        hide-details
        @update:model-value="filter"
      />
    </div>
    <Feedback :error="historyError" :loading="historyLoading" @retry="history" />
    <IslandCard v-if="records.length && !historyError && !historyLoading" class="mt-4">
      <div v-for="record in records" :key="record.id" class="practice-record">
        <div>
          <strong>{{ !own ? record.studentName + ' · ' : '' }}{{ record.scenarioName }}</strong>
          <p>
            {{ record.levelName }} · {{ new Date(record.startedAt).toLocaleString('zh-CN') }} ·
            {{ record.mode === 'guided' ? '老师陪同' : '学生练习' }}
          </p>
        </div>
        <div class="record-progress">
          <span>{{ record.stepsCompleted }} / {{ record.totalSteps }} 步</span>
          <small v-if="!own">提示 {{ record.hints }} 次 · 重试 {{ record.errors }} 次</small>
        </div>
        <IslandButton color="primary" variant="tonal" :disabled="busy" @click="open(record)">
          {{ record.status === 'ongoing' ? '查看 / 继续' : '查看记录' }}
        </IslandButton>
      </div>
    </IslandCard>
    <EmptyState
      v-else-if="!loading && !historyLoading && !historyError && !error"
      :title="own ? '开始你的第一个生活任务' : '还没有练习记录'"
      :description="
        own
          ? '选上面的场景，一步一步试试。'
          : '课堂预览不会生成学生记录；选择学生后开始练习才会保存。'
      "
    />
    <v-pagination
      v-if="total > 10 && !historyLoading && !historyError"
      v-model="page"
      :length="Math.ceil(total / 10)"
      class="mt-4"
      @update:model-value="history"
    />
  </section>
  <IslandDialog v-model="library" max-width="900" scrollable>
    <IslandCard>
      <ScenarioLibrary @changed="load" />
      <v-card-actions>
        <v-spacer />
        <IslandButton @click="library = false">关闭</IslandButton>
      </v-card-actions>
    </IslandCard>
  </IslandDialog>
  <IslandDialog
    :model-value="!!selected"
    max-width="660"
    :persistent="busy"
    @update:model-value="selected = null"
  >
    <IslandCard v-if="selected" class="pa-6">
      <h2>{{ selected.name }}</h2>
      <v-alert v-if="error" type="error" class="mt-4">{{ error }}</v-alert>
      <p class="muted mt-2">{{ selected.description }}</p>
      <IslandSelect
        v-model="levelId"
        :items="selected.game!.levels.map((l) => ({ title: l.name, value: l.id }))"
        label="选择任务"
        class="mt-5"
      />
      <p v-if="level" class="task-goal">{{ level.goal }}</p>
      <template v-if="!own">
        <h3 class="mt-5">课前准备</h3>
        <p class="muted mt-2">先预览玩法，确认学生能够辨认图片。按需要陪同、读题或提供沟通卡。</p>
        <ol class="task-outline">
          <li v-for="s in level?.steps" :key="s.id">{{ s.title }}</li>
        </ol>
        <IslandSelect
          v-if="!previewOnly"
          v-model="studentId"
          :items="students.map((s) => ({ title: s.name || s.username, value: s.id }))"
          label="选择本次练习学生"
          :disabled="!can('students')"
        />
        <p v-if="!previewOnly && !can('students')" class="muted mb-4">
          学生指导需开通学生管理权限；仍可预览玩法。
        </p>
        <IslandButton variant="outlined" :loading="busy" @click="start(true)">
          预览玩法
        </IslandButton>
      </template>
      <div class="d-flex justify-end ga-3 mt-5">
        <IslandButton :disabled="busy" @click="selected = null">返回</IslandButton>
        <IslandButton
          v-if="!previewOnly"
          color="primary"
          :loading="busy"
          :disabled="!level || (!own && !studentId)"
          @click="start()"
        >
          {{ own ? '开始练习' : '开始课堂练习' }}
        </IslandButton>
      </div>
    </IslandCard>
  </IslandDialog>
  <IslandDialog :model-value="!!player" fullscreen persistent>
    <LifeGamePlayer v-if="player" :key="player.id" :initial="player" @close="close" />
  </IslandDialog>
  <IslandDialog
    :model-value="!!detail"
    max-width="780"
    scrollable
    @update:model-value="detail = null"
  >
    <IslandCard v-if="detail">
      <v-card-title>{{ detail.scenarioName }} · 练习回看</v-card-title>
      <v-card-text>
        <p class="mb-4">
          {{ detail.status === 'completed' ? '已完成' : '进行中' }} ·
          {{ detail.state.step }} 个步骤完成
        </p>
        <p v-if="!own" class="muted mb-4">
          提示与重试来自系统操作记录；不等同于专业评估得分。线下支持需结合老师观察。
        </p>
        <div
          v-for="step in detail.definition.levels.find((l) => l.id === detail!.levelId)?.steps"
          :key="step.id"
          class="step-review"
        >
          <h3>{{ step.title }}</h3>
          <p v-if="!detail.events.some((e) => e.stepId === step.id)" class="muted">尚未操作</p>
          <p
            v-for="(event, index) in detail.events.filter(
              (e) => e.stepId === step.id && ['hint', 'answer', 'choice', 'check'].includes(e.kind),
            )"
            :key="index"
          >
            {{
              event.kind === 'hint'
                ? '使用提示'
                : event.advanced
                  ? '步骤完成'
                  : event.correct
                    ? '确认'
                    : '再次尝试'
            }}
            · {{ event.feedback }}
          </p>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <IslandButton @click="detail = null">关闭</IslandButton>
      </v-card-actions>
    </IslandCard>
  </IslandDialog>
</template>
<style scoped>
.worlds {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
  gap: 24px;
}
.world-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
}
.world-cover {
  aspect-ratio: 3 / 2;
  width: 100%;
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: rgb(var(--v-theme-surface-variant));
}
.world-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.world-format {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  font-size: 12px;
  line-height: 1.5;
  padding: 4px 8px;
  border-radius: 8px;
}
.world-text {
  padding: 24px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 12px;
}
.world-text h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.4;
  text-wrap: balance;
}
.world-description {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: rgb(var(--v-theme-on-surface-variant));
}
.course-goals {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgb(var(--v-theme-on-surface-variant));
}
.world-footer {
  margin-top: auto;
  padding-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.world-task-count {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 12px;
}
.life-records {
  margin-top: 40px;
}
.history-heading {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
}
.history-heading h2 {
  font-size: 22px;
  margin-bottom: 8px;
}
.history-heading :deep(.v-select) {
  max-width: 280px;
}
.practice-record {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 20px 24px;
  border-bottom: 1px solid #e7eae2;
}
.practice-record:last-child {
  border-bottom: 0;
}
.practice-record > div:first-child {
  flex: 1;
}
.practice-record p {
  font-size: 12px;
  color: #68796c;
  margin-top: 6px;
}
.record-progress {
  display: grid;
  gap: 4px;
  font-size: 14px;
}
.record-progress small {
  font-size: 12px;
  color: #68796c;
}
.task-goal {
  padding: 16px;
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 8px;
}
.task-outline {
  display: flex;
  list-style: decimal;
  flex-wrap: wrap;
  gap: 8px 32px;
  padding: 20px;
}
.step-review {
  padding: 16px 0;
  border-bottom: 1px solid #e1e7df;
}
.step-review p {
  margin-top: 8px;
  font-size: 14px;
}
@media (max-width: 1100px) {
  .worlds {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .world-text {
    padding: 20px;
  }
}
@media (max-width: 600px) {
  .worlds {
    grid-template-columns: minmax(0, 1fr);
  }
  .world-text {
    padding: 20px;
  }
  .history-heading {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  .history-heading :deep(.v-select) {
    max-width: none;
  }
  .practice-record {
    flex-wrap: wrap;
    padding: 16px;
    gap: 16px;
  }
  .practice-record > div:first-child {
    flex-basis: 100%;
  }
  .record-progress {
    flex: 1;
  }
  .life-records {
    margin-top: 32px;
  }
}
</style>
