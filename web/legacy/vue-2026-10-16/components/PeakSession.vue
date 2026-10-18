<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { request } from '../lib/api';
import { messageOf } from '../lib/types';
import type { PeakItem, PeakScore } from '../lib/peak';
import presentation from '../lib/peakPresentation.json';
const props = defineProps<{
  items: PeakItem[];
  scores: PeakScore[];
  assessmentId: string;
  studentName: string;
  writable: boolean;
  startCode?: string;
  saveResponse?: (score: PeakScore) => Promise<PeakScore>;
}>();
const emit = defineEmits<{ close: []; saved: [score: PeakScore] }>();
const index = ref(
  Math.max(
    0,
    props.items.findIndex((i) => i.code === props.startCode),
  ),
);
const item = computed(() => props.items[index.value]!);
const page = ref(0),
  teacher = ref(true),
  paused = ref(false),
  saving = ref(false),
  error = ref(''),
  savedMessage = ref('');
const answerOpen = ref(false),
  notesOpen = ref(false),
  navigation = ref(false),
  confirmDiscard = ref(false);
const form = ref({ score: null as number | null, response: '', notes: '' });
const initial = ref('');
const dirty = computed(() => JSON.stringify(form.value) !== initial.value);
let pending: (() => void) | undefined;
let cancelPending: (() => void) | undefined;
const meta = computed(
  () =>
    (presentation as Record<string, { steps: { instruction: string; visual: boolean }[] }>)[
      `${item.value.module}-${item.value.code}`
    ],
);
const step = computed(() => meta.value?.steps[page.value]);
const hasVisual = computed(() => !!item.value.responsePage || step.value?.visual);
const imageUrl = computed(() =>
  item.value.responsePage
    ? `/peak/response-${item.value.responsePage}.png`
    : `/peak/${item.value.module}-${item.value.stimulusPages[page.value]}.png`,
);
const instruction = computed(() => step.value?.instruction || '请打开原文核对本项施测指令。');
const chineseInstruction = computed(() => {
  const text = instruction.value;
  const start = text.search(/【|[\u4e00-\u9fff]/);
  return start >= 0
    ? text.slice(start).replace(/([^。！？：】\n])\n(?=[\u4e00-\u9fff])/g, '$1')
    : text;
});
const completed = computed(() => new Set(props.scores.map((s) => s.code)).size);
const categories = computed(() => [...new Set(props.items.map((i) => i.category))]);
const shownCategory = ref(item.value.category);
const remaining = ref(0),
  timerRunning = ref(false),
  timerFinished = ref(false);
const imageLoading = ref(true),
  imageError = ref(false),
  imageAttempt = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;
