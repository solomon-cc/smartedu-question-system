<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { IconPlus, IconArrowRight } from '@arco-design/web-vue/es/icon';
import { useRouter } from 'vue-router';
import { api, message, query } from '../lib/api';
import { auth, manageQuestions, type User } from '../lib/auth';
import { moduleName, type AssessmentSummary } from '../lib/assessments';
import AssessmentIntro from '../components/AssessmentIntro.vue';
import PageState from '../components/PageState.vue';
const router = useRouter(),
  students = ref<User[]>([]),
  records = ref<AssessmentSummary[]>([]),
  loading = ref(true),
  error = ref(''),
  student = ref(''),
  status = ref(''),
  dialog = ref(false),
  saving = ref(false),
  formError = ref('');
const form = ref({ studentId: '', module: 'D' });
const supported = computed(() =>
  ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'].includes(auth.user?.role || ''),
);
const visible = computed(() =>
  records.value.filter(
    (r) =>
      (!student.value || r.studentId === student.value) &&
      (!status.value || r.status === status.value),
  ),
);
const ongoing = computed(() => records.value.filter((r) => r.status === 'ongoing').length);
let generation = 0;
async function load() {
  const seq = ++generation;
  if (!auth.user || !supported.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const [s, r] = await Promise.all([
      api<User[]>('/portal/assessment-students'),
      api<AssessmentSummary[]>('/portal/assessments'),
    ]);
    if (seq !== generation) return;
    students.value = s;
    records.value = r;
  } catch (e) {
    if (seq === generation) error.value = message(e);
  } finally {
    if (seq === generation) loading.value = false;
  }
}
async function create() {
  if (saving.value) return;
  if (!form.value.studentId) {
    formError.value = '请选择学生';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    const r = await api<AssessmentSummary>('/portal/assessments/peak/records', 'POST', form.value);
    dialog.value = false;
    await router.push('/assessment/peak/' + r.id);
  } catch (e) {
    formError.value = message(e);
  } finally {
    saving.value = false;
  }
}
watch(() => auth.user?.id, load);
onMounted(load);
</script>
<template>
  <AssessmentIntro v-if="!auth.user" />
  <section v-else class="container section assessment-center">
    <div class="page-heading">
      <div>
        <h1>评估中心</h1>
      </div>
      <a-button
        v-if="manageQuestions"
        size="large"
        type="primary"
        @click="
          form = { studentId: student, module: 'D' };
          formError = '';
          dialog = true;
        "
      >
        <IconPlus />
        安排评估
      </a-button>
    </div>
    <a-alert v-if="!supported">
      此账号用于培训课程。评估功能面向老师、管理员、学生及已关联学生的家长开放。
    </a-alert>
    <template v-else>
      <div class="assessment-counts" v-if="!loading && !error && records.length">
        <span>
          <strong>{{ records.length }}</strong>
          评估记录
        </span>
        <span>
          <strong>{{ ongoing }}</strong>
          进行中
        </span>
        <span>
          <strong>{{ records.length - ongoing }}</strong>
          已完成
        </span>
      </div>
      <div class="assessment-filters">
        <label v-if="manageQuestions || auth.user.role === 'PARENT'">
          {{ auth.user.role === 'PARENT' ? '孩子' : '学生' }}
          <select v-model="student" aria-label="筛选学生">
            <option value="">全部</option>
            <option v-for="s in students" :key="s.id" :value="s.id">
              {{ s.name || s.username }}
            </option>
          </select>
        </label>
        <label>
          状态
          <select v-model="status" aria-label="筛选评估状态">
            <option value="">全部状态</option>
            <option value="ongoing">进行中</option>
            <option value="completed">已完成</option>
          </select>
        </label>
      </div>
      <PageState
        :loading="loading"
        :error="error"
        :empty="!visible.length"
        :title="
          auth.user.role === 'PARENT' && !students.length ? '尚未关联学生' : '暂无符合条件的评估'
        "
        :description="
          auth.user.role === 'PARENT' && !students.length
            ? '请联系管理员，将您的家长账号与孩子的学生账号关联。'
            : manageQuestions
              ? '点击“安排评估”，选择学生和评估模块。'
              : '老师安排评估后会显示在这里。'
        "
        @retry="load"
      />
      <div v-if="!loading && !error" class="assessment-records">
        <article v-for="r in visible" :key="r.methodId + r.id">
          <div class="assessment-record-head">
            <div>
              <span class="caps-label">{{ r.studentName }}</span>
              <h2>{{ r.methodName }} · {{ moduleName(r.module) }}</h2>
              <p>{{ r.date }}</p>
            </div>
            <a-tag :color="r.status === 'completed' ? 'green' : 'gray'">
              {{ r.status === 'completed' ? '已完成' : '进行中' }}
            </a-tag>
          </div>
          <div class="record-progress">
            <span>已记录 {{ r.recorded }} / {{ r.total }} 项</span>
            <a-progress :percent="r.total ? r.recorded / r.total : 0" :show-text="false" />
          </div>
          <router-link :to="'/assessment/' + r.methodId + '/' + r.id" class="text-link">
            {{
              r.status === 'ongoing' && manageQuestions
                ? '继续评估'
                : r.status === 'completed'
                  ? '查看报告与练习'
                  : '查看评估进度'
            }}
            <IconArrowRight />
          </router-link>
        </article>
      </div>
    </template>
  </section>
  <a-modal
    :visible="dialog"
    title="安排学生评估"
    :footer="false"
    :mask-closable="false"
    :closable="!saving"
    @cancel="dialog = false"
  >
    <form class="dialog-form" @submit.prevent="create">
      <a-alert v-if="formError" type="error">{{ formError }}</a-alert>
      <label>
        学生
        <select v-model="form.studentId" required aria-label="评估学生">
          <option value="" disabled>请选择学生</option>
          <option v-for="s in students" :value="s.id" :key="s.id">
            {{ s.name || s.username }}
          </option>
        </select>
      </label>
      <label>
        评估方法
        <input value="PEAK 预评估" readonly />
      </label>
      <label>
        评估模块
        <select v-model="form.module" aria-label="评估模块">
          <option value="D">直接训练（D） · 64 项</option>
          <option value="G">泛化（G） · 64 项</option>
        </select>
      </label>
      <p class="muted">由老师逐项施测并记录反应。未评项目单独保留，完成全部项目后复核提交。</p>
      <div class="dialog-actions">
        <a-button :disabled="saving" @click="dialog = false">取消</a-button>
        <a-button type="primary" html-type="submit" :loading="saving">创建评估</a-button>
      </div>
    </form>
  </a-modal>
