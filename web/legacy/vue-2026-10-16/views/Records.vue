<script setup lang="ts">
import {
  IslandButton,
  IslandCard,
  IslandTag,
  IslandInput,
  IslandSelect,
  IslandDialog,
} from '../components/island';
import { auth, can } from '../stores/auth';
import { computed, onMounted, ref, watch } from 'vue';
import { VDataTable, VDataTableServer } from 'vuetify/components';
import { useRoute, useRouter } from 'vue-router';
import { request, query } from '../lib/api';
import { messageOf, type RecordData } from '../lib/types';
import { useTask } from '../lib/useData';
import PageHeader from '../components/PageHeader.vue';
import Feedback from '../components/Feedback.vue';
import EmptyState from '../components/EmptyState.vue';
import TrendChart from '../components/TrendChart.vue';
const router = useRouter();
const route = useRoute(),
  { loading, error, refresh } = useTask(),
  items = ref<RecordData[]>([]),
  search = ref(''),
  detail = ref<RecordData | null>(null),
  tab = ref('homeworks'),
  page = ref(1),
  pageSize = ref(10),
  total = ref(0);
const people = ref<RecordData[]>([]),
  peopleError = ref(''),
  peopleLoading = ref(false),
  studentId = ref(String(route.query?.studentId || ''));
const staff = computed(() => auth.user?.role !== 'STUDENT');
const studentName = (id: string) => {
  const person = people.value.find((p) => p.id === id);
  return person?.name || person?.username || '学生姓名暂不可读取';
};
async function loadPeople() {
  if (!staff.value || !can('students')) return;
  peopleLoading.value = true;
  peopleError.value = '';
  try {
    people.value = (await request('/students')) || [];
  } catch (e) {
    peopleError.value = messageOf(e);
  } finally {
    peopleLoading.value = false;
  }
}
const isHistory = computed(() => route.path === '/history'),
  isStudent = computed(() => route.path === '/students'),
  isAudit = computed(() => route.path === '/admin/audit');