const duration = computed(() => {
  const match =
    instruction.value.match(/(?:pause for|wait|after|for)\s*(\d+)\s*seconds/i) ||
    instruction.value.match(/(?:等待】?|呈现图片)\s*(\d+)\s*(?:秒|s)/);
  if (match) return Number(match[1]);
  return /Wait ten seconds/i.test(instruction.value) ? 10 : 0;
});
function stopTimer() {
  if (timer) clearInterval(timer);
  timer = undefined;
  timerRunning.value = false;
}
function startTimer() {
  stopTimer();
  remaining.value = duration.value;
  timerFinished.value = false;
  timerRunning.value = true;
  timer = setInterval(() => {
    remaining.value--;
    if (remaining.value <= 0) {
      stopTimer();
      timerFinished.value = true;
    }
  }, 1000);
}
function reset() {
  page.value = 0;
  paused.value = false;
  answerOpen.value = false;
  notesOpen.value = false;
  error.value = '';
  stopTimer();
  remaining.value = 0;
  timerFinished.value = false;
  const saved = props.scores.find((s) => s.code === item.value.code);
  form.value = {
    score: saved?.score ?? null,
    response: saved?.response || '',
    notes: saved?.notes || '',
  };
  initial.value = JSON.stringify(form.value);
  shownCategory.value = item.value.category;
}
watch(index, reset);
reset();
watch(page, () => {
  stopTimer();
  remaining.value = 0;
  timerFinished.value = false;
});
watch([imageUrl, hasVisual], () => {
  imageLoading.value = true;
  imageError.value = false;
});
watch(paused, (value) => {
  if (value) {
    stopTimer();
    remaining.value = 0;
    timerFinished.value = false;
  }
});
function leave(action: () => void) {
  if (saving.value) return;
  if (dirty.value) {
    pending = action;
    confirmDiscard.value = true;
  } else action();
}
function discard() {
  confirmDiscard.value = false;
  pending?.();
  pending = undefined;
  cancelPending = undefined;
}
function go(target: number) {
  if (target < 0 || target >= props.items.length) return;
  if (target === index.value) {
    navigation.value = false;
    return;
  }
  leave(() => {
    index.value = target;
    navigation.value = false;
  });
}
async function save(next: boolean) {
  if (!props.writable || saving.value) return;
  if (form.value.score === null) {
    error.value = '请先记录本题表现，再保存。';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    const payload = {
      code: item.value.code,
      score: form.value.score!,
      response: form.value.response,
      notes: form.value.notes,
    };
    const saved = props.saveResponse
      ? await props.saveResponse(payload)
      : await request<PeakScore>(`/assessments/peak/${props.assessmentId}/scores`, 'POST', payload);
    emit('saved', saved);
    initial.value = JSON.stringify(form.value);
    savedMessage.value = `${item.value.code} 已保存`;
    if (next) {
      const recorded = new Set([...props.scores.map((score) => score.code), saved.code]);
      const order = [...props.items.keys()]
        .slice(index.value + 1)
        .concat([...props.items.keys()].slice(0, index.value));
      const unassessed = order.find((position) => !recorded.has(props.items[position]!.code));
      if (unassessed !== undefined) index.value = unassessed;
    }
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    saving.value = false;
  }
}
function guardNavigation() {
  if (saving.value) return false;
  if (!dirty.value) return true;
  return new Promise<boolean>((resolve) => {
    pending = () => resolve(true);
    cancelPending = () => resolve(false);
    confirmDiscard.value = true;
  });
}
onBeforeRouteLeave(guardNavigation);
onBeforeRouteUpdate(guardNavigation);
function beforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value) {
    e.preventDefault();
    e.returnValue = '';
  }
}
window.addEventListener('beforeunload', beforeUnload);
onBeforeUnmount(() => {
  stopTimer();
  window.removeEventListener('beforeunload', beforeUnload);
});
</script>
<template>
  <div class="session-shell" :class="{ 'child-focus': !teacher }">
    <header class="session-header">
      <div class="session-brand">
        <v-icon icon="mdi-sprout-outline" size="28" />
        <div>
          <strong>一起探索</strong>
          <span>PEAK · {{ item.module }} · {{ studentName }}</span>
        </div>
      </div>
      <div class="session-tools">
        <v-btn
          variant="text"
          :disabled="saving"
          prepend-icon="mdi-view-grid-outline"
          @click="navigation = true"
        >
          题目导航
        </v-btn>
        <v-btn
          variant="tonal"
          prepend-icon="mdi-account-school-outline"
          @click="teacher = !teacher"
        >
          {{ teacher ? '只看题目' : '教师操作' }}
        </v-btn>
        <v-btn variant="text" :disabled="saving" @click="leave(() => emit('close'))">
          退出施测
        </v-btn>
      </div>
    </header>
    <main class="session-layout">
      <section class="learner-stage" aria-label="学生题目区">
        <div class="stage-heading">
          <span class="stage-label">
            {{
              item.responsePage
                ? '动手画一画 · 写一写'
                : hasVisual
                  ? '仔细看一看'
                  : '跟老师一起做一做'
            }}
          </span>
          <span class="stage-number">
            {{ String(index + 1).padStart(2, '0') }}
            <span>/ {{ items.length }}</span>
          </span>
        </div>
        <div class="stimulus-board" :class="{ 'paper-board': !!item.responsePage }">
          <div v-if="paused" class="activity-placeholder">
            <v-icon icon="mdi-weather-night" size="64" />
            <h1>休息一下</h1>
            <p>准备好了，我们再继续。</p>
          </div>
          <div v-else-if="hasVisual" class="image-container">
            <div v-if="imageError" class="image-status" role="alert">
              <v-icon icon="mdi-image-off-outline" size="40" />
              <p>图片暂时没有加载出来</p>
              <v-btn
                variant="tonal"
                @click="
                  imageAttempt++;
                  imageError = false;
                  imageLoading = true;
                "
              >
                重新加载
              </v-btn>
            </div>
            <template v-else>
              <div v-if="imageLoading" class="image-status" role="status">
                <v-progress-circular indeterminate color="primary" aria-label="加载题目图片" />
                <span>图片准备中…</span>
              </div>
              <img
                :key="`${imageUrl}-${imageAttempt}`"
                :src="imageUrl"
                :alt="`${item.code} 第 ${page + 1} 页题目材料`"
                class="stimulus-image"
                @load="imageLoading = false"
                @error="
                  imageError = true;
                  imageLoading = false;
                "
              />
            </template>
          </div>
          <div v-else class="activity-placeholder">
            <span class="activity-icon"><v-icon icon="mdi-hand-wave-outline" size="64" /></span>
            <h1>轮到你啦</h1>
            <p>
              听一听老师说什么，
              <br />
              我们一起试一试。
            </p>
          </div>
        </div>
        <footer class="stage-footer">
          <span>
            <v-icon icon="mdi-ear-hearing" size="20" />
            听老师说，再开始
          </span>
          <div v-if="item.stimulusPages.length > 1 && !paused" class="page-controls">
            <v-btn
              aria-label="上一张材料"
              icon="mdi-chevron-left"
              variant="text"
              :disabled="page === 0"
              @click="page--"
            />
            <span>材料 {{ page + 1 }} / {{ item.stimulusPages.length }}</span>
            <v-btn
              aria-label="下一张材料"
              icon="mdi-chevron-right"
              variant="tonal"
              :disabled="page === item.stimulusPages.length - 1"
              @click="page++"
            />
          </div>
          <v-btn
            variant="text"
            :prepend-icon="paused ? 'mdi-play-outline' : 'mdi-pause'"
            @click="paused = !paused"
          >
            {{ paused ? '继续' : '休息一下' }}
          </v-btn>
        </footer>
      </section>
      <aside v-if="teacher" class="teacher-panel" aria-label="教师操作区">
        <div class="teacher-heading">
          <span class="eyebrow">教师操作区</span>
          <span>{{ completed }} / {{ items.length }} 已记录</span>
        </div>
        <div>
          <div class="item-code">
            {{ item.code }}
            <v-chip v-if="!writable" size="x-small">只读</v-chip>
            <v-chip v-else-if="dirty" size="x-small">未保存</v-chip>
          </div>
          <h2>{{ item.responsePage ? '纸笔任务' : hasVisual ? '看图互动' : '动作与口语互动' }}</h2>
        </div>
        <v-progress-linear
          :model-value="(completed / items.length) * 100"
          color="primary"
          rounded
          height="4"
          aria-label="记录进度"
        />
        <div class="teacher-instruction">
          <div class="instruction-label">
            <v-icon icon="mdi-message-text-outline" size="18" />
            这样引导
          </div>
          <p>{{ chineseInstruction }}</p>
          <p v-if="item.responsePage" class="paper-hint">
            请准备纸质作答册和铅笔，孩子在纸上完成。
          </p>
        </div>
        <div v-if="duration" class="timer-row">
          <span>本步骤等待 {{ duration }} 秒</span>
          <v-btn size="small" variant="tonal" :disabled="timerRunning" @click="startTimer">
            {{ timerRunning ? `${remaining} 秒` : '开始计时' }}
          </v-btn>
          <span v-if="timerFinished" role="status">计时结束</span>
        </div>
        <details
          @toggle="answerOpen = ($event.target as HTMLDetailsElement).open"
          :open="answerOpen"
        >
          <summary>
            施测说明与参考答案
            <v-icon icon="mdi-chevron-down" size="18" />
          </summary>
          <v-alert v-if="item.note" type="warning" variant="tonal" class="my-3">
            {{ item.note }}
          </v-alert>
          <p class="mt-3">
            <strong>{{ item.title }}</strong>
          </p>
          <p class="reference-text">{{ item.script }}</p>
          <a
            :href="`/peak/${item.module}.pdf#page=${item.scriptPages[0]}`"
            target="_blank"
            rel="noopener"
          >
            打开原始翻页册
          </a>
          <a
            v-if="item.responsePage"
            class="d-block mt-2"
            :href="`/peak/response.pdf#page=${item.responsePage}`"
            target="_blank"
            rel="noopener"
          >
            打印本题作答册
          </a>
        </details>
        <div class="record-block">
          <div class="instruction-label">记录本题表现</div>
          <div class="score-options" role="group" aria-label="本题评分">
            <v-btn
              :variant="form.score === 1 ? 'flat' : 'outlined'"
              :color="form.score === 1 ? 'primary' : undefined"
              :aria-pressed="form.score === 1"
              :disabled="!writable || saving"
              @click="form.score = 1"
            >
              1 · 正确
            </v-btn>
            <v-btn
              :variant="form.score === 0 ? 'flat' : 'outlined'"
              :color="form.score === 0 ? 'primary' : undefined"
              :aria-pressed="form.score === 0"
              :disabled="!writable || saving"
              @click="form.score = 0"
            >
              0 · 未通过
            </v-btn>
          </div>
        </div>
        <details :open="notesOpen" @toggle="notesOpen = ($event.target as HTMLDetailsElement).open">
          <summary>
            实际反应与备注
            <v-icon icon="mdi-pencil-outline" size="18" />
          </summary>
          <v-textarea
            v-model="form.response"
            class="mt-3"
            label="孩子的实际反应"
            rows="2"
            :readonly="!writable"
            :disabled="saving"
            maxlength="2000"
            hide-details
          />
          <v-textarea
            v-model="form.notes"
            class="mt-3"
            label="施测备注"
            rows="2"
            :readonly="!writable"
            :disabled="saving"
            maxlength="2000"
            hide-details
          />
        </details>
        <v-alert v-if="error" type="error" variant="tonal">{{ error }}</v-alert>
        <v-alert v-if="writable && completed === items.length" type="success" variant="tonal">
          <strong>全部项目已记录</strong>
          <p>请返回汇总核对评分，再确认完成本次评估。</p>
          <v-btn
            class="mt-3"
            variant="outlined"
            :disabled="saving"
            @click="leave(() => emit('close'))"
          >
            返回汇总并核对
          </v-btn>
        </v-alert>
        <div class="teacher-save">
          <v-btn
            v-if="writable"
            block
            color="primary"
            size="large"
            :loading="saving"
            @click="save(true)"
          >
            {{ index === items.length - 1 ? '保存本题' : '保存并下一题' }}
            <v-icon icon="mdi-arrow-right" end />
          </v-btn>
          <v-btn
            v-if="writable"
            block
            variant="text"
            :disabled="saving || form.score === null"
            @click="save(false)"
          >
            仅保存
          </v-btn>
          <div class="question-controls">
            <v-btn variant="text" :disabled="saving || index === 0" @click="go(index - 1)">
              上一题
            </v-btn>
            <v-btn
              variant="text"
              :disabled="saving || index === items.length - 1"
              @click="go(index + 1)"
            >
              {{ writable && form.score === null ? '暂跳此题' : '下一题' }}
            </v-btn>
          </div>
          <p class="save-message" role="status">
            {{ savedMessage || '由老师观察并确认，孩子无需操作评分。' }}
          </p>
        </div>
      </aside>
    </main>
    <v-dialog v-model="navigation" max-width="620">
      <v-card title="选择一道题">
        <v-card-text>
          <v-tabs v-model="shownCategory" show-arrows>
            <v-tab v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</v-tab>
          </v-tabs>
          <p class="muted my-4">带勾表示已有记录；暂跳的题目仍保留为未评。</p>
          <div class="item-grid">
            <v-btn
              v-for="entry in items.filter((i) => i.category === shownCategory)"
              :key="entry.code"
              :variant="entry.code === item.code ? 'flat' : 'outlined'"
              color="primary"
              :prepend-icon="scores.some((s) => s.code === entry.code) ? 'mdi-check' : undefined"
              :aria-label="`${entry.code} ${entry.title}`"
              @click="go(items.indexOf(entry))"
            >
              {{ entry.code }}
            </v-btn>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="navigation = false">继续当前题</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="confirmDiscard" max-width="420" persistent>
      <v-card title="本题还有未保存的修改">
        <v-card-text>返回保存可保留刚才的评分和备注；放弃修改会恢复此前记录。</v-card-text>
        <v-card-actions>
          <v-btn
            @click="
              confirmDiscard = false;
              cancelPending?.();
              cancelPending = undefined;
              pending = undefined;
            "
          >
            返回保存
          </v-btn>
          <v-btn color="primary" @click="discard">放弃修改并继续</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>
