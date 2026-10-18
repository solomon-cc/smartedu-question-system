<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  IconPlus,
  IconArrowLeft,
  IconDelete,
  IconArrowUp,
  IconArrowDown,
} from '@arco-design/web-vue/es/icon';
import { Message, Modal } from '@arco-design/web-vue';
import { api, message } from '../lib/api';
import { auth, type User } from '../lib/auth';
import { kindName, type Course, type Lesson } from '../lib/types';
import PageState from '../components/PageState.vue';
import FileUpload from '../components/FileUpload.vue';
import { useLeaveGuard } from '../components/useLeaveGuard';
const items = ref<Course[]>([]),
  users = ref<User[]>([]),
  loading = ref(true),
  error = ref(''),
  editing = ref(false),
  saving = ref(false),
  formError = ref(''),
  uploads = ref<Record<number, boolean>>({}),
  baseline = ref('');
const fresh = (): Course => ({
  id: '',
  title: '',
  summary: '',
  audience: 'parent',
  instructor: auth.user?.name || '',
  ownerId: '',
  published: false,
  visibility: 'all',
  userIds: [],
  lessons: [],
});
const form = ref<Course>(fresh());
const busy = computed(() => saving.value || Object.values(uploads.value).some(Boolean));
const dirty = computed(() => editing.value && JSON.stringify(form.value) !== baseline.value);
const guard = useLeaveGuard(
  () => dirty.value,
  () => busy.value,
);
async function load() {
  loading.value = true;
  error.value = '';
  try {
    [items.value, users.value] = await Promise.all([
      api('/portal/manage/courses'),
      api('/portal/recipients'),
    ]);
  } catch (e) {
    error.value = message(e);
  } finally {
    loading.value = false;
  }
}
function edit(c?: Course) {
  form.value = c
    ? JSON.parse(JSON.stringify({ ...c, userIds: c.userIds || [], lessons: c.lessons || [] }))
    : fresh();
  baseline.value = JSON.stringify(form.value);
  uploads.value = {};
  formError.value = '';
  editing.value = true;
}
async function close() {
  if (await guard.confirm()) editing.value = false;
}
function add() {
  form.value.lessons.push({ id: '', title: '', kind: 'text', text: '', uploadId: '', duration: 0 });
}
function move(i: number, step: number) {
  const list = form.value.lessons;
  const j = i + step;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j]!, list[i]!];
}
function removeLesson(i: number) {
  Modal.warning({
    title: '移除这个章节？',
    content: '保存课程后，学员将不再看到这个章节。',
    hideCancel: false,
    okText: '移除章节',
    cancelText: '保留',
    onOk: () => form.value.lessons.splice(i, 1),
  });
}
async function save() {
  if (busy.value) return;
  if (!form.value.title.trim()) {
    formError.value = '请填写课程标题';
    return;
  }
  if (form.value.published && !form.value.lessons.length) {
    formError.value = '发布前至少添加一个章节';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    await api(
      '/portal/manage/courses' + (form.value.id ? '/' + form.value.id : ''),
      form.value.id ? 'PUT' : 'POST',
      form.value,
    );
    editing.value = false;
    Message.success('课程已保存');
    await load();
  } catch (e) {
    formError.value = message(e);
  } finally {
    saving.value = false;
  }
}
function remove(c: Course) {
  Modal.warning({
    title: '删除课程？',
    content: `「${c.title}」删除后将不再开放。`,
    hideCancel: false,
    okText: '删除',
    cancelText: '取消',
    onBeforeOk: async () => {
      try {
        await api('/portal/manage/courses/' + c.id, 'DELETE');
        await load();
        return true;
      } catch (e) {
        Message.error(message(e));
        return false;
      }
    },
  });
}
onMounted(load);
</script>
<template>
  <section class="container section management">
    <template v-if="!editing">
      <div class="page-heading">
        <div>
          <h1>课程管理</h1>
        </div>
        <a-button type="primary" size="large" @click="edit()">
          <IconPlus />
          创建课程
        </a-button>
      </div>
      <PageState
        :loading="loading"
        :error="error"
        :empty="!items.length"
        title="暂无课程，点击“创建课程”添加。"
        @retry="load"
      />
      <div class="manage-course-list">
        <article v-for="c in items" :key="c.id">
          <div class="course-mini-cover" :class="c.audience">
            {{ c.audience === 'parent' ? '家长' : '老师' }}
          </div>
          <div class="grow">
            <div class="course-tags">
              <span>{{ c.published ? '已发布' : '草稿' }}</span>
              <span>
                {{
                  c.visibility === 'all'
                    ? '所有登录用户'
                    : '指定 ' + (c.userIds?.length || 0) + ' 位学员'
                }}
              </span>
            </div>
            <h3>{{ c.title }}</h3>
            <p class="muted">{{ c.lessons?.length || 0 }} 个章节 · {{ c.instructor }}</p>
          </div>
          <a-button @click="edit(c)">编辑课程</a-button>
          <a-button status="danger" aria-label="删除课程" @click="remove(c)">
            <IconDelete />
          </a-button>
        </article>
      </div>
    </template>
    <template v-else>
      <button class="text-link back-button" :disabled="busy" @click="close">
        <IconArrowLeft />
        返回课程列表
      </button>
      <div class="page-heading">
        <div>
          <h1>{{ form.id ? '编辑课程' : '创建课程' }}</h1>
          <p>课程信息、章节内容与发布范围，在这里一次整理好。</p>
        </div>
        <a-button
          type="primary"
          size="large"
          :loading="saving"
          :disabled="busy && !saving"
          @click="save"
        >
          保存课程
        </a-button>
      </div>
      <a-alert v-if="formError" type="error" class="mb-24">{{ formError }}</a-alert>
      <div class="editor-grid">
        <div>
          <section class="editor-panel">
            <h2>
              <span class="step-label">01</span>
              基本信息
            </h2>
            <a-form :model="form" layout="vertical">
              <a-form-item field="title" label="课程标题" required>
                <a-input
                  v-model="form.title"
                  :max-length="100"
                  show-word-limit
                  placeholder="用简短清晰的标题说明课程主题"
                />
              </a-form-item>
              <div class="two-fields">
                <a-form-item field="audience" label="培训分类">
                  <a-select
                    v-model="form.audience"
                    :options="[
                      { label: '家长培训', value: 'parent' },
                      { label: '老师培训', value: 'teacher' },
                    ]"
                  />
                </a-form-item>
                <a-form-item field="instructor" label="讲师">
                  <a-input v-model="form.instructor" />
                </a-form-item>
              </div>
              <a-form-item field="summary" label="课程介绍">
                <a-textarea
                  v-model="form.summary"
                  :auto-size="{ minRows: 3, maxRows: 8 }"
                  :max-length="2000"
                  placeholder="适合谁学习？将学到什么？"
                />
              </a-form-item>
            </a-form>
          </section>
          <section class="editor-panel">
            <div class="section-heading compact">
              <h2>
                <span class="step-label">02</span>
                课程章节
              </h2>
              <a-button :disabled="busy" @click="add">
                <IconPlus />
                添加章节
              </a-button>
            </div>
            <p v-if="!form.lessons.length" class="muted">
              按学习顺序添加章节，支持图文、视频和文档。
            </p>
            <article v-for="(l, i) in form.lessons" :key="l.id || i" class="lesson-editor">
              <div class="lesson-editor-heading">
                <strong>第 {{ i + 1 }} 节</strong>
                <div>
                  <a-button :disabled="i === 0 || busy" aria-label="上移章节" @click="move(i, -1)">
                    <IconArrowUp />
                  </a-button>
                  <a-button
                    :disabled="i === form.lessons.length - 1 || busy"
                    aria-label="下移章节"
                    @click="move(i, 1)"
                  >
                    <IconArrowDown />
                  </a-button>
                  <a-button
                    :disabled="busy"
                    status="danger"
                    aria-label="移除章节"
                    @click="removeLesson(i)"
                  >
                    <IconDelete />
                  </a-button>
                </div>
              </div>
              <a-form :model="l" layout="vertical">
                <a-form-item field="title" label="章节标题" required>
                  <a-input v-model="l.title" />
                </a-form-item>
                <a-form-item field="kind" label="内容形式">
                  <a-select
                    v-model="l.kind"
                    :disabled="busy"
                    :options="[
                      { label: '图文', value: 'text' },
                      { label: '视频', value: 'video' },
                      { label: '文档', value: 'document' },
                    ]"
                    @change="l.uploadId = ''"
                  />
                </a-form-item>
                <a-form-item field="text" v-if="l.kind === 'text'" label="正文" required>
                  <a-textarea
                    v-model="l.text"
                    :auto-size="{ minRows: 6, maxRows: 16 }"
                    placeholder="输入课程正文，保留段落与换行"
                  />
                </a-form-item>
                <a-form-item field="uploadId" v-else :label="kindName(l.kind) + '文件'" required>
                  <FileUpload v-model="l.uploadId" :kind="l.kind" @busy="uploads[i] = $event" />
                </a-form-item>
              </a-form>
            </article>
          </section>
        </div>
        <aside class="editor-panel publish-panel">
          <h2>
            <span class="step-label">03</span>
            发布设置
          </h2>
          <a-form :model="form" layout="vertical">
            <a-form-item field="visibility" label="学习范围">
              <a-select
                v-model="form.visibility"
                :options="[
                  { label: '所有登录用户', value: 'all' },
                  { label: '指定学员', value: 'assigned' },
                ]"
              />
            </a-form-item>
            <a-form-item
              field="userIds"
              v-if="form.visibility === 'assigned'"
              label="指定学员"
              required
            >
              <a-select
                v-model="form.userIds"
                multiple
                allow-search
                placeholder="搜索姓名或账号"
                :options="
                  users.map((u) => ({
                    label: (u.name || u.username) + ' · ' + u.username,
                    value: u.id,
                  }))
                "
              />
            </a-form-item>
            <a-form-item field="published" label="发布状态">
              <a-radio-group v-model="form.published" direction="vertical">
                <a-radio :value="false">保存为草稿</a-radio>
                <a-radio :value="true">发布课程</a-radio>
              </a-radio-group>
            </a-form-item>
          </a-form>
          <p class="form-note">
            公开课程展示在培训目录；指定课程只在被指定学员的账号中显示。草稿仅管理者可见。
          </p>
          <p v-if="dirty" class="unsaved-text">有尚未保存的修改</p>
          <a-button long type="primary" :loading="saving" :disabled="busy && !saving" @click="save">
            保存课程
          </a-button>
        </aside>
      </div>
    </template>
  </section>
</template>