</template>
<style scoped>
.assessment-counts {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  font-size: 14px;
}
.assessment-counts span {
  display: flex;
  align-items: baseline;
  gap: 12px;
  color: var(--muted);
}
.assessment-counts strong {
  font-size: 16px;
  color: var(--ink);
}
.assessment-filters {
  display: flex;
  gap: 20px;
  margin-bottom: 28px;
}
.assessment-filters label {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
}
select,
input {
  border: 1px solid var(--line);
  border-radius: 6px;
  background: white;
  color: var(--ink);
  padding: 10px 12px;
  min-height: 44px;
}
.assessment-filters select {
  min-width: 160px;
}
.assessment-records {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.assessment-records article {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 28px;
}
.assessment-record-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.assessment-record-head h2 {
  font-size: 20px;
  margin: 10px 0;
}
.assessment-record-head p {
  color: var(--muted);
  font-size: 14px;
}
.record-progress {
  margin: 24px 0;
}
.record-progress span {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--muted);
}
.dialog-form label {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
}
.assessment-center h1 {
  font-size: 32px;
}
@media (max-width: 800px) {
  .assessment-records {
    grid-template-columns: 1fr;
  }
  .assessment-center h1 {
    font-size: 26px;
  }
}
@media (max-width: 540px) {
  .assessment-counts {
    gap: 20px;
  }
  .assessment-counts span {
    display: grid;
    gap: 2px;
  }
  .assessment-filters {
    flex-wrap: wrap;
  }
  .assessment-records article {
    padding: 20px;
  }
}
</style>
