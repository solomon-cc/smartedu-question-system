<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { auth, can } from '../../stores/auth';
import { request } from '../../lib/api';
import { messageOf, type RecordData } from '../../lib/types';
import { navigationFor } from '../../lib/workspace';
import { IslandButton, IslandCard, IslandTag } from './index';
import IslandTitle from './IslandTitle.vue';
import Feedback from '../Feedback.vue';
const props = defineProps<{ stats: RecordData; loading: boolean; error: string }>();
const emit = defineEmits<{ refresh: [] }>();
const tasks = ref<RecordData[]>([]),
  taskLoading = ref(false),
  taskError = ref('');
const pending = computed(() => tasks.value.filter((item) => item.status !== 'completed'));
const name = computed(() => auth.user?.name || auth.user?.username);
const activities = computed(() =>
  [
    {
      id: 'skills_practice',
      title: '选一个练习',
      description: '数学、语言、阅读与识字',
      icon: 'mdi-book-open-page-variant-outline',
      tone: 'blue',
    },
    {
      id: 'application_games',
      title: '试试生活本领',
      description: '购物、点餐、整理书包',
      icon: 'mdi-storefront-outline',
      tone: 'teal',
    },
    {
      id: 'mood_diary',
      title: '说说我的心情',
      description: '开心或难过，都可以说',
      icon: 'mdi-emoticon-happy-outline',
      tone: 'pink',
    },
  ]
    .filter((item) => can(item.id))
    .map((item) => ({
      ...item,
      path: navigationFor('STUDENT', auth.permissions).find((n) => n.id === item.id)!.path,
    })),
);
const memories = computed(() =>
  navigationFor('STUDENT', auth.permissions).filter((item) =>
    ['skills_wrongbook', 'skills_history', 'assessment_history'].includes(item.id),
  ),
);
const submissions = computed(() =>
  (props.stats.homeworkTrends || []).reduce(
    (n: number, p: RecordData) => n + Number(p.count || 0),
    0,
  ),
);
const count = computed(() =>
  (props.stats.practiceTrends || []).reduce(
    (n: number, p: RecordData) => n + Number(p.count || 0),
    0,
  ),
);
async function loadTasks() {
  if (!can('skills_homework')) return;
  taskLoading.value = true;
  taskError.value = '';
  try {
    tasks.value = (await request<RecordData[]>('/homeworks')) || [];
  } catch (e) {
    taskError.value = messageOf(e);
  } finally {
    taskLoading.value = false;
  }
}
onMounted(loadTasks);
</script>
<template>
  <section class="student-home">
    <header class="student-greeting">
      <div>
        <IslandTitle tone="green">{{ name }}，你好</IslandTitle>
        <p>今天想学什么？从一件小事开始。</p>
      </div>
    </header>
    <div class="home-first-row" :class="{ 'without-tasks': !can('skills_homework') }">
      <IslandCard
        v-if="can('skills_homework')"
        class="today-card island-tonal-surface"
        data-island-tone="green"
      >
        <div class="today-heading">
          <span class="today-icon"><v-icon icon="mdi-notebook-check-outline" size="30" /></span>
          <div>
            <h2>老师给我的任务</h2>
            <p>
              {{
                pending.length
                  ? `还有 ${pending.length} 份待完成`
                  : tasks.length
                    ? '今天的任务已完成'
                    : '还没有新任务'
              }}
            </p>
          </div>
          <IslandButton
            to="/homework"
            variant="text"
            aria-label="查看全部作业"
            icon="mdi-chevron-right"
          />
        </div>
        <div v-if="taskLoading || taskError" class="task-feedback">
          <Feedback :loading="taskLoading" :error="taskError" @retry="loadTasks" />
        </div>
        <template v-if="!taskLoading && !taskError && pending.length">
          <div class="featured-task">
            <IslandTag size="small">先做这一份</IslandTag>
            <h3>{{ pending[0].name }}</h3>
            <p>截止日期：{{ pending[0].endDate || '不限' }}</p>
            <IslandButton
              :to="'/practice?homeworkId=' + encodeURIComponent(pending[0].id)"
              color="primary"
              size="large"
              block
              append-icon="mdi-arrow-right"
            >
              开始作业
            </IslandButton>
          </div>
          <router-link
            v-for="task in pending.slice(1, 3)"
            :key="task.id"
            :to="'/practice?homeworkId=' + encodeURIComponent(task.id)"
            class="next-task"
          >
            <v-icon icon="mdi-notebook-outline" />
            <span>{{ task.name }}</span>
            <v-icon icon="mdi-chevron-right" />
          </router-link>
        </template>
        <div v-else-if="!taskLoading && !taskError" class="task-rest">
          <span class="task-rest-icon"><v-icon icon="naive:rabbit" size="60" /></span>
          <h3>{{ tasks.length ? '任务完成，休息一下' : '准备好时，再出发' }}</h3>
          <p>可以选一个喜欢的练习，慢慢来。</p>
          <IslandButton
            v-if="can('skills_practice')"
            to="/skills"
            color="primary"
            append-icon="mdi-arrow-right"
          >
            选一个练习
          </IslandButton>
        </div>
      </IslandCard>
      <section class="activity-area" v-if="activities.length" aria-labelledby="activity-heading">
        <h2 id="activity-heading">
          <v-icon icon="mdi-compass-outline" />
          我想做什么？
        </h2>
        <div class="activity-grid">
          <router-link
            v-for="item in activities"
            :key="item.id"
            :to="item.path"
            class="activity-card"
            :data-island-tone="item.tone"
          >
            <div class="activity-art" aria-hidden="true">
              <img v-if="item.id === 'application_games'" src="/life/supermarket-v1.jpg" alt="" />
              <div v-else-if="item.id === 'skills_practice'" class="learning-friends">
                <v-icon class="friend-cat" icon="naive:cat" />
                <v-icon class="friend-book" icon="naive:book" />
                <span class="friend-letter">Aa</span>
              </div>
              <div v-else class="feeling-art">
                <v-icon icon="naive:heart" size="72" />
                <v-icon icon="naive:smile" size="54" />
              </div>
            </div>
            <div class="activity-copy">
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
              </div>
              <span class="activity-go"><v-icon icon="mdi-arrow-right" size="24" /></span>
            </div>
          </router-link>
        </div>
      </section>
    </div>
    <section
      v-if="can('skills_stats') || memories.length"
      class="home-review"
      aria-labelledby="review-heading"
    >
      <div class="review-heading">
        <h2 id="review-heading">我的学习足迹</h2>
        <IslandButton
          v-if="can('skills_stats')"
          to="/stats"
          variant="text"
          append-icon="mdi-chevron-right"
        >
          成长记录
        </IslandButton>
      </div>
      <Feedback
        v-if="can('skills_stats')"
        :loading="loading"
        :error="error"
        @retry="emit('refresh')"
      />
      <div class="review-content">
        <div v-if="can('skills_stats')" class="growth-numbers">
          <div>
            <strong>{{ loading || error ? '—' : count }}</strong>
            <span>最近练习题目</span>
          </div>
          <div>
            <strong>{{ loading || error ? '—' : submissions }}</strong>
            <span>最近作业提交</span>
          </div>
        </div>
        <nav v-if="memories.length" class="memory-links" aria-label="回顾我的学习">
          <router-link
            v-for="item in memories"
            :key="item.id"
            :to="item.path"
            :data-island-tone="
              item.id === 'skills_history'
                ? 'blue'
                : item.id === 'skills_wrongbook'
                  ? 'orange'
                  : 'purple'
            "
          >
            <v-icon :icon="item.icon" size="25" />
            <span>{{ item.title }}</span>
            <v-icon icon="mdi-chevron-right" size="18" />
          </router-link>
        </nav>
      </div>
    </section>
  </section>
