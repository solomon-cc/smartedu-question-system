<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, type Directive } from 'vue';
import { useRoute, onBeforeRouteUpdate } from 'vue-router';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheckCircle,
  IconRefresh,
  IconCheck,
  IconClose,
  IconInfoCircle,
} from '@arco-design/web-vue/es/icon';
import { api, query, message, ApiError } from '../lib/api';
import { auth } from '../lib/auth';
import { subjectName, type Question } from '../lib/types';
import { useLeaveGuard } from '../components/useLeaveGuard';
import PracticeReward from '../components/PracticeReward.vue';
import type { PracticeReward as Reward } from '../lib/rewards';
import PageState from '../components/PageState.vue';
const route = useRoute(),
  questions = ref<Question[]>([]),
  loading = ref(true),
  error = ref(''),
  index = ref(0),
  answer = ref(''),
  multi = ref<string[]>([]),
  result = ref<{ correct: boolean; answer: string; hint: string; reward?: Reward | null } | null>(
    null,
  ),
  submitting = ref(false),
  submitError = ref(''),
  finished = ref(false),
  correct = ref(0),
  pendingAnswer = ref<{ requestId: string; answer: string } | null>(null);
let generation = 0;
const current = computed(() => questions.value[index.value]),
  preview = computed(() => !['STUDENT', 'PARENT'].includes(auth.user?.role || ''));
const questionHeading = ref<HTMLElement | null>(null);
// Arco keeps native inputs, but does not assign their shared name.
const nameRadios = (el: HTMLElement) =>
  el.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((input) => {
    input.name = 'practice-choice';
  });
