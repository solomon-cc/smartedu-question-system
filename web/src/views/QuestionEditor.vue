<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { IconPlus, IconDelete, IconEdit, IconArrowRight } from '@arco-design/web-vue/es/icon';
import { Modal, Message } from '@arco-design/web-vue';
import { api, message, query } from '../lib/api';
import { subjects, subjectName, type Question, type Topic } from '../lib/types';
import PageState from '../components/PageState.vue';
import { useLeaveGuard } from '../components/useLeaveGuard';
const items = ref<Question[]>([]),
  topics = ref<Topic[]>([]),
  loading = ref(true),
  error = ref(''),
  search = ref(''),
  page = ref(1),
  total = ref(0),
  subject = ref(''),
  dialog = ref(false),
  saving = ref(false),
  formError = ref(''),
  baseline = ref('');
const fresh = (): Question => ({
  id: '',
  subject: 'MATH',
  grade: 1,
  type: 'MULTIPLE_CHOICE',
  stemText: '',
  answer: 'A',
  hint: '',
  objectiveId: '',
  options: [
    { value: 'A', text: '' },
    { value: 'B', text: '' },
    { value: 'C', text: '' },
    { value: 'D', text: '' },
  ],
});
const form = ref<Question>(fresh());
const topicBaseline = ref(''),
  objectiveBaseline = ref('');
const dirty = computed(
  () =>
    (dialog.value && JSON.stringify(form.value) !== baseline.value) ||
    (topicDialog.value && JSON.stringify(topicForm.value) !== topicBaseline.value) ||
    (objectiveDialog.value && JSON.stringify(objectiveForm.value) !== objectiveBaseline.value),
);
const guard = useLeaveGuard(
  () => dirty.value,
  () => saving.value || topicSaving.value,
);
const objectives = computed(() =>
  topics.value
    .filter((t) => t.subject === form.value.subject && t.grade === form.value.grade)
    .flatMap((t) =>
      t.objectives
        .filter((o) => o.id)
        .map((o) => ({ value: o.id, label: t.name + ' / ' + o.name })),
    ),
);
const topicDialog = ref(false),
  topicSaving = ref(false),
  topicError = ref(''),
  topicForm = ref({ name: '', subject: 'MATH', grade: 1, objective: '' });
async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [data, catalog] = await Promise.all([
      api(
        '/portal/manage/questions?' +
          query({ page: page.value, pageSize: 20, search: search.value, subject: subject.value }),
      ),
      api('/portal/catalog'),
    ]);
    items.value = data.list || [];
    total.value = data.total;
    topics.value = catalog;
  } catch (e) {
    error.value = message(e);
  } finally {
    loading.value = false;
  }
}
function edit(q?: Question) {
  form.value = q ? JSON.parse(JSON.stringify(q)) : fresh();
  baseline.value = JSON.stringify(form.value);
  formError.value = '';
  dialog.value = true;
}
async function close() {
  if (await guard.confirm()) dialog.value = false;
}
async function save() {
  if (!form.value.stemText.trim() || !form.value.answer.trim()) {
    formError.value = '请填写题目和正确答案';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    await api(
      '/portal/manage/questions' + (form.value.id ? '/' + form.value.id : ''),
      form.value.id ? 'PUT' : 'POST',
      form.value,
    );
    dialog.value = false;
    Message.success('题目已保存');
    await load();
  } catch (e) {
    formError.value = message(e);
  } finally {
    saving.value = false;
  }
}
function remove(q: Question) {
  Modal.warning({
    title: '删除这道题？',
    content: q.stemText,
    hideCancel: false,
    okText: '删除',
    cancelText: '取消',
    onBeforeOk: async () => {
      try {
        await api('/portal/manage/questions/' + q.id, 'DELETE');
        await load();
        return true;
      } catch (e) {
        Message.error(message(e));
        return false;
      }
    },
  });
}
async function saveTopic() {
  if (topicSaving.value) return;
  if (!topicForm.value.name.trim() || !topicForm.value.objective.trim()) {
    topicError.value = '请填写主题和第一个知识点';
    return;
  }
  topicSaving.value = true;
  topicError.value = '';
  try {
    await api('/portal/manage/topics', 'POST', topicForm.value);
    topicDialog.value = false;
    await load();
    Message.success('知识点已创建');
  } catch (e) {
    topicError.value = message(e);
  } finally {
    topicSaving.value = false;
  }
}
const objectiveDialog = ref(false),
  objectiveError = ref(''),
  objectiveForm = ref({ topicId: '', name: '' });
