<script setup lang="ts">
import { useRoute } from 'vue-router';
import { optionLabel } from '../lib/options';
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import EditorDialog from '../components/EditorDialog.vue';
import { editableOptions } from '../lib/questionEditor';
import { validateForm, focusFormAlert } from '../lib/forms';
import { request, query } from '../lib/api';
import {
  subjects,
  questionTypes,
  subjectLabel,
  typeLabel,
  required,
  messageOf,
  type Question,
  type Page,
} from '../lib/types';
import PageHeader from '../components/PageHeader.vue';
import Feedback from '../components/Feedback.vue';
import EmptyState from '../components/EmptyState.vue';
const route = useRoute();
const topics = ref<any[]>([]),
  goalsLoading = ref(false),
  goalsError = ref(''),
  baseline = ref('');
const imageOptions = ref<string[]>([]);
const items = ref<Question[]>([]),
  total = ref(0),
  page = ref(1),
  pageSize = ref(10),
  search = ref(''),
  subject = ref<string | null>(null),
  grade = ref<number | null>(null),
  loading = ref(false),
  error = ref(''),
  notice = ref('');
const dialog = ref(false),
  saving = ref(false),
  formError = ref(''),
  selected = ref<Question | null>(null),
  remove = ref<Question | null>(null),
  preview = ref<Question | null>(null),
  importOpen = ref(false),
  importRows = ref<Partial<Question>[]>([]),
  importError = ref(''),
  importBusy = ref(false),
  templateBusy = ref(false),
  templateReady = ref(false);
const blank = () => ({
  id: '',
  stemText: '',
  subject: 'MATH',
  grade: 1,
  type: 'MULTIPLE_CHOICE',
  answer: '',
  stemImage: '',
  hint: '',
  objectiveId: String(route?.query.objectiveId || ''),
  options: [
    { value: 'A', text: '', image: '' },
    { value: 'B', text: '', image: '' },
    { value: 'C', text: '', image: '' },
    { value: 'D', text: '', image: '' },
  ],
});
const form = ref(blank()),
  selectedAnswers = ref<string[]>([]);
const dirty = computed(
  () => JSON.stringify([form.value, selectedAnswers.value]) !== baseline.value,
);
const goalOptions = computed(() => {
  const options = topics.value.flatMap((t) =>
    (t.objectives || []).map((o: any) => ({
      title: `${o.name} · ${t.name} · ${t.grade} 年级`,
      value: o.id,
    })),
  );
  if (form.value.objectiveId && !options.some((o) => o.value === form.value.objectiveId))
    options.push({ title: '已关联的教学目标（当前不可读取）', value: form.value.objectiveId });
  return options;
});
const headers = [
  { title: '题目内容', key: 'stemText', sortable: false },
  { title: '学科', key: 'subject', sortable: false },
  { title: '年级', key: 'grade', sortable: false },
  { title: '题型', key: 'type', sortable: false },
  { title: '操作', key: 'actions', sortable: false, width: 152 },
];
let requestId = 0,
  debounce: ReturnType<typeof setTimeout>;
