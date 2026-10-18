<script setup lang="ts">
import { IslandButton, IslandCard, IslandTag, IslandAvatar } from '../components/island';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { auth, can } from '../stores/auth';
import { request } from '../lib/api';
import { navigationFor, quickLinksFor, workspaceLabel } from '../lib/workspace';
import { roleLabel, messageOf, type RecordData, type Point } from '../lib/types';
import { useTask } from '../lib/useData';
import PageHeader from '../components/PageHeader.vue';
import Feedback from '../components/Feedback.vue';
import EmptyState from '../components/EmptyState.vue';
import TrendChart from '../components/TrendChart.vue';
import StudentHome from '../components/island/StudentHome.vue';
import TeacherHome from '../components/TeacherHome.vue';
const route = useRoute();
const { loading, error, run } = useTask();
const stats = ref<RecordData>({}),
  online = ref<RecordData[]>([]),
  onlineError = ref('');
const student = computed(() => auth.user?.role === 'STUDENT');
const teacher = computed(() => auth.user?.role === 'TEACHER');
const admin = computed(() => auth.user?.role === 'ADMIN');
const analytics = computed(() => route.path === '/stats');
const quickLinks = computed(() => quickLinksFor(auth.user?.role, auth.permissions));
const intro = computed(() =>
  student.value
    ? {
        title: '今天，从一个小目标开始',
        description: '完成老师安排的作业，也可以选一个喜欢的练习。',
        icon: 'mdi-school-outline',
      }
    : teacher.value
      ? {
          title: '从了解孩子，到陪伴成长',
          description: '开展评估，安排学习任务，跟进每一次真实表现。',
          icon: 'mdi-human-male-board',
        }
      : {
          title: '让平台管理更有条理',
          description: '管理账号与权限，检查教学记录，维护平台配置。',
          icon: 'mdi-shield-account-outline',
        },
);
const metrics = computed(() =>
  student.value
    ? [
        {
          label: '练习正确率',
          value: stats.value.practiceTrends?.length ? stats.value.accuracy || '—' : '—',
          icon: 'mdi-bullseye-arrow',
          hint: '全部已提交的自主练习',
        },
        {
          label: '练习题目',
          value: (stats.value.practiceTrends || []).reduce(
            (n: number, p: RecordData) => n + p.count,
            0,
          ),
          icon: 'mdi-pencil-outline',
          hint: '最近 14 个练习记录日',
        },
        {
          label: '作业提交',
          value: (stats.value.homeworkTrends || []).reduce(
            (n: number, p: RecordData) => n + p.count,
            0,
          ),
          icon: 'mdi-notebook-check-outline',
          hint: '最近 14 个作业记录日',
        },
        {
          label: '练习记录日',
          value: stats.value.practiceTrends?.length || 0,
          icon: 'mdi-calendar-check-outline',
          hint: '最多展示最近 14 个记录日',
        },
      ]
    : teacher.value
      ? [
          {
            label: '今日布置作业',
            value: stats.value.todayAssigned ?? 0,
            icon: 'mdi-clipboard-text-outline',
            hint: '你今天安排的作业',
          },
          {
            label: '作业完成率',
            value: `${Math.round(Number(stats.value.completionRate || 0))}%`,
            icon: 'mdi-check-circle-outline',
            hint: '你布置的作业，按学生提交统计',
          },
          {
            label: '作业正确率',
            value: `${Math.round(Number(stats.value.accuracyRate || 0) * 100)}%`,
            icon: 'mdi-bullseye-arrow',
            hint: '你布置的作业答题记录',
          },
          {
            label: '学生档案',
            value: stats.value.studentSummaries?.length ?? 0,
            icon: 'mdi-account-school-outline',
            hint: '平台可查看的学生档案',
          },
        ]
      : [
          {
            label: '平台用户',
            value: stats.value.totalUsers ?? 0,
            icon: 'mdi-account-group-outline',
            hint: '平台已注册用户',
          },
          {
            label: '题库总量',
            value: stats.value.totalQuestions ?? 0,
            icon: 'mdi-book-open-outline',
            hint: '平台教学资源总量',
          },
          {
            label: '当前在线',
            value: stats.value.onlineUsers ?? 0,
            icon: 'mdi-access-point',
            hint: '最近 5 分钟访问过接口的用户',
          },
          {
            label: '可用功能',
            value: navigationFor(auth.user?.role, auth.permissions).length,
            icon: 'mdi-view-grid-outline',
            hint: '当前账号的可用页面',
          },
        ],
);
const trend = computed<Point[]>(() =>
  student.value
    ? (stats.value.practiceTrends || []).map((p: RecordData) => ({ label: p.date, value: p.count }))
    : stats.value.accuracyTrend || [],
);
const completion = computed<Point[]>(() =>
  student.value
    ? (stats.value.homeworkTrends || []).map((p: RecordData) => ({ label: p.date, value: p.count }))
    : stats.value.completionTrend || [],
);
const studentSummaries = computed<RecordData[]>(() => stats.value.studentSummaries || []);
const learningDays = computed(() => {
  const days = new Map<string, RecordData>();
  for (const [kind, points] of [
    ['practice', stats.value.practiceTrends || []],
    ['homework', stats.value.homeworkTrends || []],
  ] as const) {
    for (const point of points) {
      const row = days.get(point.date) || {
        date: point.date,
        practice: 0,
        homework: 0,
        accuracy: '—',
      };
      row[kind] = point.count;
      if (kind === 'practice') row.accuracy = `${point.accuracy}%`;
      days.set(point.date, row);
    }
  }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
});
async function load() {
  if (!can(student.value ? 'skills_stats' : 'dashboard')) {
    error.value = '当前账号未开放统计数据权限，请联系管理员。';
    return;
  }
  await run(async () => {
    stats.value = await request(
      student.value ? '/student/stats' : teacher.value ? '/teacher/stats' : '/dashboard/stats',
    );
  });
  // Online status is auxiliary: a failed request must not hide the main statistics.
  if (admin.value && !analytics.value && can('dashboard')) {
    onlineError.value = '';
    try {
      online.value = (await request('/dashboard/online-users')) || [];
    } catch (e) {
      onlineError.value = messageOf(e);
    }
  }
}
onMounted(() => {
  if (!teacher.value || analytics.value) load();
});
</script>
<template>
  <TeacherHome v-if="teacher && !analytics" />
  <StudentHome
    v-else-if="student && !analytics"
    :stats="stats"
    :loading="loading"
    :error="error"
    @refresh="load"
  />
  <template v-else>
    <PageHeader
      :description="
        analytics
          ? undefined
          : `${auth.user?.name || auth.user?.username}，欢迎回来。${intro.description}`
      "
    >
      <IslandButton variant="outlined" prepend-icon="mdi-refresh" :loading="loading" @click="load">
        刷新数据
      </IslandButton>
    </PageHeader>
    <Feedback :loading="loading" :error="error" @retry="load" />
    <IslandCard v-if="!analytics" class="home-shortcuts mb-6">
      <div class="panel-header">
        <div>
          <h2>常用功能</h2>
          <p>{{ student ? '选择今天要做的事' : '快速进入平台管理' }}</p>
        </div>
        <v-icon icon="mdi-dots-grid" />
      </div>
      <div v-if="quickLinks.length" class="quick-grid">
        <router-link v-for="item in quickLinks" :key="item.id" :to="item.path" class="quick-link">
          <v-icon :icon="item.icon" size="24" />
          <span>{{ item.title }}</span>
          <v-icon icon="mdi-arrow-top-right" size="16" class="quick-arrow" />
        </router-link>
      </div>
      <EmptyState v-else title="暂无可用入口" description="请联系管理员检查页面权限。" />
    </IslandCard>
    <div class="metric-grid" :class="{ 'student-metrics': student && !analytics }">
      <IslandCard
        v-for="(metric, index) in metrics"
        :key="metric.label"
        class="metric-card"
        :data-island-tone="
          student ? (['blue', 'yellow', 'teal', 'purple'] as const)[index % 4] : undefined
        "
      >
        <div class="metric-top">
          <span>{{ metric.label }}</span>
          <div class="metric-icon"><v-icon :icon="metric.icon" size="20" /></div>
        </div>
        <div class="metric-value">{{ loading || error ? '—' : metric.value }}</div>
        <div class="metric-caption">{{ metric.hint }}</div>
      </IslandCard>
    </div>
    <div class="dashboard-grid">
      <template v-if="teacher">
        <IslandCard :class="analytics ? 'dashboard-wide' : ''">
          <div class="panel-header">
            <div>
              <h2>最近布置的作业</h2>
              <p>你最近的 5 份作业，人数按实际提交统计</p>
            </div>
            <IslandButton v-if="can('assignments')" to="/assign" variant="text">
              查看作业
            </IslandButton>
          </div>
          <v-list v-if="stats.recentHomeworks?.length" lines="two">
            <v-list-item
              v-for="item in stats.recentHomeworks"
              :key="item.id"
              :title="item.name"
              :subtitle="item.date"
            >
              <template #append>
                <span class="record-count">{{ item.completed }} / {{ item.total }} 人提交</span>
              </template>
            </v-list-item>
          </v-list>
          <EmptyState
            v-else-if="!loading && !error"
            title="还没有布置作业"
            description="为学生安排任务后，这里会显示提交进度。"
            icon="mdi-notebook-outline"
          />
        </IslandCard>
        <IslandCard class="dashboard-wide">
          <div class="panel-header">
            <div>
              <h2>学生学习记录</h2>
              <p>学生正确率来自全部答题记录；作业安排人数来自你布置的任务。</p>
            </div>
            <IslandButton v-if="can('students')" to="/students" variant="text">
              学生档案
            </IslandButton>
          </div>
          <v-data-table
            :items="studentSummaries"
            :headers="[
              { title: '学生账号', key: 'username' },
              { title: '答题正确率', key: 'accuracy' },
              { title: '已安排作业', key: 'hwAssigned' },
            ]"
            :loading="loading"
          >
            <template #item.accuracy="{ item }">{{ Math.round(item.accuracy || 0) }}%</template>
            <template #no-data>
              <EmptyState
                v-if="!loading && !error"
                title="还没有学生记录"
                description="建立学生账号后，可在这里查看学习概况。"
              />
            </template>
          </v-data-table>
        </IslandCard>
      </template>
      <template v-else>
        <IslandCard>
          <div class="panel-header">
            <div>
              <h2>{{ student ? '练习轨迹' : '平台答题正确率' }}</h2>
              <p>
                {{
                  student ? '最近 14 个练习记录日的题目数量' : '近 7 天平台全部答题记录，单位：%'
                }}
              </p>
            </div>
          </div>
          <TrendChart
            v-if="trend.length"
            :points="trend"
            :label="student ? '练习题数' : '正确率（%）'"
          />
          <EmptyState
            v-else-if="!loading && !error"
            title="还没有练习记录"
            :description="
              student
                ? '完成并保存一次练习后，就能看到自己的学习轨迹。'
                : '提交答题记录后，这里会显示平台统计。'
            "
            icon="mdi-chart-line"
          />
        </IslandCard>
        <IslandCard>
          <div class="panel-header">
            <div>
              <h2>{{ student ? '作业提交记录' : '平台作业完成率' }}</h2>
              <p>
                {{
                  student ? '最近 14 个作业记录日的提交次数' : '近 7 天平台作业状态统计，单位：%'
                }}
              </p>
            </div>
          </div>
          <TrendChart
            v-if="completion.length"
            :points="completion"
            :label="student ? '提交次数' : '完成率（%）'"
          />
          <EmptyState
            v-else-if="!loading && !error"
            title="还没有作业提交记录"
            description="完成并保存作业后，记录会显示在这里。"
            icon="mdi-notebook-check-outline"
          />
        </IslandCard>
      </template>
      <IslandCard v-if="admin && !analytics">
        <div class="panel-header">
          <div>
            <h2>在线用户</h2>
            <p>最近 5 分钟内活跃的账号</p>
          </div>
          <IslandTag size="small">{{ online.length }} 人</IslandTag>
        </div>
        <Feedback :error="onlineError" @retry="load" />
        <v-list v-if="online.length" lines="two">
          <v-list-item
            v-for="user in online.slice(0, 5)"
            :key="user.id"
            :title="user.name || user.username"
            :subtitle="roleLabel(user.role)"
          >
            <template #prepend>
              <IslandAvatar color="surface-variant" size="36" class="mr-3">
                {{ (user.name || user.username).slice(0, 1) }}
              </IslandAvatar>
            </template>
            <template #append>
              <span class="online-label">
                <span class="status-dot" />
                在线
              </span>
            </template>
          </v-list-item>
        </v-list>
        <EmptyState
          v-else-if="!onlineError && !loading"
          title="暂无在线记录"
          description="账号访问页面后会更新活跃状态。"
        />
      </IslandCard>
      <IslandCard v-if="student && !analytics && can('mood_diary')" class="pa-7">
        <v-icon icon="mdi-heart-outline" color="primary" size="35" />
        <h2 class="mt-5">今天的心情怎么样？</h2>
        <p class="muted mt-3 mb-6">学习之外，也给自己一点表达心情的时间。</p>
        <IslandButton to="/mood-diary" variant="tonal" color="primary">写下今天的心情</IslandButton>
      </IslandCard>
      <IslandCard v-if="student && analytics" class="dashboard-wide">
        <div class="panel-header">
          <div>
            <h2>每日学习明细</h2>
            <p>练习和作业分别按最近 14 个记录日汇总</p>
          </div>
        </div>
        <div v-if="learningDays.length" class="learning-day-cards">
          <div v-for="day in learningDays" :key="day.date" class="learning-day">
            <strong>{{ day.date }}</strong>
            <span>练习 {{ day.practice }} 题 · 作业提交 {{ day.homework }} 次</span>
            <span class="muted">练习正确率 {{ day.accuracy }}</span>
          </div>
        </div>
        <EmptyState
          v-else-if="!loading && !error"
          title="还没有学习明细"
          description="保存练习或作业后，记录会自动汇总到这里。"
        />
      </IslandCard>
    </div>
  </template>