<style scoped>
.session-shell {
  height: 100dvh;
  min-height: 100dvh;
  overflow-y: auto;
  background: rgb(var(--v-theme-background));
  color: rgb(var(--v-theme-on-surface));
}
.session-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 28px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
.session-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  color: rgb(var(--v-theme-primary));
}
.session-brand strong {
  display: block;
  font-size: 22px;
  letter-spacing: 2px;
}
.session-brand span {
  display: block;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  margin-top: 3px;
}
.session-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.session-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 24px;
  padding: 24px;
  max-width: 1680px;
  margin: auto;
  align-items: start;
}
.learner-stage {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), 0.1);
  border-radius: 24px;
  overflow: hidden;
}
.stage-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  background: rgba(var(--v-theme-primary), 0.06);
}
.stage-label {
  font-size: 22px;
  font-weight: 600;
}
.stage-number {
  font-size: 28px;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.stage-number span {
  font-size: 14px;
  font-weight: 400;
}
.stimulus-board {
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 380px;
  height: calc(100dvh - 275px);
}
.image-container {
  position: relative;
  width: 100%;
  height: 100%;
}
.image-status {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
.stimulus-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.paper-board {
  height: max(520px, calc(100dvh - 275px));
}
.stage-footer {
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.stage-footer > span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--v-theme-primary));
}
.page-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.activity-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-surface));
  gap: 20px;
  padding: 32px;
}
.activity-icon {
  padding: 24px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.1);
}
.activity-placeholder h1 {
  font-size: 36px;
  letter-spacing: 3px;
}
.activity-placeholder p {
  font-size: 21px;
  line-height: 1.9;
}
.teacher-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  border: 1px solid rgba(var(--v-border-color), 0.1);
  background: rgb(var(--v-theme-surface));
  border-radius: 20px;
}
.teacher-heading {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}
.teacher-heading .eyebrow {
  margin: 0;
}
.item-code {
  color: rgb(var(--v-theme-primary));
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}
.teacher-panel h2 {
  font-size: 20px;
  line-height: 1.5;
}
.teacher-instruction {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 14px;
}
.instruction-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
}
.teacher-instruction p {
  white-space: pre-wrap;
  font-size: 16px;
  line-height: 1.8;
}
.teacher-instruction .paper-hint {
  font-size: 13px;
  margin-top: 12px;
  color: rgb(var(--v-theme-secondary));
}
.teacher-panel details {
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
  padding-top: 12px;
}
.teacher-panel summary {
  min-height: 32px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.reference-text {
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.7;
  margin: 12px 0;
}
.score-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.score-options .v-btn {
  min-height: 48px;
}
.question-controls {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.save-message {
  font-size: 12px;
  line-height: 1.6;
  margin-top: 10px;
  color: rgb(var(--v-theme-primary));
}
.timer-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
}
.item-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.item-grid .v-btn {
  min-height: 48px;
}
.child-focus .session-layout {
  grid-template-columns: 1fr;
  max-width: 1400px;
}
.child-focus .stimulus-board {
  height: calc(100dvh - 265px);
}
@media (max-width: 960px) {
  .session-layout {
    grid-template-columns: minmax(0, 1fr) 290px;
    padding: 16px;
    gap: 16px;
  }
  .teacher-panel {
    padding: 18px;
  }
  .session-header {
    padding: 12px 16px;
  }
  .stage-heading {
    padding: 18px;
  }
  .stage-label {
    font-size: 18px;
  }
}
@media (max-width: 700px) {
  .session-header {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .session-tools {
    width: 100%;
    gap: 4px;
  }
  .session-tools .v-btn {
    flex: 1;
    font-size: 12px;
    min-height: 44px;
  }
  .session-layout {
    grid-template-columns: 1fr;
    padding: 12px;
  }
  .stimulus-board,
  .child-focus .stimulus-board {
    min-height: 260px;
    height: 48dvh;
  }
  .paper-board {
    height: 65dvh;
  }
  .stage-heading {
    padding: 14px 18px;
  }
  .stage-footer {
    padding: 10px 16px;
    font-size: 13px;
  }
  .item-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .activity-placeholder h1 {
    font-size: 28px;
  }
  .activity-placeholder p {
    font-size: 18px;
  }
  .activity-icon {
    padding: 16px;
  }
  .teacher-panel {
    gap: 16px;
  }
}
</style>