async function load() {
  const id = ++requestId;
  loading.value = true;
  error.value = '';
  try {
    const data = await request<Page<Question>>(
      `/questions?${query({ objectiveId: route?.query.objectiveId, page: page.value, pageSize: pageSize.value, search: search.value.trim(), subject: subject.value, grade: grade.value })}`,
    );
    if (id === requestId) {
      items.value = data.list;
      total.value = data.total;
    }
  } catch (e) {
    if (id === requestId) error.value = messageOf(e);
  } finally {
    if (id === requestId) loading.value = false;
  }
}
watch([subject, grade, pageSize], () => {
  page.value = 1;
  load();
});
watch(page, load);
watch(
  () => route?.query.objectiveId,
  () => {
    page.value = 1;
    load();
  },
);
watch(search, () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    page.value = 1;
    load();
  }, 300);
});
async function edit(item?: Question) {
  selected.value = item || null;
  form.value = item ? { ...blank(), ...JSON.parse(JSON.stringify(item)) } : blank();
  form.value.options = editableOptions(item).map((o) => ({
    ...o,
    text: o.text || '',
    image: o.image || '',
  }));
  selectedAnswers.value = form.value.answer.split(',').filter(Boolean);
  imageOptions.value = [];
  baseline.value = JSON.stringify([form.value, selectedAnswers.value]);
  formError.value = '';
  dialog.value = true;
  goalsLoading.value = true;
  goalsError.value = '';
  try {
    topics.value = (await request('/skills')) || [];
  } catch {
    goalsError.value = '暂时无法读取教学目标，可稍后重试；已有关联会保留。';
  } finally {
    goalsLoading.value = false;
  }
}
async function save(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event)) || saving.value) return;
  saving.value = true;
  formError.value = '';
  try {
    const data = {
      ...form.value,
      answer:
        form.value.type === 'MULTIPLE_SELECT'
          ? selectedAnswers.value.sort().join(',')
          : form.value.answer,
    };
    if (!data.answer.trim()) throw new Error('请设置正确答案');
    if (['MULTIPLE_CHOICE', 'MULTIPLE_SELECT'].includes(data.type)) {
      data.options = data.options.filter((o) => o.text.trim() || o.image);
      if (data.options.length < 2) throw new Error('选择题至少需要两个有效选项');
      if (data.answer.split(',').some((a) => !data.options.some((o) => o.value === a)))
        throw new Error('正确答案必须对应一个有效选项');
    } else data.options = [];
    await request(
      `/questions${selected.value ? '/' + selected.value.id : ''}`,
      selected.value ? 'PUT' : 'POST',
      data,
    );
    dialog.value = false;
    notice.value = selected.value ? '题目已更新' : '题目已创建';
    await load();
  } catch (e) {
    formError.value = messageOf(e);
    await focusFormAlert(event);
  } finally {
    saving.value = false;
  }
}
async function deleteItem() {
  if (!remove.value) return;
  saving.value = true;
  try {
    await request(`/questions/${remove.value.id}`, 'DELETE');
    remove.value = null;
    if (items.value.length === 1 && page.value > 1) page.value--;
    await load();
    notice.value = '题目已删除';
  } catch (e) {
    error.value = messageOf(e);
    remove.value = null;
  } finally {
    saving.value = false;
  }
}
async function imageFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  ) {
    formError.value = '请选择不超过 5 MB 的 PNG、JPEG 或 WebP 图片';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => (form.value.stemImage = String(reader.result));
  reader.readAsDataURL(file);
}
async function readImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  importError.value = '';
  importRows.value = [];
  if (!file) return;
  importBusy.value = true;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('文件不能超过 10 MB');
    const { Workbook } = await import('exceljs');
    const book = new Workbook();
    await book.xlsx.load(await file.arrayBuffer());
    const sheet = book.worksheets[0];
    if (!sheet) throw new Error('文件中没有工作表');
    const rows: Partial<Question>[] = [];
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      const cell = (n: number) => String(row.getCell(n).text || '').trim();
      if (!cell(1)) return;
      const subj = subjects.find((s) => s.title === cell(2) || s.value === cell(2))?.value;
      const type = questionTypes.find((t) => t.title === cell(4) || t.value === cell(4))?.value;
      const g = Number(cell(3));
      if (!subj || !type || !Number.isInteger(g) || g < 1 || g > 12 || !cell(5))
        throw new Error(`第 ${index} 行：请检查学科、年级、题型和答案`);
      const options = ['A', 'B', 'C', 'D']
        .map((value, i) => ({ value, text: cell(i + 6) }))
        .filter((o) => o.text);
      if (
        type.startsWith('MULTIPLE') &&
        (options.length < 2 ||
          cell(5)
            .split(',')
            .some((a) => !options.some((o) => o.value === a.trim())))
      )
        throw new Error(`第 ${index} 行：选项不足或答案与选项不匹配`);
      rows.push({
        stemText: cell(1),
        subject: subj,
        grade: g,
        type,
        answer: cell(5),
        options,
        hint: cell(10),
      });
    });
    if (!rows.length) throw new Error('没有可导入的题目');
    if (rows.length > 500) throw new Error('每次最多导入 500 道题目');
    importRows.value = rows;
  } catch (e) {
    importError.value = messageOf(e);
  } finally {
    importBusy.value = false;
  }
}
async function importQuestions() {
  importBusy.value = true;
  importError.value = '';
  try {
    await request('/questions/bulk', 'POST', importRows.value);
    notice.value = `成功导入 ${importRows.value.length} 道题目`;
    importOpen.value = false;
    importRows.value = [];
    await load();
  } catch (e) {
    importError.value = messageOf(e);
  } finally {
    importBusy.value = false;
  }
}
async function template() {
  if (templateBusy.value) return;
  templateBusy.value = true;
  templateReady.value = false;
  importError.value = '';
  try {
    const { Workbook } = await import('exceljs');
    const book = new Workbook();
    const sheet = book.addWorksheet('题目');
    sheet.addRow([
      '题干',
      '学科',
      '年级',
      '题型',
      '答案',
      '选项A',
      '选项B',
      '选项C',
      '选项D',
      '提示',
    ]);
    sheet.columns.forEach((c) => (c.width = 22));
    const url = URL.createObjectURL(new Blob([await book.xlsx.writeBuffer()]));
    const a = document.createElement('a');
    a.href = url;
    a.download = '题目导入模板.xlsx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    templateReady.value = true;
  } catch (e) {
    importError.value = '模板生成失败：' + messageOf(e);
  } finally {
    templateBusy.value = false;
  }
}
onBeforeUnmount(() => clearTimeout(debounce));
onMounted(load);
</script>
<template>
  <PageHeader>
    <v-btn
      v-if="route?.query.studentId"
      variant="outlined"
      :to="`/students/${encodeURIComponent(String(route.query.studentId))}`"
    >
      返回学生档案
    </v-btn>
    <v-btn
      variant="outlined"
      prepend-icon="mdi-upload-outline"
      @click="
        importOpen = true;
        importError = '';
      "
    >
      批量导入
    </v-btn>
    <v-btn color="primary" prepend-icon="mdi-plus" @click="edit()">新增题目</v-btn>
  </PageHeader>
  <Feedback :error="error" @retry="load" />
  <v-alert v-if="route?.query.objectiveId" type="info" variant="tonal" class="mb-4">
    正在查看此教学目标关联的训练题。新增题目会预填该目标，保存后可返回学生档案继续布置。
  </v-alert>
  <v-card>
    <div class="panel-header">
      <div>
        <h2>
          教学题库
          <v-chip size="x-small" class="ml-2" variant="tonal" color="primary">
            {{ total }} 道题目
          </v-chip>
        </h2>
        <p>按学科与年级筛选，快速找到需要的题目</p>
      </div>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        size="small"
        aria-label="刷新题库"
        :loading="loading"
        @click="load"
      />
    </div>
    <div class="toolbar">
      <v-text-field
        v-model="search"
        class="search-field"
        label="搜索题目内容"
        prepend-inner-icon="mdi-magnify"
        hide-details
        clearable
        @click:clear="search = ''"
      />
      <v-select v-model="subject" :items="subjects" label="全部学科" clearable hide-details />
      <v-select
        v-model="grade"
        :items="Array.from({ length: 12 }, (_, i) => ({ title: `${i + 1} 年级`, value: i + 1 }))"
        label="全部年级"
        clearable
        hide-details
      />
      <v-spacer />
      <v-btn
        v-if="search || subject || grade"
        variant="text"
        @click="
          search = '';
          subject = null;
          grade = null;
        "
      >
        重置筛选
      </v-btn>
    </div>
    <v-data-table-server
      v-model:page="page"
      v-model:items-per-page="pageSize"
      :items="items"
      :headers="headers"
      :items-length="total"
      :loading="loading"
      :items-per-page-options="[10, 20, 50]"
      item-value="id"
    >
      <template #item.stemText="{ item }">
        <div class="d-flex align-center ga-3 py-3">
          <v-avatar v-if="item.stemImage" rounded="lg" size="44">
            <v-img :src="item.stemImage" alt="题目图片" />
          </v-avatar>
          <button class="question-title" @click="preview = item">
            {{ item.stemText || '图片题目' }}
          </button>
        </div>
      </template>
      <template #item.subject="{ item }">
        <v-chip size="small" color="primary" variant="tonal">
          {{ subjectLabel(item.subject) }}
        </v-chip>
      </template>
      <template #item.grade="{ item }">{{ item.grade }} 年级</template>
      <template #item.type="{ item }">
        <span class="muted">{{ typeLabel(item.type) }}</span>
      </template>
      <template #item.actions="{ item }">
        <v-btn
          icon="mdi-eye-outline"
          size="small"
          variant="text"
          :aria-label="`预览题目 ${item.stemText}`"
          @click="preview = item"
        />
        <v-btn
          icon="mdi-pencil-outline"
          size="small"
          variant="text"
          :aria-label="`编辑题目 ${item.stemText}`"
          @click="edit(item)"
        />
        <v-btn
          icon="mdi-trash-can-outline"
          size="small"
          variant="text"
          color="error"
          :aria-label="`删除题目 ${item.stemText}`"
          @click="remove = item"
        />
      </template>
      <template #no-data>
        <EmptyState
          v-if="!loading && !error"
          :title="search || subject || grade ? '没有匹配的题目' : '题库准备好了，开始积累吧'"
          :description="
            search || subject || grade
              ? '试试调整搜索关键词或筛选条件。'
              : '添加第一道题目，或用 Excel 批量导入已有教学内容。'
          "
          icon="mdi-book-open-page-variant-outline"
        >
          <v-btn
            v-if="!search && !subject && !grade"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-plus"
            @click="edit()"
          >
            新增题目
          </v-btn>
        </EmptyState>
      </template>
    </v-data-table-server>
  </v-card>
  <EditorDialog v-model="dialog" :dirty="dirty" :saving="saving" max-width="780" v-slot="{ close }">
    <v-card :title="selected ? '编辑题目' : '新增题目'">
      <v-form @submit.prevent="save" class="overflow-y-auto">
        <v-card-text>
          <v-alert
            v-if="formError"
            type="error"
            variant="tonal"
            class="mb-4"
            data-form-error
            tabindex="-1"
          >
            {{ formError }}
          </v-alert>
          <div class="dialog-form-grid">
            <v-select v-model="form.subject" label="学科" :items="subjects" :rules="[required]" />
            <v-select
              v-model="form.grade"
              label="年级"
              :items="Array.from({ length: 12 }, (_, i) => i + 1)"
              :rules="[required]"
            />
            <v-select
              v-model="form.type"
              label="题型"
              :items="questionTypes"
              @update:model-value="
                form.answer = '';
                selectedAnswers = [];
              "
            />
            <v-autocomplete
              v-model="form.objectiveId"
              label="关联教学目标（选填）"
              :items="goalOptions"
              :loading="goalsLoading"
              :disabled="goalsLoading"
              clearable
              no-data-text="尚无教学目标，请先在能力追踪中建立"
              hint="按目标名称或主题搜索"
              persistent-hint
            />
            <v-alert v-if="goalsError" type="warning" variant="tonal" class="full-width mb-3">
              {{ goalsError }}
            </v-alert>
            <v-textarea
              v-model="form.stemText"
              label="题目内容"
              :rules="[(v) => !!v.trim() || !!form.stemImage || '请填写题目内容或上传图片']"
              rows="3"
              class="full-width"
            />
            <div class="full-width mb-5">
              <v-text-field
                v-model="form.stemImage"
                label="题干图片链接（选填）"
                hide-details
                class="mb-3"
              />
              <v-file-input
                label="上传题干图片（选填）"
                accept="image/png,image/jpeg,image/webp"
                prepend-icon=""
                prepend-inner-icon="mdi-image-plus-outline"
                hint="PNG、JPEG 或 WebP，最大 5 MB"
                persistent-hint
                @change="imageFile"
              />
              <img
                v-if="form.stemImage"
                :src="form.stemImage"
                alt="题干预览"
                class="content-image d-block mt-3"
              />
            </div>
            <template v-if="form.type.startsWith('MULTIPLE')">
              <div v-for="option in form.options" :key="option.value">
                <v-text-field v-model="option.text" :label="`选项 ${option.value}`" />
                <v-btn
                  v-if="!option.image && !imageOptions.includes(option.value)"
                  variant="text"
                  size="small"
                  prepend-icon="mdi-image-outline"
                  @click="imageOptions.push(option.value)"
                >
                  为选项 {{ option.value }} 添加图片
                </v-btn>
                <v-text-field
                  v-else
                  v-model="option.image"
                  :label="`选项 ${option.value} 图片链接（选填）`"
                  density="compact"
                />
              </div>
              <v-select
                v-if="form.type === 'MULTIPLE_SELECT'"
                v-model="selectedAnswers"
                label="正确答案（可多选）"
                :items="form.options.map((o) => o.value)"
                multiple
                chips
                :rules="[required]"
                class="full-width"
              />
              <v-select
                v-else
                v-model="form.answer"
                label="正确答案"
                :items="form.options.map((o) => o.value)"
                :rules="[required]"
                class="full-width"
              />
            </template>
            <v-select
              v-else-if="form.type === 'TRUE_FALSE'"
              v-model="form.answer"
              label="正确答案"
              :items="[
                { title: '正确', value: 'true' },
                { title: '错误', value: 'false' },
              ]"
              :rules="[required]"
              class="full-width"
            />
            <v-text-field
              v-else
              v-model="form.answer"
              label="正确答案"
              :rules="[required]"
              class="full-width"
            />
            <v-textarea
              v-model="form.hint"
              label="解析 / 提示（选填）"
              rows="2"
              class="full-width"
            />
          </div>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn :disabled="saving" @click="close">取消</v-btn>
          <v-btn type="submit" variant="flat" color="primary" :loading="saving">保存题目</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </EditorDialog>
  <v-dialog :model-value="!!remove" @update:model-value="remove = null" max-width="420">
    <v-card title="删除这道题目？">
      <v-card-text>删除后无法恢复。已保存试卷中的题目副本不受影响。</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="saving" @click="remove = null">取消</v-btn>
        <v-btn color="error" :loading="saving" @click="deleteItem">确认删除</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog :model-value="!!preview" @update:model-value="preview = null">
    <v-card v-if="preview" title="题目预览">
      <v-card-text>
        <div class="mb-4">
          <v-chip size="small" class="mr-2">{{ subjectLabel(preview.subject) }}</v-chip>
          <v-chip size="small">{{ typeLabel(preview.type) }}</v-chip>
        </div>
        <h2>{{ preview.stemText }}</h2>
        <img
          v-if="preview.stemImage"
          :src="preview.stemImage"
          alt="题目图片"
          class="content-image mt-4"
        />
        <v-list>
          <v-list-item v-for="o in preview.options" :key="o.value" :title="optionLabel(o)">
            <img v-if="o.image" :src="o.image" alt="选项图片" class="content-image" />
          </v-list-item>
        </v-list>
        <v-alert variant="tonal" color="primary">
          正确答案：{{ preview.answer }}
          <p v-if="preview.hint" class="mt-2">{{ preview.hint }}</p>
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="preview = null">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="importOpen" :persistent="importBusy">
    <v-card title="批量导入题目">
      <v-card-text>
        <p class="form-note">
          使用模板填写题目，支持 .xlsx 格式。上传后会先检查内容，确认后才会保存。
        </p>
        <v-btn
          prepend-icon="mdi-download-outline"
          variant="tonal"
          color="primary"
          class="mb-5"
          :loading="templateBusy"
          @click="template"
        >
          下载空白模板
        </v-btn>
        <p v-if="templateReady" role="status" class="form-note">
          模板已生成，请在浏览器下载记录中查看。
        </p>
        <v-file-input
          label="选择 Excel 文件"
          accept=".xlsx"
          :disabled="importBusy"
          @change="readImport"
          @click:clear="
            importRows = [];
            importError = '';
          "
        />
        <v-progress-linear v-if="importBusy" indeterminate />
        <v-alert v-if="importError" type="error" variant="tonal">{{ importError }}</v-alert>
        <v-alert v-if="importRows.length" type="success" variant="tonal">
          已检查 {{ importRows.length }} 道题目，确认后导入。
        </v-alert>
        <v-list v-if="importRows.length" density="compact">
          <v-list-item
            v-for="(q, i) in importRows.slice(0, 5)"
            :key="i"
            :title="q.stemText"
            :subtitle="`${subjectLabel(q.subject!)} · ${q.grade} 年级`"
          />
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="importBusy" @click="importOpen = false">取消</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!importRows.length"
          :loading="importBusy"
          @click="importQuestions"
        >
          确认导入
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-snackbar :model-value="!!notice" @update:model-value="notice = ''" color="primary">
    {{ notice }}
  </v-snackbar>
</template>
<style scoped>
.question-title {
  text-align: left;
  line-height: 1.7;
  font-weight: 500;
  cursor: pointer;
  color: inherit;
}
.question-title:hover {
  color: rgb(var(--v-theme-primary));
}
</style>
