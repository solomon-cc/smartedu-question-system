<script setup lang="ts">
import {
  IslandButton,
  IslandCard,
  IslandTag,
  IslandSelect,
  IslandAvatar,
  IslandProgress,
} from '../components/island';
import { computed, onMounted, ref, watch } from 'vue';
import { auth, can } from '../stores/auth';
import { useRoute } from 'vue-router';
import { request, query } from '../lib/api';
import { subjects, subjectLabel, messageOf, type RecordData } from '../lib/types';
import { useTask } from '../lib/useData';
import PageHeader from '../components/PageHeader.vue';
import IslandTitle from '../components/island/IslandTitle.vue';
import { subjectTone } from '../components/island/palette';
import Feedback from '../components/Feedback.vue';
import EmptyState from '../components/EmptyState.vue';
const route = useRoute(),
  { loading, error, run, refresh } = useTask(),
  items = ref<RecordData[]>([]),
  subject = ref('MATH'),
  grade = ref(1),
  topics = ref<RecordData[]>([]),
  grades = ref<RecordData[]>([]);
const students = ref<RecordData[]>([]),
  studentId = ref(String(route.query?.studentId || '')),
  studentsError = ref('');
const studentName = (id: string) => {
  const person = students.value.find((s) => s.id === id);
  return person?.name || person?.username || '学生姓名暂不可读取';
};
async function loadStudents() {
  if (student.value || !wrong.value || !can('students')) return;
  studentsError.value = '';
  try {
    students.value = (await request('/students')) || [];
  } catch (e) {
    studentsError.value = messageOf(e);
  }
}
const availableCount = computed(() =>
  Number(grades.value.find((g) => g.grade === grade.value)?.count || 0),
);
const gradeChoices = computed(() => {
  const choices = grades.value.filter((g) => Number(g.count) > 0);
  return choices.some((g) => g.grade === grade.value)
    ? choices
    : [{ grade: grade.value, count: 0 }, ...choices];
});
const homeworkFilter = ref('all');
const visibleItems = computed(() =>
  !homework.value || homeworkFilter.value === 'all'
    ? items.value
    : items.value.filter(
        (item) => (item.status === 'completed') === (homeworkFilter.value === 'completed'),
      ),
);
const subjectIcons: Record<string, string> = {
  MATH: 'mdi-shape-outline',
  LANGUAGE: 'mdi-chat-processing-outline',
  READING: 'mdi-book-open-page-variant-outline',
  LITERACY: 'mdi-ideogram-cjk-variant',
};
const student = computed(() => auth.user?.role === 'STUDENT');
const homework = computed(() => route.path === '/homework'),
  wrong = computed(() => route.path === '/wrong-book');
