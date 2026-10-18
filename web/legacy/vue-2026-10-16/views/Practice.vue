<script setup lang="ts">
import {
  IslandButton,
  IslandCard,
  IslandTag,
  IslandInput,
  IslandProgress,
  IslandDialog,
  IslandAvatar,
} from '../components/island';
import IslandChoices from '../components/island/IslandChoices.vue';
import { optionLabel } from '../lib/options';
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import { request, allQuestions } from '../lib/api';
import { auth } from '../stores/auth';
import { answersEqual } from '../lib/practice';
import { messageOf, subjectLabel, type Question, type RecordData } from '../lib/types';
import { useTask } from '../lib/useData';
import PageHeader from '../components/PageHeader.vue';
import Feedback from '../components/Feedback.vue';
import EmptyState from '../components/EmptyState.vue';
import RewardGame from '../components/RewardGame.vue';
import { isImageSource, rewardIcons } from '../lib/rewards';
const route = useRoute(),
  { loading, error, run } = useTask(),
  questions = ref<Question[]>([]),
  queue = ref<Question[]>([]),
  answerHints = ref<Record<string, boolean>>({}),
  answer = ref(''),
  multi = ref<string[]>([]),
  feedback = ref<boolean | null>(null),
  logs = ref<Record<string, RecordData[]>>({}),
  finished = ref(false),
  submitted = ref(false),
  submitting = ref(false),
  rewards = ref<RecordData[]>([]),
  reward = ref<RecordData | null>(null),
  sessionName = ref('自主练习'),
  exitDialog = ref(false);
let pendingLeave: ((allow: boolean) => void) | null = null,
  rewardTimer: ReturnType<typeof setTimeout> | undefined;
const previewOnly = computed(() => auth.user?.role !== 'STUDENT');
const current = computed(() => queue.value[0]),
  done = computed(() => questions.value.length - queue.value.length),
  correct = computed(() => Object.values(logs.value).filter((x) => x.at(-1)?.isCorrect).length),
  attempts = computed(() => (current.value ? logs.value[current.value.id]?.length || 0 : 0));
