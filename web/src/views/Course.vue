<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IconArrowLeft,
  IconCheckCircle,
  IconPlayCircle,
  IconFile,
  IconBook,
  IconArrowRight,
} from '@arco-design/web-vue/es/icon';
import { api, message } from '../lib/api';
import { auth } from '../lib/auth';
import { kindName, minute, type Course, type Progress } from '../lib/types';
import { queueProgress, pendingProgress, flushProgress } from '../lib/progress';
import PageState from '../components/PageState.vue';
const userID = auth.user?.id || '';
const router = useRouter(),
  route = useRoute(),
  course = ref<Course | null>(null),
  progress = ref<Progress[]>([]),
  loading = ref(true),
  error = ref(''),
  selected = ref(''),
  media = ref(''),
  mediaError = ref(''),
  mediaLoading = ref(false),
  video = ref<HTMLVideoElement>(),
  saveStatus = ref(''),
  syncing = ref(false);
let active = true,
  lastSaved = 0,
  mediaGeneration = 0,
  loadGeneration = 0;
const lesson = computed(() => course.value?.lessons.find((l) => l.id === selected.value)),
  index = computed(() => course.value?.lessons.findIndex((l) => l.id === selected.value) ?? 0),
  completeCount = computed(
    () =>
      course.value?.lessons.filter((l) =>
        progress.value.some((p) => p.lessonId === l.id && p.completed),
      ).length || 0,
  ),
  currentProgress = computed(() => progress.value.find((p) => p.lessonId === selected.value)),
  percent = computed(() =>
    course.value?.lessons.length ? completeCount.value / course.value.lessons.length : 0,
  );