const vRadioName: Directive<HTMLElement> = { mounted: nameRadios, updated: nameRadios };
const returnTo = computed(() =>
  route.query.planId
    ? '/assessment'
    : { path: '/library', query: { subject: route.query.subject, grade: route.query.grade } },
);
const practiceTitle = computed(() =>
  route.query.planId
    ? String(route.query.target || '针对性练习')
    : [
        subjectName(String(route.query.subject || '')),
        route.query.grade ? route.query.grade + ' 年级' : '',
      ]
        .filter(Boolean)
        .join(' · '),
);
const questionType = computed(
  () =>
    ({
      MULTIPLE_CHOICE: '单选题',
      MULTIPLE_SELECT: '多选题',
      TRUE_FALSE: '判断题',
      FILL_BLANK: '填空题',
      CALCULATION: '计算题',
    })[current.value?.type || ''] || '作答',
);
const completed = computed(() =>
  finished.value ? questions.value.length : index.value + (result.value ? 1 : 0),
);
const correctOptions = computed(
  () =>
    result.value?.answer
      .replaceAll('，', ',')
      .split(',')
      .map((v) => v.trim().toLowerCase()) || [],
);
const correctAnswerText = computed(() => {
  if (!result.value || !current.value?.options?.length) return result.value?.answer;
  return (
    current.value.options
      .filter((o) => correctOptions.value.includes(o.value.toLowerCase()))
      .map((o) => o.text || '选项 ' + o.value)
      .join('、') || result.value.answer
  );
});
const stackedOptions = computed(() => current.value?.options?.some((o) => o.text.length > 32));
function chosen(value: string) {
  return current.value?.type === 'MULTIPLE_SELECT'
    ? multi.value.includes(value)
    : answer.value === value;
}
function isCorrectOption(value: string) {
  return !!result.value && correctOptions.value.includes(value.toLowerCase());
}
function optionState(value: string) {
  return {
    'answer-selected': chosen(value),
    'answer-right': isCorrectOption(value),
    'answer-wrong': !!result.value && chosen(value) && !isCorrectOption(value),
  };
}
function focusQuestion() {
  void nextTick(() => {
    questionHeading.value?.focus({ preventScroll: true });
    questionHeading.value?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  });
}
const leaveGuard = useLeaveGuard(
  () => !result.value && (!!answer.value || !!multi.value.length || !!pendingAnswer.value),
  () => submitting.value,
);
async function load() {
  const seq = ++generation;
  loading.value = true;
  error.value = '';
  try {
    const items = await api<Question[]>(
      '/portal/practice?' +
        query({
          planId: route.query.planId,
          subject: route.query.subject,
          grade: route.query.grade,
          objectiveId: route.query.objectiveId,
          general: route.query.general,
        }),
    );
    if (seq === generation) questions.value = items || [];
  } catch (e) {
    if (seq === generation) error.value = message(e);
  } finally {
    if (seq === generation) loading.value = false;
  }
}
async function check() {
  if (!current.value || submitting.value || result.value || finished.value) return;
  const value = current.value.type === 'MULTIPLE_SELECT' ? multi.value.join(',') : answer.value;
  if (!value.trim()) return;
  pendingAnswer.value ||= { requestId: crypto.randomUUID(), answer: value };
  submitting.value = true;
  submitError.value = '';
  try {
    result.value = await api(
      '/portal/practice/' +
        current.value.id +
        (route.query.planId ? '?' + query({ planId: route.query.planId }) : ''),
      'POST',
      pendingAnswer.value,
    );
    if (result.value?.correct) correct.value++;
    pendingAnswer.value = null;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 200 || (e.status >= 400 && e.status < 500)))
      pendingAnswer.value = null;
    submitError.value = message(e);
  } finally {
    submitting.value = false;
  }
}
function next() {
  if (index.value === questions.value.length - 1) {
    finished.value = true;
    return;
  }
  index.value++;
  pendingAnswer.value = null;
  submitError.value = '';
  answer.value = '';
  multi.value = [];
  result.value = null;
  focusQuestion();
}
function restart() {
  pendingAnswer.value = null;
  submitError.value = '';
  index.value = 0;
  correct.value = 0;
  answer.value = '';
  multi.value = [];
  result.value = null;
  finished.value = false;
  focusQuestion();
}
onBeforeRouteUpdate(() => leaveGuard.confirm());
watch(
  () => route.fullPath,
  () => {
    restart();
    void load();
  },
);
onMounted(load);
</script>
<template>
  <section class="container section practice-page">
    <div class="practice-toolbar">
      <router-link :to="returnTo" class="text-link practice-back">
        <IconArrowLeft aria-hidden="true" />
        {{ route.query.planId ? '返回评估中心' : '返回题库' }}
      </router-link>
      <span class="practice-context">{{ practiceTitle }}</span>
      <div v-if="questions.length && !loading && !error" class="practice-progress">
        <span>
          {{ completed }} / {{ questions.length }}
          <span class="muted">已完成</span>
        </span>
        <a-progress
          :percent="completed / questions.length"
          :show-text="false"
          aria-label="本次练习进度"
        />
      </div>
    </div>
    <a-alert v-if="preview" class="preview-note">课堂预览：不保存学生练习记录。</a-alert>
    <a-alert v-if="auth.user?.role === 'PARENT' && route.query.planId" class="preview-note">
      家长陪练：作答记录保存到孩子的学习记录中。
    </a-alert>
    <PageState
      :loading="loading"
      :error="error"
      :empty="!questions.length"
      title="这个知识点暂时没有题目"
      description="返回题库，试试其他知识点。"
      @retry="load"
    />
    <template v-if="!loading && !error && current">
      <div v-if="finished" class="practice-finish">
        <IconCheckCircle aria-hidden="true" />
        <h1>本次练习已完成</h1>
        <p>完成 {{ questions.length }} 道题，答对 {{ correct }} 道。</p>
        <div class="hero-actions">
          <router-link :to="returnTo" class="button primary">
            {{ route.query.planId ? '返回评估中心' : '返回题库' }}
          </router-link>
          <a-button size="large" @click="restart">
            <IconRefresh aria-hidden="true" />
            再练一次
          </a-button>
        </div>
      </div>
      <article v-else class="practice-layout" :aria-labelledby="'practice-question'">
        <div class="question-content">
          <div class="practice-top">
            <span class="question-type">{{ questionType }}</span>
            <span>第 {{ index + 1 }} 题</span>
            <span
              v-if="current.type === 'MULTIPLE_SELECT' && multi.length && !result"
              class="selection-count"
            >
              已选 {{ multi.length }} 项
            </span>
          </div>
          <h1 id="practice-question" ref="questionHeading" tabindex="-1">{{ current.stemText }}</h1>
          <img
            v-if="current.stemImage"
            :src="current.stemImage"
            alt="题目图片"
            class="question-image"
          />
          <a-checkbox-group
            v-if="current.type === 'MULTIPLE_SELECT'"
            v-model="multi"
            :disabled="!!result || submitting || !!pendingAnswer"
            class="answer-options"
            :class="{
              'options-stacked': stackedOptions,
              'answers-locked': !!result || submitting || !!pendingAnswer,
            }"
            aria-labelledby="practice-question"
            role="group"
          >
            <a-checkbox
              v-for="o in current.options"
              :key="o.value"
              :value="o.value"
              :class="optionState(o.value)"
            >
              <span class="answer-code">{{ o.value }}</span>
              <span class="answer-label">
                <img
                  v-if="o.image"
                  :src="o.image"
                  :alt="o.text ? '' : '选项 ' + o.value + ' 图片'"
                />
                <span v-if="o.text">{{ o.text }}</span>
              </span>
              <span v-if="isCorrectOption(o.value)" class="answer-outcome">
                <IconCheck aria-hidden="true" />
                正确答案
              </span>
              <span v-else-if="result && chosen(o.value)" class="answer-outcome">
                <IconClose aria-hidden="true" />
                你的选择
              </span>
              <IconCheck
                v-else-if="chosen(o.value)"
                class="answer-selected-mark"
                aria-hidden="true"
              />
            </a-checkbox>
          </a-checkbox-group>
          <a-radio-group
            v-radio-name
            role="radiogroup"
            v-else-if="current.options?.length"
            v-model="answer"
            :disabled="!!result || submitting || !!pendingAnswer"
            class="answer-options"
            :class="{
              'options-stacked': stackedOptions,
              'answers-locked': !!result || submitting || !!pendingAnswer,
            }"
            aria-labelledby="practice-question"
          >
            <a-radio
              v-for="o in current.options"
              :key="o.value"
              :value="o.value"
              :class="optionState(o.value)"
            >
              <span class="answer-code">{{ o.value }}</span>
              <span class="answer-label">
                <img
                  v-if="o.image"
                  :src="o.image"
                  :alt="o.text ? '' : '选项 ' + o.value + ' 图片'"
                />
                <span v-if="o.text">{{ o.text }}</span>
              </span>
              <span v-if="isCorrectOption(o.value)" class="answer-outcome">
                <IconCheck aria-hidden="true" />
                正确答案
              </span>
              <span v-else-if="result && chosen(o.value)" class="answer-outcome">
                <IconClose aria-hidden="true" />
                你的选择
              </span>
              <IconCheck
                v-else-if="chosen(o.value)"
                class="answer-selected-mark"
                aria-hidden="true"
              />
            </a-radio>
          </a-radio-group>
          <div v-else class="answer-field">
            <label for="practice-answer">你的答案</label>
            <a-input
              v-model="answer"
              :disabled="!!result || submitting || !!pendingAnswer"
              size="large"
              placeholder="输入答案"
              :input-attrs="{ id: 'practice-answer', 'aria-label': '你的答案' }"
              class="answer-input"
              @press-enter="check"
            />
          </div>
        </div>
        <a-alert v-if="submitError" type="error" class="practice-submit-error" role="alert">
          {{ submitError }}
        </a-alert>
        <div
          class="question-actions"
          :class="{ 'has-feedback': result, 'feedback-correct': result?.correct }"
        >
          <div
            v-if="result"
            class="answer-feedback"
            :class="{ correct: result.correct }"
            role="status"
          >
            <IconCheckCircle v-if="result.correct" class="feedback-icon" aria-hidden="true" />
            <IconInfoCircle v-else class="feedback-icon" aria-hidden="true" />
            <div>
              <strong>{{ result.correct ? '回答正确' : '再看一看这道题' }}</strong>
              <p v-if="!result.correct" class="correct-answer">正确答案：{{ correctAnswerText }}</p>
              <p v-if="result.hint" class="answer-explanation">{{ result.hint }}</p>
            </div>
          </div>
          <a-button
            v-if="!result"
            type="primary"
            size="large"
            :loading="submitting"
            :disabled="current.type === 'MULTIPLE_SELECT' ? !multi.length : !answer.trim()"
            @click="check"
          >
            {{ pendingAnswer && !submitting ? '重试提交' : '提交答案' }}
            <IconArrowRight aria-hidden="true" />
          </a-button>
          <a-button v-else type="primary" size="large" @click="next">
            {{ index === questions.length - 1 ? '完成练习' : '下一题' }}
            <IconArrowRight aria-hidden="true" />
          </a-button>
        </div>
        <PracticeReward v-if="result?.reward && !preview" :reward="result.reward" />
      </article>
    </template>
  </section>
</template>
