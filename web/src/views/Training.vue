<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IconArrowRight, IconSearch, IconSettings } from '@arco-design/web-vue/es/icon';
import { api, message } from '../lib/api';
import { auth, manageCourses } from '../lib/auth';
import type { Course } from '../lib/types';
import PageState from '../components/PageState.vue';
const router = useRouter(),
  route = useRoute(),
  items = ref<Course[]>([]),
  audience = ref(String(route.query.audience || 'all')),
  search = ref(''),
  loading = ref(true),
  error = ref('');
const visible = computed(() =>
  items.value.filter(
    (c) =>
      (audience.value === 'all' || c.audience === audience.value) &&
      `${c.title} ${c.summary} ${c.instructor}`.includes(search.value.trim()),
  ),
);
async function load() {
  loading.value = true;
  error.value = '';
  try {
    const catalog: Course[] = await api('/portal/courses');
    if (auth.user) {
      const mine = await api<{ courses: Course[] }>('/portal/progress');
      const map = new Map(catalog.map((c) => [c.id, c]));
      mine.courses.forEach((c) => map.set(c.id, c));
      items.value = [...map.values()];
    } else items.value = catalog;
  } catch (e) {
    error.value = message(e);
  } finally {
    loading.value = false;
  }
}
watch(
  () => route.query.audience,
  (v) => (audience.value = String(v || 'all')),
);
const filters = [
  { value: 'all', label: '全部课程' },
  { value: 'parent', label: '家长培训' },
  { value: 'teacher', label: '老师培训' },
];
async function moveFilter(step: number) {
  const index = filters.findIndex((f) => f.value === audience.value);
  const next = filters[(index + step + filters.length) % filters.length]!;
  audience.value = next.value;
  await router.replace({ query: next.value === 'all' ? {} : { audience: next.value } });
  await nextTick();
  document.getElementById('course-filter-' + next.value)?.focus();
}
onMounted(load);
</script>
<template>
  <section class="container course-catalog-page">
    <div class="catalog-page-heading">
      <div>
        <h1>培训课程</h1>
      </div>
      <router-link v-if="manageCourses" to="/manage/courses" class="button outline">
        <IconSettings />
        管理课程
      </router-link>
    </div>
    <div class="course-catalog-controls">
      <a-tabs
        v-model:active-key="audience"
        role="tablist"
        aria-label="课程分类"
        @change="router.replace({ query: $event === 'all' ? {} : { audience: $event } })"
      >
        <a-tab-pane v-for="filter in filters" :key="filter.value">
          <template #title>
            <button
              class="course-filter-tab"
              role="tab"
              :id="'course-filter-' + filter.value"
              :aria-selected="audience === filter.value"
              :tabindex="audience === filter.value ? 0 : -1"
              @keydown.right.stop.prevent="moveFilter(1)"
              @keydown.left.stop.prevent="moveFilter(-1)"
            >
              {{ filter.label }}
            </button>
          </template>
        </a-tab-pane>
      </a-tabs>
      <a-input-search
        v-model="search"
        allow-clear
        placeholder="搜索课程或讲师"
        :input-attrs="{ 'aria-label': '搜索课程' }"
        size="large"
      />
    </div>
    <div v-if="!loading && !error && items.length" class="course-catalog-meta">
      <span role="status">{{ visible.length }} 门课程</span>
    </div>
    <PageState
      :loading="loading"
      :error="error"
      :empty="!visible.length"
      :title="items.length ? '没有匹配的课程' : '暂无课程'"
      @retry="load"
    />
    <div v-if="!loading && !error" class="course-grid editorial-course-grid">
      <router-link
        v-for="(c, i) in visible"
        :key="c.id"
        :to="
          auth.user
            ? '/training/' + c.id
            : { path: '/login', query: { redirect: '/training/' + c.id } }
        "
        class="course-card"
      >
        <div class="course-cover" :class="[c.audience, 'cover-variant-' + (i % 3)]">
          <span class="cover-category">
            {{ c.audience === 'parent' ? '家长培训' : '老师培训' }}
          </span>
          <h2>{{ c.title }}</h2>
          <div class="course-cover-shapes" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span class="cover-index">一粒麦子 · 成长课堂</span>
        </div>
        <div class="course-card-body">
          <div v-if="c.visibility === 'assigned'" class="course-tags"><span>指定课程</span></div>
          <p v-if="c.summary">{{ c.summary }}</p>
          <div class="course-card-foot">
            <span>{{ c.instructor || '平台培训师' }}</span>
            <span class="text-link">
              开始学习
              <IconArrowRight />
            </span>
          </div>
        </div>
      </router-link>
    </div>
  </section>
</template>
