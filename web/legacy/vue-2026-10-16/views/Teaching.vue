<script setup lang="ts">
import { optionLabel } from '../lib/options';
import { validateForm } from '../lib/forms';
import { computed, onMounted, ref } from 'vue';
import EditorDialog from '../components/EditorDialog.vue';
import { focusFormAlert } from '../lib/forms';
import { can } from '../stores/auth';
import { useRoute } from 'vue-router';
import { request, allQuestions } from '../lib/api';
import {
  subjectLabel,
  required,
  localDate,
  messageOf,
  type RecordData,
  type Question,
  type User,
} from '../lib/types';
import { useTask } from '../lib/useData';
import PageHeader from '../components/PageHeader.vue';
import Feedback from '../components/Feedback.vue';
import EmptyState from '../components/EmptyState.vue';
const route = useRoute(),
  isPaper = computed(() => route.path === '/papers'),
  { loading, error, success, run } = useTask();
const items = ref<RecordData[]>([]),
  papers = ref<RecordData[]>([]),
  students = ref<User[]>([]),
  questions = ref<Question[]>([]),
  search = ref(''),
  questionSearch = ref(''),
  dialog = ref(false),
  selected = ref<RecordData | null>(null),
  preview = ref<RecordData | null>(null),
  deleting = ref<RecordData | null>(null),
  formError = ref(''),
  saving = ref(false),
  choicesLoading = ref(false),
  detailLoading = ref(false),
  detailError = ref(''),
  detailPage = ref(1),
  detailTotal = ref(0),
  baseline = ref('');