const headers = computed(() =>
  isStudent.value
    ? [
        { title: '姓名', key: 'name' },
        { title: '账号', key: 'username' },
        { title: '状态', key: 'status' },
        { title: '操作', key: 'actions', sortable: false },
      ]
    : isHistory.value
      ? [
          ...(staff.value ? [{ title: '学生', key: 'studentId', sortable: false }] : []),
          { title: '练习名称', key: 'name', sortable: false },
          { title: '日期', key: 'date', sortable: false },
          { title: '类型', key: 'type', sortable: false },
          { title: '答对 / 总题数', key: 'score', sortable: false },
          { title: '操作', key: 'actions', sortable: false },
        ]
      : isAudit.value
        ? [
            { title: '名称', key: 'name' },
            {
              title: '教师 / 学生',
              key: tab.value === 'homeworks' ? 'teacherName' : 'studentName',
            },
            { title: '日期', key: tab.value === 'homeworks' ? 'startDate' : 'date' },
            { title: '操作', key: 'actions', sortable: false },
          ]
        : [
            { title: '操作账号', key: 'username' },
            { title: '行为', key: 'action' },
            { title: '详情', key: 'details' },
            { title: '时间', key: 'timestamp' },
          ],
);
async function load() {
  await refresh(async () => {
    const path = isStudent.value
      ? '/students'
      : isHistory.value
        ? `/history?${query({ page: page.value, pageSize: pageSize.value, studentId: staff.value ? studentId.value : undefined, homeworkId: route.query?.homeworkId })}`
        : isAudit.value
          ? '/admin/' + tab.value
          : '/admin/logs';
    const data = await request(path);
    items.value = isHistory.value ? data.list : data || [];
    total.value = isHistory.value ? data.total : items.value.length;
  });
}
function displayAnswer(question: RecordData, value: string) {
  if (!value) return '未作答';
  if (value === 'true') return '正确';
  if (value === 'false') return '错误';
  return value
    .split(',')
    .map(
      (part) => question.options?.find((option: RecordData) => option.value === part)?.text || part,
    )
    .join('、');
}
async function view(item: RecordData) {
  if (isStudent.value) {
    await router.push('/students/' + encodeURIComponent(item.id));
  } else detail.value = item;
}
watch(page, load);
watch([pageSize, tab, studentId], () => {
  page.value = 1;
  load();
});
watch(
  () => [route.query?.studentId, route.query?.homeworkId],
  () => {
    studentId.value = String(route.query?.studentId || '');
    page.value = 1;
    load();
  },
);
onMounted(() => {
  load();
  if (isHistory.value) loadPeople();
});
</script>
<template>
  <PageHeader
    :description="
      staff && isHistory
        ? auth.user?.role === 'TEACHER'
          ? '查看你布置的作业提交记录；选择学生后，回顾该学生的学习记录。'
          : '查看平台学习记录，也可按学生筛选。'
        : undefined
    "
  >
    <IslandButton variant="outlined" prepend-icon="mdi-refresh" :loading="loading" @click="load">
      刷新记录
    </IslandButton>
  </PageHeader>
  <Feedback :error="error" @retry="load" />
  <template v-if="auth.user?.role === 'STUDENT' && isHistory">
    <Feedback :loading="loading" />
    <p class="muted mb-4">共 {{ total }} 次学习记录</p>
    <div v-if="items.length" class="student-records">
      <IslandCard v-for="item in items" :key="item.id" class="student-record-card">
        <div class="record-symbol">
          <v-icon
            :icon="item.type === 'homework' ? 'mdi-notebook-check-outline' : 'mdi-pencil-outline'"
            size="28"
          />
        </div>
        <div class="student-record-main">
          <IslandTag size="small">
            {{ item.type === 'homework' ? '家庭作业' : '自主练习' }}
          </IslandTag>
          <h2>{{ item.name }}</h2>
          <p class="muted">
            {{ item.date }} · 完成 {{ item.total || 0 }} 道题，答对 {{ item.correctCount || 0 }} 道
          </p>
        </div>
        <IslandButton variant="outlined" append-icon="mdi-chevron-right" @click="view(item)">
          查看详情
        </IslandButton>
      </IslandCard>
    </div>
    <IslandCard v-else-if="!loading && !error">
      <EmptyState
        title="还没有学习记录"
        description="完成并保存一次练习，就能在这里回顾。"
        icon="mdi-notebook-outline"
      />
    </IslandCard>
    <v-pagination
      v-if="total > pageSize"
      v-model="page"
      :length="Math.ceil(total / pageSize)"
      :total-visible="5"
      class="mt-5"
    />
  </template>
  <IslandCard v-else>
    <v-tabs v-if="isAudit" v-model="tab" color="primary">
      <v-tab value="homeworks">作业记录</v-tab>
      <v-tab value="practices">练习记录</v-tab>
    </v-tabs>
    <div class="toolbar">
      <IslandSelect
        v-if="isHistory && staff && can('students')"
        v-model="studentId"
        :items="people.map((p) => ({ title: p.name || p.username, value: p.id }))"
        label="筛选学生"
        clearable
        hide-details
        :loading="peopleLoading"
      />
      <IslandInput
        v-if="!isHistory"
        v-model="search"
        label="搜索记录"
        prepend-inner-icon="mdi-magnify"
        hide-details
        class="search-field"
      />
      <span class="muted">共 {{ total }} 条记录</span>
    </div>
    <v-alert v-if="peopleError" type="warning" variant="tonal" class="mx-4 mb-4">
      学生姓名暂时无法加载。
      <IslandButton variant="text" :loading="peopleLoading" @click="loadPeople">
        重试学生列表
      </IslandButton>
    </v-alert>
    <component
      :is="isHistory ? VDataTableServer : VDataTable"
      v-model:page="page"
      v-model:items-per-page="pageSize"
      :items="items"
      :headers="headers"
      :search="search"
      :loading="loading"
      :items-length="total"
      :items-per-page-options="[10, 20, 50]"
    >
      <template #item.name="{ item }">
        <span class="table-title">{{ item.name || item.username }}</span>
      </template>
      <template #item.studentId="{ item }">
        {{ item.studentName || studentName(item.studentId) }}
      </template>
      <template #item.status="{ item }">
        <IslandTag size="small" :color="item.status === 'active' ? 'success' : 'secondary'">
          {{
            item.status === 'active'
              ? '正常'
              : item.status === 'completed'
                ? '已完成'
                : item.status === 'pending'
                  ? '进行中'
                  : '停用'
          }}
        </IslandTag>
      </template>
      <template #item.type="{ item }">
        <IslandTag size="small" variant="tonal">
          {{ item.type === 'homework' ? '家庭作业' : '自主练习' }}
        </IslandTag>
      </template>
      <template #item.score="{ item }">
        {{ item.correctCount || 0 }} / {{ item.total || 0 }}
      </template>
      <template #item.actions="{ item }">
        <IslandButton variant="text" color="primary" size="small" @click="view(item)">
          {{ isStudent ? '成长档案' : '查看详情' }}
        </IslandButton>
      </template>
      <template #no-data>
        <EmptyState
          v-if="!loading && !error"
          title="暂无记录"
          description="有新的业务记录后，会自动呈现在这里。"
          icon="mdi-text-box-search-outline"
        />
      </template>
    </component>
  </IslandCard>
  <IslandDialog
    :model-value="!!detail"
    @update:model-value="detail = null"
    max-width="840"
    scrollable
  >
    <IslandCard
      v-if="detail"
      :title="
        detail.student
          ? `${detail.student.name || detail.student.username} · 成长档案`
          : detail.name || '记录详情'
      "
    >
      <v-card-text>
        <template v-if="detail.student">
          <div class="d-flex ga-3 mb-5">
            <IslandTag>账号：{{ detail.student.username }}</IslandTag>
            <IslandTag color="primary">
              {{ detail.student.status === 'active' ? '正常' : '停用' }}
            </IslandTag>
          </div>
          <h3>最近两周正确率</h3>
          <TrendChart
            v-if="detail.progress?.length"
            :points="detail.progress.map((p: RecordData) => ({ label: p.date, value: p.accuracy }))"
            label="正确率"
          />
          <h3 class="mt-4">作业完成情况</h3>
          <v-data-table
            :items="detail.homework || []"
            :headers="[
              { title: '作业', key: 'name' },
              { title: '状态', key: 'status' },
              { title: '正确率', key: 'accuracyRate' },
            ]"
            :items-per-page="5"
          />
          <h3 class="mt-5">最近学习记录</h3>
          <v-list>
            <v-list-item
              v-for="h in detail.history"
              :key="h.id"
              :title="h.name"
              :subtitle="`${h.date} · ${h.correctCount || 0}/${h.total}`"
            />
          </v-list>
        </template>
        <template v-else>
          <p class="muted mb-5">
            {{ detail.date || detail.startDate }} ·
            {{
              detail.studentName ||
              detail.teacherName ||
              (staff && detail.studentId ? studentName(detail.studentId) : '')
            }}
          </p>
          <template v-if="detail.results">
            <v-expansion-panels>
              <v-expansion-panel
                v-for="r in detail.results"
                :key="r.id"
                :title="`${r.studentName} · ${r.correctCount}/${r.total} · ${r.date}`"
              >
                <v-expansion-panel-text>
                  <div v-for="q in r.questions" :key="q.id" class="mb-3">
                    <h3>{{ q.stem }}</h3>
                    <p>作答：{{ q.userAnswer }} · 正确答案：{{ q.answer }}</p>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </template>
          <div v-for="(q, i) in detail.questions" :key="q.id" class="mb-5">
            <div class="d-flex ga-3 align-center">
              <v-icon
                :icon="
                  q.status === 'correct' ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'
                "
                :color="q.status === 'correct' ? 'success' : 'error'"
              />
              <h3>{{ Number(i) + 1 }}. {{ q.stem }}</h3>
            </div>
            <img v-if="q.stemImage" :src="q.stemImage" alt="题目图片" class="content-image mt-3" />
            <p class="mt-3">
              {{ staff ? '学生作答' : '你的答案' }}：{{ displayAnswer(q, q.userAnswer) }} ·
              正确答案：{{ displayAnswer(q, q.answer) }}
            </p>
            <p class="muted">尝试 {{ q.attempts || 1 }} 次</p>
            <v-divider class="mt-5" />
          </div>
          <EmptyState
            v-if="!detail.questions?.length && !detail.results?.length"
            title="暂无答题明细"
            description="学生提交题目作答后可在此查看。"
          />
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <IslandButton @click="detail = null">关闭</IslandButton>
      </v-card-actions>
    </IslandCard>
  </IslandDialog>
</template>

<style scoped>
.student-records {
  display: grid;
  gap: 16px;
}
.student-record-card {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 24px;
  background: var(--island-surface);
}
.record-symbol {
  width: 56px;
  height: 56px;
  background: var(--island-content);
  border-radius: 18px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: var(--island-heading);
}
.student-record-main {
  flex: 1;
  min-width: 0;
}
.student-record-main h2 {
  font-size: 19px;
  margin: 8px 0;
}
.student-record-main p {
  font-size: 14px;
  line-height: 1.7;
}
@media (max-width: 599px) {
  .student-record-card {
    padding: 20px;
    gap: 12px;
    flex-wrap: wrap;
  }
  .record-symbol {
    width: 44px;
    height: 44px;
  }
  .student-record-card > .island-button {
    margin-left: auto;
  }
  .student-record-main h2 {
    font-size: 18px;
  }
}
</style>