async function sync() {
  if (syncing.value) return;
  syncing.value = true;
  saveStatus.value = '正在同步进度…';
  try {
    await flushProgress(userID);
    saveStatus.value = Object.keys(pendingProgress(userID)).length
      ? '最新进度已保存在本机，等待同步'
      : '进度已同步';
  } catch {
    saveStatus.value = '进度已保存在本机，联网后自动同步';
  } finally {
    syncing.value = false;
  }
}
function record(completed = false) {
  if (!lesson.value) return;
  const uid = userID,
    p = queueProgress(uid, {
      lessonId: lesson.value.id,
      position:
        lesson.value.kind === 'video'
          ? video.value?.currentTime || currentProgress.value?.position || 0
          : 0,
      completed: completed || currentProgress.value?.completed || false,
    });
  progress.value = [...progress.value.filter((v) => v.lessonId !== p.lessonId), p];
  saveStatus.value = '进度已保存在本机';
  lastSaved = Date.now();
  void sync();
}
function saveVideo(e: Event, completed = false) {
  const el = e.currentTarget as HTMLVideoElement;
  if (el.dataset.lessonId !== selected.value) return;
  record(completed);
}
function tick(e: Event) {
  if (Date.now() - lastSaved > 5000) saveVideo(e);
}
function restorePosition() {
  if (video.value && currentProgress.value?.position) {
    video.value.currentTime = Math.min(
      currentProgress.value.position,
      Math.max(0, video.value.duration - 0.2),
    );
  }
}
async function select(id: string, updateURL = true) {
  if (selected.value === id) return;
  if (video.value) record();
  selected.value = id;
  if (updateURL) await routerQuery();
}
async function routerQuery() {
  await router.replace({ query: { ...route.query, lesson: selected.value } });
}
async function loadMedia() {
  const generation = ++mediaGeneration;
  media.value = '';
  mediaError.value = '';
  mediaLoading.value = false;
  if (!lesson.value || lesson.value.kind === 'text') return;
  mediaLoading.value = true;
  try {
    const d = await api<{ url: string }>('/portal/media-link/' + lesson.value.uploadId);
    if (generation === mediaGeneration) media.value = d.url;
  } catch (e) {
    if (generation === mediaGeneration) mediaError.value = message(e);
  } finally {
    if (generation === mediaGeneration) mediaLoading.value = false;
  }
}
watch(selected, loadMedia);
async function load() {
  if (video.value) record();
  const generation = ++loadGeneration;
  loading.value = true;
  error.value = '';
  course.value = null;
  selected.value = '';
  saveStatus.value = '';
  try {
    const [c, p] = await Promise.all([
      api<Course>('/portal/courses/' + route.params.id),
      api<{ progress: Progress[] }>('/portal/progress'),
    ]);
    if (generation !== loadGeneration || !active) return;
    course.value = c;
    c.lessons ||= [];
    const pending = pendingProgress(userID);
    progress.value = (p.progress || []).map((v) =>
      pending[v.lessonId] && pending[v.lessonId]!.queuedAt > new Date(v.updatedAt || 0).getTime()
        ? pending[v.lessonId]!
        : v,
    );
    for (const v of Object.values(pending))
      if (!progress.value.some((p) => p.lessonId === v.lessonId)) progress.value.push(v);
    selected.value =
      c.lessons.find((l) => l.id === route.query.lesson)?.id ||
      c.lessons.find((l) => !progress.value.some((p) => p.lessonId === l.id && p.completed))?.id ||
      c.lessons[0]?.id ||
      '';
    await nextTick();
    if (Object.keys(pending).length) void sync();
  } catch (e) {
    if (generation === loadGeneration && active) error.value = message(e);
  } finally {
    if (generation === loadGeneration && active) loading.value = false;
  }
}
watch(
  () => route.params.id,
  () => {
    void load();
  },
);
watch(
  () => route.query.lesson,
  (id) => {
    if (loading.value || !course.value?.lessons.some((l) => l.id === id)) return;
    void select(String(id), false);
  },
);
function next() {
  const l = course.value?.lessons[index.value + 1];
  if (l) select(l.id);
}
const online = () => sync();
const hidden = () => {
  if (document.hidden && video.value) record();
};
const saveBeforeLeave = () => {
  if (video.value) record();
};
let interval: ReturnType<typeof setInterval>;
onMounted(() => {
  load();
  window.addEventListener('online', online);
  document.addEventListener('visibilitychange', hidden);
  window.addEventListener('pagehide', saveBeforeLeave);
  interval = setInterval(() => {
    if (active && Object.keys(pendingProgress(userID)).length) void sync();
  }, 15000);
});
onBeforeUnmount(() => {
  if (video.value) record();
  active = false;
  clearInterval(interval);
  window.removeEventListener('online', online);
  document.removeEventListener('visibilitychange', hidden);
  window.removeEventListener('pagehide', saveBeforeLeave);
  loadGeneration++;
  mediaGeneration++;
});
</script>
<template>
  <section class="container section course-page">
    <router-link to="/training" class="text-link">
      <IconArrowLeft />
      返回培训
    </router-link>
    <PageState :loading="loading" :error="error" @retry="load" />
    <template v-if="course && !loading && !error">
      <div class="course-heading">
        <div class="course-tags">
          <span>{{ course.audience === 'parent' ? '家长培训' : '老师培训' }}</span>
          <span>{{ course.instructor || '平台培训师' }}</span>
        </div>
        <h1>{{ course.title }}</h1>
        <p>{{ course.summary }}</p>
      </div>
      <div class="course-progress-bar">
        <span>已完成 {{ completeCount }} / {{ course.lessons.length }} 节</span>
        <a-progress :percent="percent" :show-text="false" />
        <span role="status">{{ saveStatus || '学习进度自动保存' }}</span>
      </div>
      <PageState
        :empty="!course.lessons.length"
        title="课程内容正在准备中"
        description="章节发布后即可开始学习。"
      />
      <div v-if="lesson" class="classroom">
        <section class="lesson-content">
          <div class="lesson-content-title">
            <span>第 {{ index + 1 }} 节 · {{ kindName(lesson.kind) }}</span>
            <h2>{{ lesson.title }}</h2>
          </div>
          <article v-if="lesson.kind === 'text'" class="lesson-text">{{ lesson.text }}</article>
          <template v-else>
            <PageState :loading="mediaLoading" :error="mediaError" @retry="loadMedia" />
            <video
              v-if="lesson.kind === 'video' && media"
              :key="lesson.id"
              ref="video"
              :data-lesson-id="lesson.id"
              :src="media"
              controls
              playsinline
              preload="metadata"
              class="lesson-video"
              @loadedmetadata="restorePosition"
              @timeupdate="tick"
              @pause="saveVideo($event)"
              @ended="saveVideo($event, true)"
              @error="mediaError = '视频无法播放，请重试或检查文件格式（建议 MP4/H.264）。'"
            />
            <div v-if="lesson.kind === 'document' && media" class="document-view">
              <IconFile />
              <h3>{{ lesson.title }}</h3>
              <p>在新窗口查看或下载本章节文档，阅读完成后确认学习进度。</p>
              <a :href="media" target="_blank" rel="noopener" class="button primary">
                打开学习文档
                <IconArrowRight />
              </a>
            </div>
          </template>
          <div class="lesson-bottom">
            <span v-if="currentProgress?.completed" class="success-text">
              <IconCheckCircle />
              已完成本节学习
            </span>
            <a-button v-else type="primary" @click="record(true)">
              {{ lesson.kind === 'video' ? '标记本节已学完' : '我已学完本节' }}
            </a-button>
            <a-button v-if="index < course.lessons.length - 1" @click="next">
              下一节
              <IconArrowRight />
            </a-button>
          </div>
        </section>
        <section class="course-outline" aria-label="课程目录">
          <h2>
            课程目录
            <span>{{ course.lessons.length }} 节</span>
          </h2>
          <button
            v-for="(l, i) in course.lessons"
            :key="l.id"
            :class="{ selected: selected === l.id }"
            :aria-current="selected === l.id ? 'step' : undefined"
            @click="select(l.id)"
          >
            <span class="outline-number">{{ String(i + 1).padStart(2, '0') }}</span>
            <span>
              <strong>{{ l.title }}</strong>
              <small>
                {{ kindName(l.kind) }}
                <template v-if="progress.find((p) => p.lessonId === l.id)?.position">
                  · 上次 {{ minute(progress.find((p) => p.lessonId === l.id)!.position) }}
                </template>
              </small>
            </span>
            <IconCheckCircle
              v-if="progress.some((p) => p.lessonId === l.id && p.completed)"
              class="success-text"
            />
            <IconPlayCircle v-else-if="l.kind === 'video'" />
            <IconBook v-else />
          </button>
        </section>
      </div>
    </template>
  </section>
</template>