</template>
<style scoped>
.welcome-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgb(var(--v-theme-surface-variant));
  border: 1px solid rgba(var(--v-theme-primary), 0.16);
  border-radius: 18px;
  padding: 30px 34px;
  margin-bottom: 26px;
  color: rgb(var(--v-theme-on-surface-variant));
  overflow: hidden;
  min-height: 222px;
}
.welcome-tag {
  font-size: 12px;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 7px;
}
.welcome-tag span {
  width: 5px;
  height: 5px;
  background: #678567;
  border-radius: 100%;
}
.welcome-banner h2 {
  font-size: 26px;
  margin-top: 15px;
  letter-spacing: 0;
}
.welcome-banner p {
  font-size: 14px;
  opacity: 0.85;
  margin: 10px 0 23px;
  line-height: 1.8;
}
.welcome-art {
  position: relative;
  min-width: 220px;
  height: 178px;
  margin-right: 23px;
}
.art-ring {
  position: absolute;
  width: 174px;
  height: 174px;
  border: 1px solid #cad9c6;
  border-radius: 50%;
  left: 19px;
  top: -6px;
}
.art-square {
  position: absolute;
  left: 50px;
  top: 17px;
  width: 120px;
  height: 125px;
  border-radius: 24px;
  background: #d6e3cc;
  transform: rotate(-10deg);
  display: grid;
  place-items: center;
  color: #416847;
}
.art-small {
  position: absolute;
  bottom: 19px;
  right: 9px;
  width: 59px;
  height: 59px;
  background: #eef5f1;
  display: grid;
  place-items: center;
  border-radius: 16px;
  transform: rotate(12deg);
}
.welcome-art > span {
  position: absolute;
  bottom: -8px;
  font-size: 8px;
  letter-spacing: 2px;
  left: 28px;
  opacity: 0.6;
}
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 24px;
}
.dashboard-wide {
  grid-column: 1 / -1;
}
.learning-day-cards {
  padding: 0 24px 24px;
  display: grid;
  gap: 12px;
}
.learning-day {
  display: grid;
  gap: 6px;
  padding: 16px;
  background: var(--island-surface);
  border: 1px solid var(--island-border);
  border-radius: 18px;
}
.learning-day span {
  font-size: 14px;
}
.record-count {
  font-size: 14px;
  padding-left: 16px;
}
.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 22px;
}
.quick-link {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 13px;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  border: 1px solid rgba(var(--v-border-color), 0.08);
  border-radius: 11px;
  padding: 18px 17px;
  transition: background 0.2s;
}
.quick-link:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
.quick-link:hover {
  background: rgba(var(--v-theme-primary), 0.05);
}
.quick-link span {
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
}
.quick-arrow {
  position: absolute;
  top: 18px;
  right: 14px;
  opacity: 0.35;
}
.online-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: rgb(var(--v-theme-primary));
}
@media (max-width: 1100px) {
  .welcome-art {
    margin-right: 0;
    min-width: 190px;
  }
  .welcome-banner {
    padding: 26px;
  }
  .welcome-banner h2 {
    font-size: 22px;
  }
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 650px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 16px;
  }
  .student-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .student-metrics .metric-card {
    padding: 16px;
  }
  .student-metrics .metric-value {
    font-size: 24px;
    margin: 8px 0;
  }
  .student-metrics .metric-icon {
    display: none;
  }

  .welcome-art {
    display: none;
  }
  .welcome-banner {
    padding: 23px;
  }
  .welcome-banner h2 {
    font-size: 21px;
  }
  .dashboard-grid {
    gap: 18px;
  }
  .quick-grid {
    padding: 17px;
  }
}
</style>