</template>
<style scoped>
.student-greeting {
  margin-bottom: 28px;
}
.student-greeting p {
  margin: 12px 0 0 24px;
  color: var(--island-muted);
  font-size: 16px;
}
.home-first-row {
  display: grid;
  grid-template-columns: minmax(300px, 350px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.home-first-row.without-tasks {
  grid-template-columns: minmax(0, 1fr);
}
.home-first-row > *,
.activity-grid > *,
.review-content > * {
  min-width: 0;
}
.today-card {
  padding: 24px;
  min-height: 350px;
}
.today-heading {
  display: flex;
  gap: 12px;
  align-items: center;
}
.today-heading > div {
  flex: 1;
  min-width: 0;
}
.today-heading h2 {
  font-size: 19px;
}
.today-heading p {
  font-size: 14px;
  color: var(--island-muted);
  margin-top: 4px;
}
.today-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: var(--island-surface);
  flex-shrink: 0;
}
.featured-task {
  padding-top: 28px;
}
.featured-task h3 {
  font-size: 23px;
  margin: 12px 0 8px;
  overflow-wrap: anywhere;
}
.featured-task p {
  font-size: 14px;
  color: var(--island-muted);
  margin-bottom: 24px;
}
.next-task {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--island-text);
  text-decoration: none;
  padding: 16px 0 4px;
  margin-top: 20px;
  border-top: 1px dashed var(--island-border);
  min-height: 48px;
}
.next-task span {
  flex: 1;
}
.task-rest {
  text-align: center;
  padding: 28px 4px 8px;
}
.task-rest-icon {
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
  width: 96px;
  height: 96px;
  background: var(--island-mint);
  border-radius: 50%;
}
.task-rest p {
  font-size: 14px;
  color: var(--island-muted);
  margin: 8px 0 20px;
}
.activity-area > h2 {
  margin: 0 0 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.activity-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.activity-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--island-border);
  border-radius: 24px;
  background: var(--island-surface);
  color: var(--island-text);
  text-decoration: none;
  overflow: hidden;
  transition: transform 0.2s;
}
.activity-card:hover {
  transform: translateY(-2px);
}
.activity-art {
  aspect-ratio: 4 / 3;
  background: var(--island-content);
  display: grid;
  place-items: center;
  overflow: hidden;
}
.activity-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.learning-friends {
  width: min(80%, 210px);
  aspect-ratio: 21 / 20;
  position: relative;
  color: var(--island-heading);
}
.friend-cat {
  position: absolute;
  width: 68%;
  height: 71%;
  top: 0;
  left: 6%;
  transform: rotate(-6deg);
}
.friend-book {
  position: absolute;
  width: 48%;
  height: 50%;
  bottom: 0;
  left: 30%;
  transform: rotate(7deg);
}
.friend-letter {
  position: absolute;
  right: 0;
  top: 25%;
  font-size: clamp(16px, 2.5vw, 30px);
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 16px;
  background: var(--island-surface);
  transform: rotate(8deg);
}
.feeling-art {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--island-heading);
}
.activity-copy {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  flex: 1;
}
.activity-copy > div {
  flex: 1;
  min-width: 0;
}
.activity-copy h3 {
  font-size: 20px;
}
.activity-copy p {
  font-size: 13px;
  line-height: 1.6;
  margin-top: 4px;
  color: var(--island-muted);
}
.activity-go {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--island-mint);
  flex-shrink: 0;
}
.home-review {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px dashed var(--island-border);
}
.review-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.review-content {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 28px;
}
.growth-numbers {
  display: flex;
  gap: 24px;
  flex-shrink: 0;
}
.growth-numbers > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.growth-numbers strong {
  font-size: 28px;
  color: var(--island-heading);
}
.growth-numbers span {
  font-size: 13px;
  color: var(--island-muted);
}
.memory-links {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  flex: 1;
}
.memory-links a > span {
  flex: 1;
  font-size: 14px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.memory-links a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 16px;
  min-height: 60px;
  border: 1px solid var(--island-border);
  border-radius: 20px;
  background: var(--island-content);
  color: var(--island-text);
  text-decoration: none;
  flex: 1;
}
@media (max-width: 1199px) {
  .home-first-row {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .today-card {
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.3fr);
    gap: 20px 32px;
    align-items: center;
  }
  .task-feedback {
    grid-column: 1 / -1;
  }
  .featured-task {
    padding-top: 0;
  }
  .next-task {
    grid-column: 2;
    margin-top: 0;
  }
  .task-rest {
    display: grid;
    grid-template-columns: 68px 1fr;
    text-align: left;
    padding: 0;
    column-gap: 16px;
  }
  .task-rest-icon {
    grid-row: span 3;
    width: 68px;
    height: 68px;
    margin: 0;
  }
  .task-rest-icon :deep(.v-icon) {
    width: 60px;
    height: 60px;
  }
  .task-rest p {
    margin: 4px 0 12px;
  }
  .task-rest .island-button {
    justify-self: start;
  }
  .activity-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .activity-card:first-child {
    grid-row: auto;
  }
  .activity-card {
    display: flex;
    flex-direction: column;
  }
  .activity-art,
  .activity-card:first-child .activity-art {
    height: auto;
    aspect-ratio: 4 / 3;
    min-height: 0;
    flex: none;
  }
  .activity-copy {
    flex: 1;
    align-items: flex-start;
  }
  .activity-copy p {
    font-size: 14px;
  }
  .activity-go {
    align-self: center;
  }
  .review-content {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
  .memory-links a {
    padding: 16px 12px;
  }
}
@media (max-width: 767px) {
  .today-card {
    display: block;
  }
  .task-rest,
  .featured-task {
    padding-top: 20px;
  }
  .next-task {
    margin-top: 16px;
  }
}
@media (max-width: 599px) {
  .student-greeting p {
    margin-left: 20px;
    font-size: 15px;
  }
  .today-card {
    padding: 20px;
  }
  .today-heading h2 {
    font-size: 18px;
  }
  .activity-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .activity-card:first-child {
    grid-column: span 2;
    display: grid;
    grid-template-columns: 110px 1fr;
  }
  .activity-card:first-child .activity-art {
    min-height: 130px;
    aspect-ratio: auto;
    height: 100%;
  }
  .activity-card:first-child .learning-friends {
    width: 88%;
  }
  .friend-letter {
    padding: 2px 6px;
  }
  .feeling-art {
    gap: 8px;
  }
  .feeling-art :deep(.v-icon:first-child) {
    width: 56px;
    height: 56px;
  }
  .feeling-art :deep(.v-icon:last-child) {
    width: 42px;
    height: 42px;
  }
  .activity-copy {
    padding: 14px;
    gap: 8px;
  }
  .activity-card:not(:first-child) .activity-copy {
    position: relative;
    padding-bottom: 56px;
  }
  .activity-card:not(:first-child) .activity-go {
    position: absolute;
    right: 14px;
    bottom: 12px;
  }
  .activity-copy h3 {
    font-size: 17px;
  }
  .activity-copy p {
    font-size: 13px;
  }
  .activity-go {
    width: 32px;
    height: 32px;
  }
  .memory-links {
    grid-template-columns: minmax(0, 1fr);
  }
  .memory-links a {
    min-height: 56px;
  }
  .today-icon {
    width: 40px;
    height: 40px;
  }
  .growth-numbers {
    gap: 36px;
  }
  .review-heading h2 {
    font-size: 19px;
  }
}
</style>