async function saveObjective() {
  if (topicSaving.value) return;
  topicSaving.value = true;
  objectiveError.value = '';
  try {
    await api('/portal/manage/objectives', 'POST', objectiveForm.value);
    objectiveDialog.value = false;
    await load();
  } catch (e) {
    objectiveError.value = message(e);
  } finally {
    topicSaving.value = false;
  }
}
function openTopic() {
  topicBaseline.value = JSON.stringify(topicForm.value);
  topicError.value = '';
  topicDialog.value = true;
}
function openObjective() {
  objectiveBaseline.value = JSON.stringify(objectiveForm.value);
  objectiveError.value = '';
  objectiveDialog.value = true;
}
async function closeTopic() {
  if (await guard.confirm()) topicDialog.value = false;
}
async function closeObjective() {
  if (await guard.confirm()) objectiveDialog.value = false;
}
function searchNow() {
  page.value = 1;
  load();
}
watch(subject, searchNow);
onMounted(load);
</script>
<template>
  <section class="container section management">
    <div class="page-heading">
      <div>
        <h1>题库管理</h1>
      </div>
      <div class="inline-actions">
        <a-button size="large" @click="openTopic">新建主题</a-button>
        <a-button size="large" @click="openObjective">添加知识点</a-button>
        <a-button type="primary" size="large" @click="edit()">
          <IconPlus />
          新增题目
        </a-button>
      </div>
    </div>
    <div class="management-toolbar">
      <a-input-search
        v-model="search"
        placeholder="搜索题目"
        :input-attrs="{ 'aria-label': '搜索题目' }"
        allow-clear
        @search="searchNow"
        @press-enter="searchNow"
      />
      <a-select
        v-model="subject"
        placeholder="全部学科"
        allow-clear
        :options="subjects.map((s) => ({ value: s.value, label: s.label }))"
      />
      <router-link to="/library" class="text-link">
        查看题库
        <IconArrowRight />
      </router-link>
    </div>
    <PageState
      :loading="loading"
      :error="error"
      :empty="!items.length"
      title="还没有匹配的题目"
      description="添加题目，或调整当前搜索条件。"
      @retry="load"
    />
    <div v-if="!loading && !error && items.length" class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>题目</th>
            <th>学科 / 年级</th>
            <th>知识点</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in items" :key="q.id">
            <td class="question-cell">
              <button @click="edit(q)">{{ q.stemText }}</button>
              <small>
                {{
                  q.type === 'MULTIPLE_CHOICE'
                    ? '单选'
                    : q.type === 'MULTIPLE_SELECT'
                      ? '多选'
                      : q.type === 'TRUE_FALSE'
                        ? '判断'
                        : '填写答案'
                }}
              </small>
            </td>
            <td>{{ subjectName(q.subject) }} · {{ q.grade }} 年级</td>
            <td>
              {{
                topics.flatMap((t) => t.objectives).find((o) => o.id === q.objectiveId)?.name ||
                '综合练习'
              }}
            </td>
            <td>
              <div class="inline-actions">
                <a-button aria-label="编辑题目" @click="edit(q)"><IconEdit /></a-button>
                <a-button status="danger" aria-label="删除题目" @click="remove(q)">
                  <IconDelete />
                </a-button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <a-pagination
      v-if="total > 20"
      :current="page"
      :total="total"
      :page-size="20"
      class="pagination"
      @change="
        page = $event;
        load();
      "
    />
    <a-modal
      :visible="dialog"
      :title="form.id ? '编辑题目' : '新增题目'"
      :width="720"
      :footer="false"
      :mask-closable="false"
      @cancel="close"
    >
      <a-alert v-if="formError" type="error" class="mb-24">{{ formError }}</a-alert>
      <a-form :model="form" layout="vertical" @submit="save">
        <div class="two-fields">
          <a-form-item field="subject" label="学科">
            <a-select
              v-model="form.subject"
              :options="subjects.map((s) => ({ value: s.value, label: s.label }))"
              @change="form.objectiveId = ''"
            />
          </a-form-item>
          <a-form-item field="grade" label="年级">
            <a-input-number
              v-model="form.grade"
              :min="1"
              :max="12"
              @change="form.objectiveId = ''"
            />
          </a-form-item>
        </div>
        <a-form-item field="objectiveId" label="知识点">
          <a-select
            v-model="form.objectiveId"
            :options="[{ label: '综合练习（未分类）', value: '' }, ...objectives]"
          />
        </a-form-item>
        <a-form-item field="type" label="题型">
          <a-select
            v-model="form.type"
            :options="[
              { value: 'MULTIPLE_CHOICE', label: '单选题' },
              { value: 'MULTIPLE_SELECT', label: '多选题' },
              { value: 'TRUE_FALSE', label: '判断题' },
              { value: 'FILL_BLANK', label: '填空题' },
              { value: 'CALCULATION', label: '计算题' },
            ]"
            @change="
              form.options =
                form.type === 'TRUE_FALSE'
                  ? [
                      { value: 'true', text: '正确' },
                      { value: 'false', text: '错误' },
                    ]
                  : ['MULTIPLE_CHOICE', 'MULTIPLE_SELECT'].includes(form.type)
                    ? [
                        { value: 'A', text: '' },
                        { value: 'B', text: '' },
                        { value: 'C', text: '' },
                        { value: 'D', text: '' },
                      ]
                    : [];
              form.answer = '';
            "
          />
        </a-form-item>
        <a-form-item field="stemText" label="题目内容" required>
          <a-textarea v-model="form.stemText" :auto-size="{ minRows: 3, maxRows: 8 }" />
        </a-form-item>
        <template v-if="['MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'TRUE_FALSE'].includes(form.type)">
          <a-form-item v-for="o in form.options" :key="o.value" :label="'选项 ' + o.value" required>
            <a-input v-model="o.text" />
          </a-form-item>
        </template>
        <a-form-item
          field="answer"
          label="正确答案"
          required
          :help="
            form.type === 'MULTIPLE_SELECT'
              ? '填写选项编号，用英文逗号分隔，例如 A,C'
              : '选项题填写选项编号，其余题型填写标准答案'
          "
        >
          <a-input v-model="form.answer" />
        </a-form-item>
        <a-form-item field="hint" label="解题说明">
          <a-textarea v-model="form.hint" :auto-size="{ minRows: 2, maxRows: 8 }" />
        </a-form-item>
        <div class="dialog-actions">
          <a-button :disabled="saving" @click="close">取消</a-button>
          <a-button html-type="submit" type="primary" :loading="saving">保存题目</a-button>
        </div>
      </a-form>
    </a-modal>
    <a-modal
      :visible="topicDialog"
      title="新建学习主题"
      :ok-loading="topicSaving"
      :mask-closable="false"
      @ok="saveTopic"
      @cancel="closeTopic"
    >
      <a-alert v-if="topicError" type="error">{{ topicError }}</a-alert>
      <a-form :model="topicForm" layout="vertical">
        <a-form-item field="name" label="主题名称" required>
          <a-input v-model="topicForm.name" placeholder="例如：数与数量" />
        </a-form-item>
        <div class="two-fields">
          <a-form-item field="subject" label="学科">
            <a-select
              v-model="topicForm.subject"
              :options="subjects.map((s) => ({ value: s.value, label: s.label }))"
            />
          </a-form-item>
          <a-form-item field="grade" label="年级">
            <a-input-number v-model="topicForm.grade" :min="1" :max="12" />
          </a-form-item>
        </div>
        <a-form-item field="objective" label="第一个知识点" required>
          <a-input v-model="topicForm.objective" placeholder="例如：认识 1–5 的数量" />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      :visible="objectiveDialog"
      title="添加知识点"
      :ok-loading="topicSaving"
      @ok="saveObjective"
      @cancel="closeObjective"
    >
      <a-alert v-if="objectiveError" type="error">{{ objectiveError }}</a-alert>
      <a-form :model="objectiveForm" layout="vertical">
        <a-form-item field="topicId" label="所属主题" required>
          <a-select
            v-model="objectiveForm.topicId"
            :options="
              topics
                .filter((t) => !t.id.startsWith('general-'))
                .map((t) => ({
                  value: t.id,
                  label: t.grade + '年级 · ' + subjectName(t.subject) + ' · ' + t.name,
                }))
            "
          />
        </a-form-item>
        <a-form-item field="name" label="知识点名称" required>
          <a-input v-model="objectiveForm.name" />
        </a-form-item>
      </a-form>
    </a-modal>
  </section>
</template>