let detailRequest = 0;
const form = ref({
  name: '',
  questionIds: [] as string[],
  paperId: '',
  studentIds: [] as string[],
  startDate: localDate(),
  endDate: localDate(),
  repeatInterval: 'none',
  classId: '',
});
const dirty = computed(() => JSON.stringify(form.value) !== baseline.value);
const paperLocked = computed(() => isPaper.value && Number(selected.value?.assignedCount) > 0);
const headers = computed(() =>
  isPaper.value
    ? [
        { title: '试卷名称', key: 'name' },
        { title: '题目数', key: 'total' },
        { title: '布置次数', key: 'assignedCount' },
        { title: '操作', key: 'actions', sortable: false },
      ]
    : [
        { title: '作业名称', key: 'name' },
        { title: '开始日期', key: 'startDate' },
        { title: '截止日期', key: 'endDate' },
        { title: '提交进度', key: 'progress' },
        { title: '状态', key: 'status' },
        { title: '操作', key: 'actions', sortable: false },
      ],
);
async function load() {
  await run(async () => {
    items.value = (await request(isPaper.value ? '/papers' : '/homeworks')) || [];
  });
}
async function edit(item?: RecordData) {
  selected.value = item || null;
  form.value = {
    name: item?.name || '',
    questionIds: item?.questions?.map((q: Question) => q.id) || [],
    paperId: '',
    studentIds: [],
    startDate: localDate(),
    endDate: localDate(),
    repeatInterval: 'none',
    classId: '',
  };
  formError.value = '';
  questionSearch.value = '';
  baseline.value = JSON.stringify(form.value);
  dialog.value = true;
  choicesLoading.value = true;
  try {
    if (isPaper.value) {
      const current = paperLocked.value ? [] : await allQuestions();
      const saved: Question[] = item?.questions || [];
      questions.value = [...saved, ...current.filter((q) => !saved.some((s) => s.id === q.id))];
    } else
      [papers.value, students.value] = await Promise.all([
        request('/papers'),
        request('/students'),
      ]);
  } catch (e) {
    formError.value = messageOf(e);
  } finally {
    choicesLoading.value = false;
  }
}
async function save(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event)) || saving.value) return;
  formError.value = '';
  if (isPaper.value && !form.value.questionIds.length) {
    formError.value = '请至少选择一道题目';
    await focusFormAlert(event);
    return;
  }
  if (!isPaper.value && form.value.endDate < form.value.startDate) {
    formError.value = '截止日期不能早于开始日期';
    return;
  }
  saving.value = true;
  try {
    await request(
      isPaper.value
        ? `/papers${selected.value ? '/' + selected.value.id : ''}`
        : '/homeworks/assign',
      isPaper.value && selected.value ? 'PUT' : 'POST',
      form.value,
    );
    dialog.value = false;
    await load();
    success.value = isPaper.value ? '试卷已保存' : '作业已布置';
  } catch (e) {
    formError.value = messageOf(e);
    await focusFormAlert(event);
  } finally {
    saving.value = false;
  }
}
async function remove() {
  if (!deleting.value) return;
  const id = deleting.value.id;
  deleting.value = null;
  await run(async () => {
    await request('/papers/' + id, 'DELETE');
    items.value = items.value.filter((x) => x.id !== id);
  }, '试卷已删除');
}
async function detail(item: RecordData, pageNumber = 1) {
  preview.value = item;
  detailPage.value = pageNumber;
  detailError.value = '';
  if (isPaper.value) return;
  const id = ++detailRequest;
  detailLoading.value = true;
  try {
    const [data, people] = await Promise.all([
      request(`/history?homeworkId=${encodeURIComponent(item.id)}&page=${pageNumber}&pageSize=10`),
      can('students') ? request('/students') : Promise.resolve([]),
    ]);
    if (id !== detailRequest || preview.value?.id !== item.id) return;
    students.value = people || [];
    detailTotal.value = data.total;
    preview.value = { ...item, submissions: data.list };
  } catch (e) {
    if (id === detailRequest) detailError.value = messageOf(e);
  } finally {
    if (id === detailRequest) detailLoading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <PageHeader>
    <v-btn color="primary" prepend-icon="mdi-plus" @click="edit()">
      {{ isPaper ? '创建试卷' : '布置作业' }}
    </v-btn>
  </PageHeader>
  <Feedback :error="error" @retry="load" />
  <v-card>
    <div class="panel-header">
      <div>
        <h2>
          {{ isPaper ? '试卷库' : '教学任务' }}
          <v-chip class="ml-2" size="x-small">{{ items.length }}</v-chip>
        </h2>
        <p>{{ isPaper ? '从题库选题，自由组织教学内容' : '从布置到提交，掌握作业进度' }}</p>
      </div>
      <v-btn icon="mdi-refresh" variant="text" aria-label="刷新列表" @click="load" />
    </div>
    <div class="toolbar">
      <v-text-field
        v-model="search"
        :label="isPaper ? '搜索试卷' : '搜索作业'"
        prepend-inner-icon="mdi-magnify"
        hide-details
        class="search-field"
      />
    </div>
    <v-data-table :items="items" :headers="headers" :search="search" :loading="loading">
      <template #item.name="{ item }">
        <span class="table-title">{{ item.name }}</span>
      </template>
      <template #item.progress="{ item }">
        <div style="min-width: 100px">
          <span class="text-caption">{{ item.completed }} / {{ item.total }} 人</span>
          <v-progress-linear
            :model-value="item.total ? (item.completed / item.total) * 100 : 0"
            color="primary"
            rounded
            height="5"
            class="mt-1"
          />
        </div>
      </template>
      <template #item.status="{ item }">
        <v-chip
          size="small"
          :color="item.status === 'completed' ? 'success' : 'secondary'"
          variant="tonal"
        >
          {{ item.status === 'completed' ? '已完成' : '进行中' }}
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" color="primary" @click="detail(item)">查看详情</v-btn>
        <template v-if="isPaper">
          <v-btn
            size="small"
            icon="mdi-pencil-outline"
            variant="text"
            :aria-label="`编辑 ${item.name}`"
            @click="edit(item)"
          />
          <v-btn
            size="small"
            icon="mdi-trash-can-outline"
            color="error"
            variant="text"
            :aria-label="`删除 ${item.name}`"
            @click="deleting = item"
          />
        </template>
      </template>
      <template #no-data>
        <EmptyState
          v-if="!loading && !error"
          :title="search ? '没有匹配的记录' : isPaper ? '还没有创建试卷' : '还没有布置作业'"
          :description="
            isPaper
              ? '从题库选择题目，创建适合学生的练习。'
              : '选择试卷与学生，安排下一次学习任务。'
          "
          icon="mdi-clipboard-text-outline"
        >
          <v-btn variant="tonal" color="primary" @click="edit()">
            {{ isPaper ? '创建试卷' : '布置作业' }}
          </v-btn>
        </EmptyState>
      </template>
    </v-data-table>
  </v-card>
  <EditorDialog v-model="dialog" :dirty="dirty" :saving="saving" max-width="800" v-slot="{ close }">
    <v-card :title="isPaper ? (selected ? '编辑试卷' : '创建试卷') : '布置作业'">
      <v-form @submit.prevent="save" class="overflow-y-auto">
        <v-card-text>
          <v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            class="mb-5"
            data-form-error
            tabindex="-1"
          >
            {{ formError }}
          </v-alert>
          <v-text-field
            v-model="form.name"
            :label="isPaper ? '试卷名称' : '作业名称'"
            :rules="[required]"
          />
          <v-progress-linear v-if="choicesLoading" indeterminate />
          <template v-if="isPaper">
            <v-alert v-if="paperLocked" type="info" variant="tonal" class="mb-4">
              此试卷已用于作业，题目内容已锁定，仅可修改名称。如需调整题目，请创建新试卷。
            </v-alert>
            <p class="form-note">
              {{
                paperLocked
                  ? '以下为布置时保存的题目副本。'
                  : '从题库勾选题目，保存时会保留当前题目副本。'
              }}
              共 {{ form.questionIds.length }} 道。
            </p>
            <v-text-field
              v-model="questionSearch"
              label="筛选题目"
              prepend-inner-icon="mdi-magnify"
              hide-details
              class="mb-3"
            />
            <v-data-table
              v-model="form.questionIds"
              :show-select="!paperLocked"
              :items="questions"
              :search="questionSearch"
              item-value="id"
              :headers="[
                { title: '题目', key: 'stemText' },
                { title: '学科', key: 'subject' },
                { title: '年级', key: 'grade' },
              ]"
              :items-per-page="5"
              :items-per-page-options="[5, 10, 20]"
            >
              <template #item.subject="{ item }">{{ subjectLabel(item.subject) }}</template>
            </v-data-table>
          </template>
          <template v-else>
            <v-autocomplete
              v-model="form.paperId"
              :items="papers"
              item-title="name"
              item-value="id"
              label="选择试卷"
              :rules="[required]"
            />
            <v-autocomplete
              v-model="form.studentIds"
              :items="
                students.map((s) => ({
                  title: `${s.name || s.username}（${s.username}）`,
                  value: s.id,
                }))
              "
              label="选择学生"
              multiple
              chips
              closable-chips
              :rules="[required]"
            />
            <div class="dialog-form-grid">
              <v-text-field
                v-model="form.startDate"
                label="开始日期"
                type="date"
                :rules="[required]"
              />
              <v-text-field
                v-model="form.endDate"
                label="截止日期"
                type="date"
                :min="form.startDate"
                :rules="[required, (v) => v >= form.startDate || '截止日期不能早于开始日期']"
              />
              <v-select
                v-model="form.repeatInterval"
                label="重复布置"
                :items="[
                  { title: '不重复', value: 'none' },
                  { title: '每天', value: 'daily' },
                  { title: '每 3 天', value: '3days' },
                  { title: '每周', value: 'weekly' },
                  { title: '每月', value: 'monthly' },
                ]"
              />
              <v-text-field v-model="form.classId" label="班级标识（选填）" />
            </div>
          </template>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn :disabled="saving" @click="close">取消</v-btn>
          <v-btn
            type="submit"
            color="primary"
            variant="flat"
            :disabled="choicesLoading"
            :loading="saving"
          >
            {{ isPaper ? '保存试卷' : '确认布置' }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </EditorDialog>
  <v-dialog :model-value="!!preview" @update:model-value="preview = null" scrollable>
    <v-card v-if="preview" :title="preview.name">
      <v-card-text>
        <template v-if="isPaper">
          <div v-for="(q, i) in preview.questions" :key="q.id" class="mb-5">
            <h3>{{ Number(i) + 1 }}. {{ q.stemText }}</h3>
            <img v-if="q.stemImage" :src="q.stemImage" class="content-image" alt="题目图片" />
            <p v-for="o in q.options" :key="o.value" class="mt-2">{{ optionLabel(o) }}</p>
            <p class="text-primary mt-3">答案：{{ q.answer }}</p>
            <v-divider class="mt-5" />
          </div>
        </template>
        <template v-else>
          <p class="mb-4">
            {{ preview.startDate }} 至 {{ preview.endDate }} · {{ preview.completed }} /
            {{ preview.total }} 人提交
          </p>
          <v-progress-linear v-if="detailLoading" indeterminate aria-label="正在加载提交记录" />
          <v-alert v-else-if="detailError" type="error" variant="tonal">
            {{ detailError }}
            <v-btn variant="text" @click="detail(preview, detailPage)">重试</v-btn>
          </v-alert>
          <v-list v-else-if="preview.submissions?.length">
            <v-list-item
              v-for="h in preview.submissions"
              :key="h.id"
              :title="`${students.find((s) => s.id === h.studentId)?.name || '学生记录'} · ${h.correctCount}/${h.total}`"
              :subtitle="h.date"
            />
          </v-list>
          <EmptyState
            v-else
            title="暂无提交记录"
            description="学生完成作业后，提交记录会出现在这里。"
          />
          <v-pagination
            v-if="detailTotal > 10"
            :model-value="detailPage"
            :length="Math.ceil(detailTotal / 10)"
            @update:model-value="detail(preview, $event)"
            aria-label="提交记录分页"
          />
        </template>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="preview = null">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog :model-value="!!deleting" @update:model-value="deleting = null" max-width="430">
    <v-card title="确认删除试卷？">
      <v-card-text>请确认「{{ deleting?.name }}」不再被教学任务使用。此操作无法撤销。</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="deleting = null">取消</v-btn>
        <v-btn color="error" @click="remove">确认删除</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-snackbar :model-value="!!success" @update:model-value="success = ''">{{ success }}</v-snackbar>
</template>
