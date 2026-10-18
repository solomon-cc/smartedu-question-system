<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IconArrowRight } from '@arco-design/web-vue/es/icon';
import { auth } from '../lib/auth';
import { api, message } from '../lib/api';
import { flushProgress, pendingProgress } from '../lib/progress';
import type { Course, Attempt } from '../lib/types';
import PageState from '../components/PageState.vue';
const userID = auth.user?.id || '';
const courses = ref<Course[]>([]),
  attempts = ref<Attempt[]>([]),
  loading = ref(true),
  error = ref(''),
  syncNote = ref('');
const correct = computed(() => attempts.value.filter((a) => a.correct).length);
async function load() {
  loading.value = true;
  error.value = '';
  try {
    if (Object.keys(pendingProgress(userID)).length) {
      try {
        await flushProgress(userID);
      } catch {
        syncNote.value = '本机还有待同步的课程进度，进入课程后将自动重试。';
      }
    }
    const d = await api<{ courses: Course[] }>('/portal/progress');
    courses.value = d.courses;
    attempts.value = await api('/portal/attempts');
  } catch (e) {
    error.value = message(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section v-if="auth.user" class="container section learning-page">
    <div class="page-heading">
      <div>
        <h1>我的学习</h1>
      </div>
      <router-link v-if="auth.user.role === 'STUDENT'" to="/library" class="button primary">
        去练习
        <IconArrowRight />
      </router-link>
    </div>
    <a-alert v-if="syncNote" class="mb-24">{{ syncNote }}</a-alert>
    <PageState :loading="loading" :error="error" @retry="load" />
    <template v-if="!loading && !error">
      <div class="section-heading compact">
        <h2>
          培训课程
          <span v-if="courses.length" class="inline-count">{{ courses.length }}</span>
        </h2>
        <router-link to="/training" class="text-link">
          发现更多课程
          <IconArrowRight />
        </router-link>
      </div>
      <PageState :empty="!courses.length" title="暂无课程" />
      <div class="my-course-list">
        <router-link v-for="c in courses" :key="c.id" :to="'/training/' + c.id">
          <div class="course-mini-cover" :class="c.audience">
            {{ c.audience === 'parent' ? '家长' : '老师' }}
          </div>
          <div class="grow">
            <small>
              {{ c.audience === 'parent' ? '家长培训' : '老师培训' }} ·
              {{ c.instructor || '平台培训师' }}
            </small>
            <h3>{{ c.title }}</h3>
            <p>{{ c.summary }}</p>
          </div>
          <span class="button outline">
            继续学习
            <IconArrowRight />
          </span>
        </router-link>
      </div>
      <template v-if="auth.user?.role === 'STUDENT' && attempts.length">
        <div class="section-heading compact">
          <h2>最近练习</h2>
          <span class="muted">{{ attempts.length }} 次练习 · {{ correct }} 次答对</span>
        </div>
        <div class="attempt-list">
          <article v-for="a in attempts.slice(0, 12)" :key="a.id">
            <span :class="a.correct ? 'success-text' : 'error-text'">
              {{ a.correct ? '答对了' : '再巩固一下' }}
            </span>
            <span>
              {{ a.questionTitle || '练习题目' }}
              <a-tag v-if="a.actorId && a.actorId !== auth.user?.id">家长陪练</a-tag>
            </span>
            <time>{{ new Date(a.createdAt).toLocaleString('zh-CN') }}</time>
          </article>
        </div>
      </template>
    </template>
  </section>
</template>