async function load() {
  await run(async () => {
    let data: Question[] = [];
    if (route.query.homeworkId) {
      const hw = await request(
        `/homeworks/${encodeURIComponent(String(route.query.homeworkId))}/questions`,
      );
      data = hw.questions || [];
      sessionName.value = hw.name;
    } else if (route.query.mode === 'wrongbook') {
      const wrong = await request('/wrong-book');
      answerHints.value = Object.fromEntries(
        (wrong || []).map((w: RecordData) => [w.questionId, !!w.showAnswer]),
      );
      data = (wrong || [])
        .filter((w: RecordData) => w.questionId === route.query.questionId)
        .map((w: RecordData) => w.question);
    } else {
      data = await allQuestions({ subject: route.query.subject, grade: route.query.grade });
      if (route.query.objectiveId)
        data = data.filter((q) => q.objectiveId === route.query.objectiveId);
      if (route.query.questionId) data = data.filter((q) => q.id === route.query.questionId);
      else if (!route.query.objectiveId) data = data.slice(0, 10);
      sessionName.value = `${subjectLabel(String(route.query.subject || ''))}自主练习`;
    }
    questions.value = data;
    queue.value = [...data];
    try {
      rewards.value = ((await request('/reinforcements')) || []).filter(
        (r: RecordData) =>
          r.isActive && (r.isGlobal || r.targetStudentIds?.includes(auth.user?.id)),
      );
    } catch {
      /* Rewards are optional; the practice itself remains available. */
    }
  });
}
function check() {
  if (!current.value || feedback.value !== null) return;
  const value = current.value.type === 'MULTIPLE_SELECT' ? multi.value.join(',') : answer.value;
  if (!value.trim()) return;
  const ok = answersEqual(value, current.value.answer, current.value.type);
  const id = current.value.id;
  (logs.value[id] ||= []).push({ answer: value, isCorrect: ok, timestamp: Date.now() });
  feedback.value = ok;
  if (ok) {
    const answered = Object.values(logs.value).reduce((n, x) => n + x.length, 0);
    const found = rewards.value.find((r) =>
      r.ruleType === 'correct_count'
        ? correct.value % Math.max(1, r.ruleValue) === 0
        : r.ruleType === 'average'
          ? Math.random() < 1 / Math.max(1, r.ruleValue)
          : answered % Math.max(1, r.ruleValue) === 0,
    );
    if (found) {
      reward.value = found;
      if (found.type !== 'game')
        rewardTimer = setTimeout(
          () => (reward.value = null),
          Math.max(1, Math.min(60, found.duration || 3)) * 1000,
        );
    }
  }
}
function next() {
  if (!current.value) return;
  const q = queue.value.shift()!;
  if (feedback.value === false && (logs.value[q.id]?.length || 0) < 3) queue.value.push(q);
  answer.value = '';
  multi.value = [];
  feedback.value = null;
  if (!queue.value.length) finished.value = true;
}
async function submit() {
  if (previewOnly.value || submitting.value || submitted.value) return;
  submitting.value = true;
  error.value = '';
  try {
    const results = questions.value.map((q) => {
      const attemptLog = logs.value[q.id] || [];
      const last = attemptLog.at(-1);
      return {
        id: q.id,
        subject: q.subject,
        stem: q.stemText,
        stemImage: q.stemImage,
        options: q.options,
        answer: q.answer,
        userAnswer: last?.answer || '',
        status: last?.isCorrect ? 'correct' : 'wrong',
        attempts: attemptLog.length,
        attemptLog,
      };
    });
    await request('/history', 'POST', {
      type: route.query.homeworkId ? 'homework' : 'practice',
      name: sessionName.value,
      homeworkId: route.query.homeworkId || '',
      total: String(questions.value.length),
      correctCount: correct.value,
      wrongCount: questions.value.length - correct.value,
      questions: results,
    });
    submitted.value = true;
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    submitting.value = false;
  }
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (!previewOnly.value && Object.keys(logs.value).length && !submitted.value) {
    event.preventDefault();
    event.returnValue = '';
  }
}
onBeforeRouteLeave(() => {
  if (previewOnly.value || !Object.keys(logs.value).length || submitted.value) return true;
  exitDialog.value = true;
  return new Promise<boolean>((resolve) => (pendingLeave = resolve));
});
function leave(allow: boolean) {
  exitDialog.value = false;
  pendingLeave?.(allow);
  pendingLeave = null;
}
onMounted(() => {
  load();
  window.addEventListener('beforeunload', beforeUnload);
});
onBeforeUnmount(() => {
  clearTimeout(rewardTimer);
  window.removeEventListener('beforeunload', beforeUnload);
});
</script>
<template>
  <div class="practice-wrap">
    <PageHeader
      :title="sessionName"
      :description="
        previewOnly
          ? '课堂预览：可体验题目与反馈，预览不会保存为学生学习记录。'
          : '按照自己的节奏来，认真完成每一小步。'
      "
    >
      <IslandButton variant="outlined" to="/skills">
        {{ previewOnly ? '退出预览' : '退出练习' }}
      </IslandButton>
    </PageHeader>
    <Feedback :error="error" :loading="loading" @retry="finished ? submit() : load()" />
    <IslandCard v-if="finished" class="pa-8 text-center">
      <IslandAvatar size="84" color="surface-variant">
        <v-icon icon="mdi-trophy-outline" color="primary" size="46" />
      </IslandAvatar>
      <h2 class="mt-5">{{ previewOnly ? '课堂预览完成' : '练习完成，做得很好！' }}</h2>
      <p class="muted mt-3">共 {{ questions.length }} 道题目，最终答对 {{ correct }} 道。</p>
      <IslandProgress
        :model-value="(correct / Math.max(1, questions.length)) * 100"
        height="10"
        rounded
        color="primary"
        class="my-7"
      />
      <v-alert v-if="submitted" type="success" variant="tonal" class="mb-5">
        学习记录已保存，可以在答题历史中回顾。
      </v-alert>
      <IslandButton
        v-if="!submitted && !previewOnly"
        color="primary"
        size="large"
        :loading="submitting"
        @click="submit"
      >
        保存学习记录
      </IslandButton>
      <IslandButton v-else-if="submitted" to="/history" color="primary" size="large">
        查看答题历史
      </IslandButton>
      <IslandButton v-if="previewOnly" to="/skills" color="primary">返回课堂练习</IslandButton>
    </IslandCard>
    <IslandCard v-else-if="current" class="practice-card">
      <div class="d-flex justify-space-between mb-4">
        <IslandTag color="primary" size="small">
          {{ subjectLabel(current.subject) }} · {{ current.grade }} 年级
        </IslandTag>
        <span class="muted">已完成 {{ done }} / {{ questions.length }}</span>
      </div>
      <IslandProgress
        :model-value="(done / Math.max(1, questions.length)) * 100"
        height="5"
        rounded
        color="primary"
        class="mb-8"
      />
      <div
        class="question-content"
        :class="{ 'student-question-layout': !previewOnly, 'has-picture': !!current.stemImage }"
      >
        <div class="question-board">
          <h2 class="question-stem">{{ current.stemText }}</h2>
          <img
            v-if="current.stemImage"
            :src="current.stemImage"
            alt="题目图片"
            class="content-image d-block mx-auto my-6"
          />
          <v-alert v-if="answerHints[current.id]" type="info" variant="tonal" class="mt-5">
            学习提示：参考答案为 {{ current.answer }}。
          </v-alert>
        </div>
        <div class="answer-board">
          <div class="my-7">
            <IslandChoices
              v-if="!previewOnly && ['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(current.type)"
              :model-value="answer"
              @update:model-value="answer = String($event)"
              :options="
                current.type === 'TRUE_FALSE'
                  ? [
                      { value: 'true', text: '正确' },
                      { value: 'false', text: '错误' },
                    ]
                  : current.options || []
              "
              :disabled="feedback !== null"
            />
            <IslandChoices
              v-else-if="!previewOnly && current.type === 'MULTIPLE_SELECT'"
              :model-value="multi"
              @update:model-value="multi = Array.isArray($event) ? $event : [$event]"
              :options="current.options || []"
              multiple
              :disabled="feedback !== null"
            />
            <v-radio-group
              v-else-if="current.type === 'MULTIPLE_CHOICE'"
              v-model="answer"
              :disabled="feedback !== null"
            >
              <v-radio
                v-for="o in current.options"
                :key="o.value"
                :value="o.value"
                color="primary"
                class="answer-option"
              >
                <template #label>
                  <div>
                    <span>{{ optionLabel(o) }}</span>
                    <img
                      v-if="o.image"
                      :src="o.image"
                      alt="选项图片"
                      class="content-image d-block my-3"
                    />
                  </div>
                </template>
              </v-radio>
            </v-radio-group>
            <div v-else-if="current.type === 'MULTIPLE_SELECT'">
              <v-checkbox
                v-for="o in current.options"
                :key="o.value"
                v-model="multi"
                :value="o.value"
                :disabled="feedback !== null"
                color="primary"
                hide-details
                class="answer-option"
              >
                <template #label>
                  <div>
                    {{ optionLabel(o) }}
                    <img
                      v-if="o.image"
                      :src="o.image"
                      alt="选项图片"
                      class="content-image d-block my-3"
                    />
                  </div>
                </template>
              </v-checkbox>
            </div>
            <v-radio-group
              v-else-if="current.type === 'TRUE_FALSE'"
              v-model="answer"
              :disabled="feedback !== null"
            >
              <v-radio label="正确" value="true" color="primary" class="answer-option" />
              <v-radio label="错误" value="false" color="primary" class="answer-option" />
            </v-radio-group>
            <IslandInput
              v-else
              v-model="answer"
              label="输入你的答案"
              :disabled="feedback !== null"
              @keydown.enter.prevent="check"
            />
          </div>
          <v-alert
            v-if="feedback !== null"
            :type="feedback ? 'success' : 'warning'"
            variant="tonal"
            class="mb-6"
            role="status"
          >
            {{
              feedback
                ? '答对了！继续保持。'
                : attempts < 3
                  ? '这次还差一点，这道题会稍后再练。'
                  : '已经认真尝试过了，看看答案，理解后再出发。'
            }}
            <p v-if="!feedback && attempts >= 2" class="mt-2">
              参考答案：{{ current.answer }}
              <span v-if="current.hint">· {{ current.hint }}</span>
            </p>
          </v-alert>
          <div class="d-flex justify-end practice-actions">
            <IslandButton
              v-if="feedback === null"
              color="primary"
              size="large"
              :disabled="current.type === 'MULTIPLE_SELECT' ? !multi.length : !answer.trim()"
              @click="check"
            >
              确认答案
            </IslandButton>
            <IslandButton
              v-else
              color="primary"
              size="large"
              append-icon="mdi-arrow-right"
              @click="next"
            >
              {{ queue.length === 1 && (feedback || attempts >= 3) ? '完成练习' : '继续' }}
            </IslandButton>
          </div>
        </div>
      </div>
    </IslandCard>
    <IslandCard v-else-if="!loading">
      <EmptyState
        title="这里暂时没有可练习的题目"
        description="换一个学科或年级，或请教师添加对应的题目。"
        icon="mdi-book-open-outline"
      >
        <IslandButton color="primary" to="/skills">重新选择</IslandButton>
      </EmptyState>
    </IslandCard>
  </div>
  <IslandDialog :model-value="!!reward" @update:model-value="reward = null" max-width="430">
    <IslandCard v-if="reward" class="pa-8 text-center">
      <RewardGame v-if="reward.type === 'game'" :game="reward.image || 'breath'" />
      <template v-else>
        <v-icon
          :icon="rewardIcons[reward.image] || 'mdi-star-circle-outline'"
          color="secondary"
          size="64"
        />
        <v-img
          v-if="isImageSource(reward.image)"
          :src="reward.image"
          :alt="reward.name"
          max-height="220"
          class="my-5"
        />
        <h2>{{ reward.prompt || reward.name }}</h2>
      </template>
      <IslandButton color="primary" class="mt-6" @click="reward = null">继续加油</IslandButton>
    </IslandCard>
  </IslandDialog>
  <IslandDialog v-model="exitDialog" persistent max-width="440">
    <IslandCard title="离开本次练习？">
      <v-card-text>尚未保存的练习记录将丢失。完成练习并保存后，可以在答题历史中查看。</v-card-text>
      <v-card-actions>
        <v-spacer />
        <IslandButton @click="leave(false)">继续练习</IslandButton>
        <IslandButton color="error" @click="leave(true)">确认离开</IslandButton>
      </v-card-actions>
    </IslandCard>
  </IslandDialog>
</template>
<style scoped>
.practice-wrap {
  max-width: 900px;
  margin: auto;
}
.practice-card {
  padding: 32px;
}
.question-stem {
  font-size: 24px;
  line-height: 1.7;
  white-space: pre-wrap;
}
.answer-option {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  margin-bottom: 12px;
  padding: 10px;
  min-height: 58px;
}
@media (max-width: 600px) {
  .practice-card {
    padding: 22px;
  }
  .question-stem {
    font-size: 21px;
  }
}
</style>
