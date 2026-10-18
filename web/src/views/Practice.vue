<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheckCircle,
  IconRefresh,
} from '@arco-design/web-vue/es/icon';
import { api, query, message } from '../lib/api';
import { auth } from '../lib/auth';
import { subjectName, type Question } from '../lib/types';
import { useLeaveGuard } from '../components/useLeaveGuard';
import PageState from '../components/PageState.vue';
const route = useRoute(),
  questions = ref<Question[]>([]),
  loading = ref(true),
  error = ref(''),
  index = ref(0),
  answer = ref(''),
  multi = ref<string[]>([]),
  result = ref<{ correct: boolean; answer: string; hint: string } | null>(null),
  submitting = ref(false),
  submitError = ref(''),
  finished = ref(false),
  correct = ref(0);
const current = computed(() => questions.value[index.value]),
  preview = computed(() => !['STUDENT', 'PARENT'].includes(auth.user?.role || ''));
useLeaveGuard(
  () => !result.value && (!!answer.value || !!multi.value.length),
  () => submitting.value,
);
async function load() {
  loading.value = true;
  error.value = '';
  try {
    questions.value = await api(
      '/portal/practice?' +
        query({
          planId: route.query.planId,
          subject: route.query.subject,
          grade: route.query.grade,
          objectiveId: route.query.objectiveId,
          general: route.query.general,
        }),
    );
  } catch (e) {
    error.value = message(e);
  } finally {
    loading.value = false;
  }
}
async function check() {
  if (!current.value || submitting.value) return;
  const value = current.value.type === 'MULTIPLE_SELECT' ? multi.value.join(',') : answer.value;
  if (!value.trim()) return;
  submitting.value = true;
  submitError.value = '';
  try {
    result.value = await api(
      '/portal/practice/' +
        current.value.id +
        (route.query.planId ? '?' + query({ planId: route.query.planId }) : ''),
      'POST',
      { answer: value },
    );
    if (result.value?.correct) correct.value++;
  } catch (e) {
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
  answer.value = '';
  multi.value = [];
  result.value = null;
}
function restart() {
  index.value = 0;
  correct.value = 0;
  answer.value = '';
  multi.value = [];
  result.value = null;
  finished.value = false;
}
onMounted(load);
</script>
<template>
  <section class="container section practice-page">
    <router-link
      :to="
        route.query.planId
          ? '/assessment'
          : { path: '/library', query: { subject: route.query.subject, grade: route.query.grade } }
      "
      class="text-link"
    >
      <IconArrowLeft />
      {{ route.query.planId ? '返回评估中心' : '返回题库' }}
    </router-link>
    <a-alert v-if="preview" class="preview-note">
      课堂预览模式：可体验答题与讲解，不写入学生学习记录。
    </a-alert>
    <a-alert v-if="auth.user?.role === 'PARENT' && route.query.planId" class="preview-note">
      家长陪练：本次作答将记录到所关联孩子的学习记录中。
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
        <IconCheckCircle />
        <span class="eyebrow">A LITTLE PROGRESS</span>
        <h1>又完成了一小步</h1>
        <p>完成 {{ questions.length }} 道题，答对 {{ correct }} 道。</p>
        <p class="muted">
          {{ preview ? '本次为课堂预览。' : '你的练习记录已保存，保持自己的节奏就很好。' }}
        </p>
        <div class="hero-actions">
          <router-link to="/library" class="button primary">探索其他知识点</router-link>
          <a-button size="large" @click="restart">
            <IconRefresh />
            再练一次
          </a-button>
        </div>
      </div>
      <div v-else class="practice-layout">
        <div class="practice-top">
          <span>
            {{
              route.query.planId
                ? String(route.query.target || '针对性练习')
                : subjectName(String(route.query.subject || '')) +
                  ' · ' +
                  route.query.grade +
                  ' 年级'
            }}
          </span>
          <span>第 {{ index + 1 }} / {{ questions.length }} 题</span>
        </div>
        <a-progress :percent="index / questions.length" :show-text="false" />
        <div class="question-content">
          <span class="caps-label">专注眼前这一题</span>
          <h1>{{ current.stemText }}</h1>
          <img
            v-if="current.stemImage"
            :src="current.stemImage"
            alt="题目图片"
            class="question-image"
          />
          <a-checkbox-group
            v-if="current.type === 'MULTIPLE_SELECT'"
            v-model="multi"
            :disabled="!!result"
            class="answer-options"
          >
            <a-checkbox v-for="o in current.options" :key="o.value" :value="o.value">
              <span class="answer-code">{{ o.value }}</span>
              <img v-if="o.image" :src="o.image" :alt="o.text || '选项 ' + o.value" />
              {{ o.text }}
            </a-checkbox>
          </a-checkbox-group>
          <a-radio-group
            v-else-if="current.options?.length"
            v-model="answer"
            :disabled="!!result"
            class="answer-options"
          >
            <a-radio v-for="o in current.options" :key="o.value" :value="o.value">
              <span class="answer-code">{{ o.value }}</span>
              <img v-if="o.image" :src="o.image" :alt="o.text || '选项 ' + o.value" />
              {{ o.text }}
            </a-radio>
          </a-radio-group>
          <a-input
            v-else
            v-model="answer"
            :disabled="!!result"
            size="large"
            placeholder="输入你的答案"
            :input-attrs="{ 'aria-label': '你的答案' }"
            class="answer-input"
            @press-enter="check"
          />
          <a-alert v-if="submitError" type="error">{{ submitError }}</a-alert>
          <div
            v-if="result"
            class="answer-feedback"
            :class="{ correct: result.correct }"
            role="status"
          >
            <strong>{{ result.correct ? '答对了，继续保持！' : '一起看看，再理解一下' }}</strong>
            <p v-if="!result.correct">参考答案：{{ result.answer }}</p>
            <p v-if="result.hint">{{ result.hint }}</p>
            <small>{{ preview ? '课堂预览，不保存记录' : '本题结果已保存' }}</small>
          </div>
          <div class="question-actions">
            <span class="muted">不着急，想清楚再回答。</span>
            <a-button
              v-if="!result"
              type="primary"
              size="large"
              :loading="submitting"
              :disabled="current.type === 'MULTIPLE_SELECT' ? !multi.length : !answer.trim()"
              @click="check"
            >
              提交答案
              <IconArrowRight />
            </a-button>
            <a-button v-else type="primary" size="large" @click="next">
              {{ index === questions.length - 1 ? '查看本次练习' : '下一题' }}
              <IconArrowRight />
            </a-button>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
