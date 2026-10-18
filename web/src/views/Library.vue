<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IconSearch,
  IconArrowRight,
  IconArrowLeft,
  IconSettings,
} from '@arco-design/web-vue/es/icon';
import { api, message, query } from '../lib/api';
import { auth, manageQuestions, canPractice } from '../lib/auth';
import { subjects, subjectName, subjectValue, type Topic, type Attempt } from '../lib/types';
import PageState from '../components/PageState.vue';
import GradeCatalog from '../components/GradeCatalog.vue';
import { gradeCardsFor, gradeLabel } from '../lib/catalog';
const route = useRoute(),
  router = useRouter(),
  topics = ref<Topic[]>([]),
  attempts = ref<Attempt[]>([]),
  loading = ref(true),
  error = ref(''),
  search = ref(String(route.query.q || ''));
const detail = computed(() => !!route.query.subject),
  subject = computed(() => String(route.query.subject || 'MATH')),
  grade = computed(() => Number(route.query.grade || 1));
const allGrades = computed(() =>
  Array.from(new Set(topics.value.map((t) => t.grade))).sort((a, b) => a - b),
);
const matching = computed(() =>
  topics.value.filter((t) => subjectValue(t.subject) === subject.value),
);
const grades = computed(() =>
  Array.from(new Set(matching.value.map((t) => t.grade))).sort((a, b) => a - b),
);
const matches = (t: Topic, name = '') =>
  `${t.name} ${name} ${subjectName(t.subject)} ${gradeLabel(t.grade)}`
    .toLowerCase()
    .includes(search.value.trim().toLowerCase());
const cards = computed(() => gradeCardsFor(topics.value, search.value));
const groups = computed(() =>
  matching.value
    .filter((t) => t.grade === grade.value)
    .map((t) => ({ ...t, objectives: t.objectives.filter((o) => matches(t, o.name)) }))
    .filter((t) => t.objectives.length),
);
const skills = computed(() => groups.value.reduce((n, t) => n + t.objectives.length, 0)),
  total = computed(() =>
    groups.value.reduce((n, t) => n + t.objectives.reduce((a, o) => a + o.count, 0), 0),
  );
const practiced = computed(() => new Set(attempts.value.map((a) => a.objectiveId).filter(Boolean)));
const subjectCount = computed(
  () => new Set(cards.value.flatMap((c) => c.subjects.map((s) => s.value))).size,
);
const visibleGrades = computed(() => (detail.value ? grades.value : allGrades.value));
async function load() {
  loading.value = true;
  error.value = '';
  try {
    topics.value = await api('/portal/catalog');
  } catch (e) {
    error.value = message(e);
  } finally {
    loading.value = false;
  }
}
function open(g: number, s: string) {
  router.push({
    path: '/library',
    query: { grade: g, subject: s, ...(search.value.trim() ? { q: search.value.trim() } : {}) },
  });
}
function all() {
  search.value = '';
  router.push('/library');
}
function start(t: Topic, id: string) {
  if (auth.user && !canPractice.value) return;
  const target =
    '/practice?' +
    query({ objectiveId: id, subject: subjectValue(t.subject), grade: t.grade, general: !id });
  router.push(auth.user ? target : { path: '/login', query: { redirect: target } });
}
watch(
  () => route.query.q,
  (q) => (search.value = String(q || '')),
);
onMounted(async () => {
  await load();
  if (auth.user?.role === 'STUDENT')
    try {
      attempts.value = await api('/portal/attempts');
    } catch {
      /*Personal history is optional.*/
    }
});
</script>
<template>
  <section class="catalog-page">
    <div class="container">
      <div class="catalog-page-heading">
        <div>
          <div v-if="detail" class="simple-breadcrumb">
            <button v-if="detail" @click="all">题库</button>
            <span v-else>题库</span>
            <template v-if="detail">
              <span>/</span>
              <span>{{ gradeLabel(grade) }}{{ subjectName(subject) }}</span>
            </template>
          </div>
          <h1>{{ detail ? gradeLabel(grade) + subjectName(subject) : '题库' }}</h1>
        </div>
        <router-link v-if="manageQuestions" to="/manage/questions" class="button outline">
          <IconSettings />
          题库管理
        </router-link>
      </div>
      <div class="catalog-search-row">
        <a-input-search
          v-model="search"
          allow-clear
          :input-attrs="{ 'aria-label': '搜索知识点' }"
          placeholder="搜索知识点、主题或年级"
          size="large"
        />
        <span v-if="!loading && !error">
          {{
            detail
              ? skills + ' 个知识点 · ' + total + ' 道题目'
              : cards.length + ' 个年级 · ' + subjectCount + ' 个学科'
          }}
        </span>
      </div>
      <template v-if="!detail">
        <PageState
          :loading="loading"
          :error="error"
          :empty="!cards.length"
          title="没有找到相关内容"
          description="换个关键词试试，或在题库管理中添加知识点和题目。"
          @retry="load"
        />
        <GradeCatalog v-if="!loading && !error && cards.length" :cards="cards" :search="search" />
      </template>
      <template v-else>
        <div class="catalog-detail-tools">
          <button class="text-link" @click="all">
            <IconArrowLeft />
            全部年级
          </button>
          <div class="catalog-grade-options" aria-label="切换年级">
            <button
              v-for="g in visibleGrades"
              :key="g"
              :class="{ selected: g === grade }"
              :aria-pressed="g === grade"
              @click="open(g, subject)"
            >
              {{ gradeLabel(g) }}
            </button>
          </div>
        </div>
        <nav class="subject-tabs compact-subject-tabs" aria-label="选择学科">
          <button
            v-for="s in subjects"
            :key="s.value"
            :class="{ selected: subject === s.value }"
            :aria-pressed="subject === s.value"
            @click="open(grade, s.value)"
          >
            {{ s.label }}
          </button>
        </nav>
        <a-alert v-if="auth.user && !canPractice" class="mb-24">
          当前账号可浏览题库。学生账号用于作答，老师和管理员可进行课堂预览。
        </a-alert>
        <p v-else-if="manageQuestions" class="catalog-preview-note">课堂预览不写入学生学习记录。</p>
        <PageState
          :loading="loading"
          :error="error"
          :empty="!groups.length"
          title="没有匹配的知识点"
          description="换个学科、年级或关键词试试。"
          @retry="load"
        />
        <div v-if="!loading && !error" class="skill-grid ixl-skill-grid">
          <section v-for="(t, i) in groups" :key="t.id" class="skill-group">
            <h2>
              <span>{{ String.fromCharCode(65 + i) }}</span>
              {{ t.name }}
            </h2>
            <ol>
              <li v-for="(o, j) in t.objectives" :key="o.id || 'general'">
                <button
                  :disabled="!o.count || (!!auth.user && !canPractice)"
                  @click="start(t, o.id)"
                >
                  <span class="skill-number">{{ j + 1 }}.</span>
                  <span class="skill-name">
                    {{ o.name }}
                    <small v-if="practiced.has(o.id)">已练习</small>
                  </span>
                  <span class="skill-count">{{ o.count }} 题</span>
                  <IconArrowRight />
                </button>
              </li>
            </ol>
          </section>
        </div>
      </template>
    </div>
  </section>
</template>
