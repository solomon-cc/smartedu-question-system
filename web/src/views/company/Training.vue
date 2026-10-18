<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IconArrowRight } from '@arco-design/web-vue/es/icon';
import { companyGet } from '../../lib/companyApi';
import { platformLogin } from '../../lib/sites';
import type { Course } from '../../lib/types';
import CompanyState from '../../components/CompanyState.vue';
const items = ref<Course[]>([]),
  loading = ref(true),
  error = ref(''),
  audience = ref('all'),
  search = ref('');
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
    items.value = await companyGet<Course[]>('courses');
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section class="container course-catalog-page">
    <div class="catalog-page-heading">
      <div>
        <h1>培训课程</h1>
        <p>为家长与老师提供实用课程，把专业方法带进家庭与课堂。</p>
      </div>
    </div>
    <div class="public-course-controls">
      <div class="public-course-filters" role="group" aria-label="课程分类">
        <button
          v-for="f in [
            { value: 'all', label: '全部课程' },
            { value: 'parent', label: '家长培训' },
            { value: 'teacher', label: '老师培训' },
          ]"
          :key="f.value"
          :aria-pressed="audience === f.value"
          :class="{ active: audience === f.value }"
          @click="audience = f.value"
        >
          {{ f.label }}
        </button>
      </div>
      <label>
        搜索课程
        <input v-model="search" placeholder="课程名称或讲师" type="search" />
      </label>
    </div>
    <div class="course-catalog-meta">
      <span role="status">{{ loading ? '正在加载课程' : visible.length + ' 门公开课程' }}</span>
      <span>课程介绍可直接浏览，开始学习请登录学习平台。</span>
    </div>
    <CompanyState
      :loading="loading"
      :error="error"
      :empty="!visible.length"
      :title="items.length ? '暂无匹配课程' : '公开课程即将上线'"
      :description="
        items.length
          ? '换个分类或关键词试试。'
          : '课程发布后会自动展示在这里。指定课程请到学习平台登录后查看。'
      "
      @retry="load"
    />
    <div v-if="!loading && !error" class="course-grid editorial-course-grid">
      <article v-for="(c, i) in visible" :key="c.id" class="course-card">
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
          <p>{{ c.summary || '系统课程，支持持续学习与实践。' }}</p>
          <div class="course-card-foot">
            <span>{{ c.instructor || '一粒麦子老师' }}</span>
            <a
              :href="platformLogin('/training/' + encodeURIComponent(c.id))"
              class="text-link"
              :aria-label="'登录学习：' + c.title"
            >
              登录学习
              <IconArrowRight />
            </a>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
<style scoped>
.public-course-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  border-bottom: 1px solid var(--line);
  padding: 12px 0 24px;
}
.public-course-filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.public-course-filters button {
  border: 1px solid transparent;
  background: white;
  padding: 10px 16px;
  min-height: 44px;
  color: var(--muted);
  border-radius: 6px;
}
.public-course-filters button.active {
  background: var(--soft);
  border-color: var(--brand);
  color: var(--brand);
}
.public-course-controls label {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--muted);
}
input {
  border: 1px solid var(--line);
  background: white;
  color: var(--ink);
  min-height: 44px;
  border-radius: 6px;
  padding: 10px 12px;
  width: 250px;
}
.course-card:hover {
  transform: none;
}
@media (max-width: 540px) {
  .public-course-controls label,
  input {
    width: 100%;
  }
  .public-course-controls label {
    align-items: start;
    flex-direction: column;
  }
}
</style>