async function load() {
  await refresh(async () => {
    if (homework.value || wrong.value)
      items.value =
        (await request(
          homework.value
            ? '/homeworks'
            : '/wrong-book' +
                (student.value || !studentId.value
                  ? ''
                  : '?' + query({ studentId: studentId.value })),
        )) || [];
    else {
      [topics.value, grades.value] = await Promise.all([
        request('/skills'),
        request('/questions/stats/grades?subject=' + subject.value),
      ]);
      topics.value = (topics.value || []).filter(
        (t) => t.subject === subject.value || t.subject === subjectLabel(subject.value),
      );
      grades.value ||= [];
    }
  });
}
const statusLabels: Record<number, string> = {
  1: '出错',
  2: '重试（提示）',
  3: '重试',
  4: '已掌握',
  5: '需要帮助',
};
watch(subject, load);
watch(studentId, load);
onMounted(() => {
  load();
  loadStudents();
});
</script>
<template>
  <PageHeader>
    <IslandButton
      v-if="!student && homework && can('assignments')"
      to="/assign"
      color="primary"
      prepend-icon="mdi-clipboard-text-outline"
    >
      管理与布置作业
    </IslandButton>
  </PageHeader>
  <Feedback :error="error" :loading="loading" @retry="load" />
  <template v-if="!homework && !wrong">
    <section v-if="student" class="student-learning-picker">
      <div class="learning-subjects" role="group" aria-label="选择练习学科">
        <IslandButton
          v-for="s in subjects"
          :key="s.value"
          variant="text"
          class="learning-subject"
          :data-island-tone="subjectTone[s.value]"
          :class="{ chosen: subject === s.value }"
          :aria-pressed="subject === s.value"
          @click="subject = s.value"
        >
          <span class="subject-token"><v-icon :icon="subjectIcons[s.value]" size="38" /></span>
          <span class="subject-label">{{ s.title }}</span>
          <v-icon
            v-if="subject === s.value"
            icon="mdi-check-circle"
            class="subject-selected"
            size="22"
          />
        </IslandButton>
      </div>
      <IslandCard
        class="learning-launch island-tonal-surface"
        :data-island-tone="subjectTone[subject]"
      >
        <div>
          <IslandTitle level="h2" :tone="subjectTone[subject]">
            {{ subjectLabel(subject) }}练习
          </IslandTitle>
          <p>选好内容，开始一次小练习。</p>
        </div>
        <div class="learning-levels">
          <h3>选择年级</h3>
          <div class="level-buttons" role="group" aria-label="选择年级">
            <IslandButton
              v-for="g in gradeChoices"
              :key="g.grade"
              :variant="grade === g.grade ? 'flat' : 'outlined'"
              color="primary"
              :aria-pressed="grade === g.grade"
              @click="grade = g.grade"
            >
              {{ g.grade }} 年级
              <span class="level-count">{{ g.count }} 题</span>
            </IslandButton>
          </div>
        </div>
        <p v-if="!loading && !error && !availableCount" class="muted" role="status">
          当前学科和年级暂无题目，请选择其他内容或联系老师。
        </p>
        <IslandButton
          color="primary"
          size="large"
          append-icon="mdi-arrow-right"
          :disabled="loading || !!error || availableCount === 0"
          :to="availableCount > 0 ? '/practice?' + query({ subject, grade }) : undefined"
        >
          开始练习
        </IslandButton>
      </IslandCard>
    </section>
    <IslandCard v-else class="pa-6 mb-6">
      <h2 class="mb-5">{{ student ? '今天，想练习什么？' : '选择课堂练习内容' }}</h2>
      <div
        class="section-grid subject-options mb-6"
        style="grid-template-columns: repeat(auto-fit, minmax(120px, 1fr))"
      >
        <IslandButton
          v-for="s in subjects"
          :key="s.value"
          :variant="subject === s.value ? 'flat' : 'outlined'"
          color="primary"
          :height="student ? 104 : 58"
          :aria-pressed="subject === s.value"
          :prepend-icon="student ? subjectIcons[s.value] : undefined"
          @click="subject = s.value"
        >
          {{ s.title }}
        </IslandButton>
      </div>
      <div class="d-flex align-center ga-4 flex-wrap">
        <IslandSelect
          v-model="grade"
          :items="
            Array.from({ length: 12 }, (_, i) => ({
              title: `${i + 1} 年级（${grades.find((g) => g.grade === i + 1)?.count || 0} 题）`,
              value: i + 1,
            }))
          "
          label="选择年级"
          hide-details
          style="max-width: 350px"
        />
        <IslandButton
          color="primary"
          size="large"
          append-icon="mdi-arrow-right"
          :disabled="loading || !!error || availableCount === 0"
          :to="availableCount > 0 ? '/practice?' + query({ subject, grade }) : undefined"
        >
          {{ student ? '开始练习' : '预览课堂练习' }}
        </IslandButton>
      </div>
      <p v-if="!loading && !error && !availableCount" class="muted mt-4" role="status">
        当前学科和年级暂无题目，请选择其他内容或联系老师。
      </p>
    </IslandCard>
    <h2 class="mb-5">{{ student ? '按小目标练习' : '按教学目标练习' }}</h2>
    <div v-if="topics.filter((t) => t.grade === grade).length" class="section-grid">
      <IslandCard
        v-for="topic in topics.filter((t) => t.grade === grade)"
        :key="topic.id"
        class="pa-6"
      >
        <v-icon icon="mdi-bullseye-arrow" color="primary" size="30" />
        <h3 class="mt-4 mb-4">{{ topic.name }}</h3>
        <v-list density="comfortable">
          <v-list-item
            v-for="o in topic.objectives"
            :key="o.id"
            :title="o.name"
            :subtitle="o.target"
            :to="'/practice?' + query({ subject, grade, objectiveId: o.id })"
            append-icon="mdi-chevron-right"
            rounded="lg"
          />
        </v-list>
      </IslandCard>
    </div>
    <IslandCard v-else-if="!loading && !error">
      <EmptyState
        title="这个年级还没有教学目标"
        description="可以先按学科练习，教师添加目标后会显示在这里。"
        icon="mdi-bullseye-arrow"
      />
    </IslandCard>
  </template>
  <template v-else>
    <IslandCard v-if="!student && wrong && can('students')" class="mb-5">
      <div class="toolbar">
        <IslandSelect
          v-model="studentId"
          :items="students.map((s) => ({ title: s.name || s.username, value: s.id }))"
          label="筛选学生"
          clearable
          hide-details
        />
        <span class="muted">共 {{ items.length }} 条待巩固记录</span>
      </div>
      <v-alert v-if="studentsError" type="warning" variant="tonal" class="mx-4 mb-4">
        学生姓名暂时无法加载。
        <IslandButton variant="text" @click="loadStudents">重试学生列表</IslandButton>
      </v-alert>
    </IslandCard>
    <div
      v-if="student && homework && items.length"
      class="homework-tabs mb-5"
      role="group"
      aria-label="作业状态"
    >
      <IslandButton
        v-for="filter in [
          { id: 'all', label: '全部作业' },
          { id: 'pending', label: '待完成' },
          { id: 'completed', label: '已完成' },
        ]"
        :key="filter.id"
        :variant="homeworkFilter === filter.id ? 'flat' : 'outlined'"
        color="primary"
        :aria-pressed="homeworkFilter === filter.id"
        @click="homeworkFilter = filter.id"
      >
        {{ filter.label }}
      </IslandButton>
    </div>
    <div v-if="visibleItems.length" class="section-grid">
      <IslandCard v-for="item in visibleItems" :key="item.id" class="pa-6">
        <div class="d-flex align-center justify-space-between mb-5">
          <IslandAvatar color="surface-variant" rounded="lg">
            <v-icon
              :icon="homework ? 'mdi-notebook-outline' : 'mdi-book-alert-outline'"
              color="primary"
            />
          </IslandAvatar>
          <IslandTag
            size="small"
            :color="item.status === 'completed' || item.status === 4 ? 'success' : 'secondary'"
          >
            {{
              homework
                ? item.status === 'completed'
                  ? '已完成'
                  : student
                    ? '待练习'
                    : '进行中'
                : statusLabels[item.status] || '待复习'
            }}
          </IslandTag>
        </div>
        <h3>{{ homework ? item.name : item.question?.stemText || item.stemText }}</h3>
        <p v-if="!student && wrong" class="muted mt-2">
          {{ item.studentName || studentName(item.studentId) }}
        </p>
        <img
          v-if="item.question?.stemImage"
          :src="item.question.stemImage"
          class="content-image mt-4"
          alt="题目图片"
        />
        <p class="muted mt-3 mb-6">
          {{
            homework ? `截止日期：${item.endDate || '不限'}` : `累计出错 ${item.errorCount || 1} 次`
          }}
        </p>
        <div v-if="!student && homework" class="mb-5">
          <p class="muted">已提交 {{ item.completed || 0 }} / {{ item.total || 0 }} 人</p>
          <IslandProgress
            :model-value="item.total ? (item.completed / item.total) * 100 : 0"
            height="6"
            rounded
            class="mt-2"
            color="primary"
            aria-label="作业提交进度"
          />
        </div>
        <IslandButton
          v-if="!student && homework && can('skills_history')"
          :to="'/history?' + query({ homeworkId: item.id })"
          variant="tonal"
          color="primary"
          append-icon="mdi-chevron-right"
        >
          查看提交记录
        </IslandButton>
        <IslandButton
          v-if="student || !homework"
          :to="
            '/practice?' +
            query(
              homework
                ? { homeworkId: item.id }
                : {
                    questionId: item.questionId || item.question?.id || item.id,
                    mode: 'wrongbook',
                  },
            )
          "
          color="primary"
          :variant="item.status === 'completed' ? 'tonal' : 'flat'"
          append-icon="mdi-arrow-right"
        >
          {{
            !student
              ? '预览题目'
              : homework
                ? item.status === 'completed'
                  ? '再次练习'
                  : '开始作业'
                : '再练一次'
          }}
        </IslandButton>
      </IslandCard>
    </div>
    <IslandCard v-else-if="!loading && !error && items.length">
      <EmptyState
        :title="homeworkFilter === 'completed' ? '还没有已完成的作业' : '没有待完成的作业'"
        description="可以切换查看全部作业。"
        icon="mdi-notebook-check-outline"
      />
    </IslandCard>
    <IslandCard v-else-if="!loading && !error">
      <EmptyState
        :title="
          homework
            ? student
              ? '暂时没有待完成的作业'
              : '还没有布置作业'
            : student
              ? '错题本还是空的'
              : '还没有学生错题记录'
        "
        :description="
          homework
            ? student
              ? '老师布置作业后，会显示在这里。也可以去开始自主练习。'
              : '在作业管理中选择试卷和学生，安排学习任务。'
            : '完成练习后，需要巩固的题目会自动收集到这里。'
        "
        :icon="homework ? 'mdi-notebook-check-outline' : 'mdi-book-check-outline'"
      >
        <IslandButton
          v-if="student && can('skills_practice')"
          color="primary"
          variant="tonal"
          to="/skills"
        >
          去练习
        </IslandButton>
      </EmptyState>
    </IslandCard>
  </template>
</template>

<style scoped>
.homework-tabs {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.subject-options :deep(.island-button .v-btn__content) {
  font-size: 18px;
}
.subject-options :deep(.island-button .v-btn__prepend) {
  margin-right: 12px;
  font-size: 28px;
}
@media (max-width: 599px) {
  .subject-options {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
  }
  .subject-options :deep(.island-button) {
    min-width: 0;
    padding: 12px !important;
  }
  .subject-options :deep(.island-button .v-btn__prepend) {
    margin: 0 0 8px;
  }
  .subject-options :deep(.island-button) {
    flex-direction: column;
  }
  .subject-options :deep(.island-button .v-btn__content) {
    font-size: 15px;
  }
  .homework-tabs {
    gap: 8px;
  }
  .homework-tabs > .island-button {
    flex: 1;
    min-width: 0;
    padding: 0 12px;
  }
  .d-flex:has(> .island-select) {
    align-items: stretch !important;
  }
  .d-flex > .island-select {
    flex-basis: 100%;
    max-width: none !important;
  }
}
</style>
