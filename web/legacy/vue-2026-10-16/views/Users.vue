<script setup lang="ts">
import { validateForm } from '../lib/forms';
import { computed, onMounted, ref } from 'vue';
import { request } from '../lib/api';
import { roles, roleLabel, required, messageOf, type User } from '../lib/types';
import { auth } from '../stores/auth';
import { useTask } from '../lib/useData';
import EditorDialog from '../components/EditorDialog.vue';
import PageHeader from '../components/PageHeader.vue';
import Feedback from '../components/Feedback.vue';
import EmptyState from '../components/EmptyState.vue';
const { loading, error, success, run } = useTask(),
  items = ref<User[]>([]),
  search = ref(''),
  dialog = ref(false),
  selected = ref<User | null>(null),
  deleting = ref<User | null>(null),
  saving = ref(false),
  formError = ref('');
const form = ref({ username: '', name: '', password: '', role: 'STUDENT', status: 'active' });
const baseline = ref('');
const dirty = computed(() => JSON.stringify(form.value) !== baseline.value);
const headers = [
  { title: '用户', key: 'name' },
  { title: '账号', key: 'username' },
  { title: '角色', key: 'role' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'actions', sortable: false, width: 110 },
];
async function load() {
  await run(async () => {
    items.value = (await request('/admin/users')) || [];
  });
}
function edit(user?: User) {
  selected.value = user || null;
  form.value = {
    username: user?.username || '',
    name: user?.name || '',
    password: '',
    role: user?.role || 'STUDENT',
    status: user?.status || 'active',
  };
  formError.value = '';
  baseline.value = JSON.stringify(form.value);
  dialog.value = true;
}
async function save(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event))) return;
  saving.value = true;
  formError.value = '';
  try {
    await request(
      `/admin/users${selected.value ? '/' + selected.value.id : ''}`,
      selected.value ? 'PUT' : 'POST',
      form.value,
    );
    dialog.value = false;
    await load();
    success.value = '用户信息已保存';
  } catch (e) {
    formError.value = messageOf(e);
  } finally {
    saving.value = false;
  }
}
async function remove() {
  if (!deleting.value) return;
  const id = deleting.value.id;
  deleting.value = null;
  await run(async () => {
    await request('/admin/users/' + id, 'DELETE');
    items.value = items.value.filter((u) => u.id !== id);
  }, '用户已删除');
}
onMounted(load);
</script>
<template>
  <PageHeader>
    <v-btn prepend-icon="mdi-plus" color="primary" @click="edit()">新增用户</v-btn>
  </PageHeader>
  <Feedback :error="error" @retry="load" />
  <v-card>
    <div class="panel-header">
      <div>
        <h2>
          平台成员
          <v-chip size="x-small" class="ml-2">{{ items.length }}</v-chip>
        </h2>
        <p>为教师与学生建立独立的工作空间</p>
      </div>
      <v-btn icon="mdi-refresh" variant="text" aria-label="刷新用户列表" @click="load" />
    </div>
    <div class="toolbar">
      <v-text-field
        v-model="search"
        label="搜索姓名或账号"
        prepend-inner-icon="mdi-magnify"
        class="search-field"
        hide-details
        clearable
      />
    </div>
    <v-data-table :items="items" :headers="headers" :search="search || ''" :loading="loading">
      <template #item.name="{ item }">
        <div class="d-flex align-center ga-3 py-3">
          <v-avatar size="36" color="surface-variant">
            {{ (item.name || item.username).slice(0, 1) }}
          </v-avatar>
          <span class="table-title">{{ item.name || '未设置姓名' }}</span>
          <v-chip v-if="item.id === auth.user?.id" size="x-small" color="primary">我</v-chip>
        </div>
      </template>
      <template #item.role="{ item }">
        <v-chip
          size="small"
          variant="tonal"
          :color="item.role === 'ADMIN' ? 'secondary' : 'primary'"
        >
          {{ roleLabel(item.role) }}
        </v-chip>
      </template>
      <template #item.status="{ item }">
        <v-chip
          size="small"
          variant="text"
          :color="item.status === 'active' ? 'success' : 'error'"
          :prepend-icon="item.status === 'active' ? 'mdi-check-circle-outline' : 'mdi-cancel'"
        >
          {{ item.status === 'active' ? '正常' : '已停用' }}
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn
          icon="mdi-pencil-outline"
          size="small"
          variant="text"
          :aria-label="`编辑 ${item.username}`"
          @click="edit(item)"
        />
        <v-btn
          icon="mdi-trash-can-outline"
          size="small"
          variant="text"
          color="error"
          :disabled="item.id === auth.user?.id"
          :aria-label="`删除 ${item.username}`"
          @click="deleting = item"
        />
      </template>
      <template #no-data>
        <EmptyState
          v-if="!loading && !error"
          title="没有找到用户"
          description="调整搜索条件，或创建新的教师和学生账号。"
          icon="mdi-account-group-outline"
        />
      </template>
    </v-data-table>
  </v-card>
  <EditorDialog
    v-model="dialog"
    :dirty="dirty"
    :saving="saving"
    :max-width="680"
    v-slot="{ close }"
  >
    <v-card :title="selected ? '编辑用户' : '新增用户'">
      <v-form @submit.prevent="save">
        <v-card-text>
          <v-alert v-if="formError" type="error" variant="tonal" class="mb-5">
            {{ formError }}
          </v-alert>
          <div class="dialog-form-grid">
            <v-text-field v-model="form.name" label="姓名" :rules="[required]" autocomplete="off" />
            <v-text-field
              v-model="form.username"
              label="登录账号"
              :rules="[required]"
              autocomplete="off"
            />
            <v-select
              v-model="form.role"
              label="角色"
              :items="roles"
              :disabled="selected?.id === auth.user?.id"
            />
            <v-select
              v-model="form.status"
              label="状态"
              :items="[
                { title: '正常', value: 'active' },
                { title: '停用', value: 'inactive' },
              ]"
              :disabled="selected?.id === auth.user?.id"
            />
            <v-text-field
              v-model="form.password"
              :label="selected ? '新密码（留空则保持原密码）' : '初始密码'"
              type="password"
              autocomplete="new-password"
              :rules="[(v) => (selected && !v) || v.length >= 8 || '密码至少 8 位']"
              class="full-width"
            />
          </div>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn :disabled="saving" @click="close">取消</v-btn>
          <v-btn type="submit" color="primary" variant="flat" :loading="saving">保存用户</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </EditorDialog>
  <v-dialog :model-value="!!deleting" @update:model-value="deleting = null" max-width="420">
    <v-card title="确认删除用户？">
      <v-card-text>
        将永久删除账号「{{ deleting?.username }}」。请确认该账号不再需要使用。
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="deleting = null">取消</v-btn>
        <v-btn color="error" @click="remove">确认删除</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-snackbar :model-value="!!success" @update:model-value="success = ''">{{ success }}</v-snackbar>
</template>
