<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IconPlus, IconEdit } from '@arco-design/web-vue/es/icon';
import { api, message } from '../lib/api';
import { auth, roleNames, type User, type Role } from '../lib/auth';
import { Message } from '@arco-design/web-vue';
import { useLeaveGuard } from '../components/useLeaveGuard';
import ParentStudentLinks from '../components/ParentStudentLinks.vue';
import PageState from '../components/PageState.vue';
const items = ref<User[]>([]),
  loading = ref(true),
  error = ref(''),
  search = ref(''),
  dialog = ref(false),
  saving = ref(false),
  formError = ref(''),
  baseline = ref('');
const fresh = () => ({
  id: '',
  username: '',
  name: '',
  password: '',
  role: 'STUDENT' as Role,
  status: 'active',
});
const form = ref(fresh()),
  visible = computed(() =>
    items.value.filter((u) =>
      `${u.name} ${u.username} ${roleNames[u.role]}`.includes(search.value.trim()),
    ),
  );
const guard = useLeaveGuard(
  () => dialog.value && JSON.stringify(form.value) !== baseline.value,
  () => saving.value,
);
async function load() {
  loading.value = true;
  error.value = '';
  try {
    items.value = await api('/portal/manage/users');
  } catch (e) {
    error.value = message(e);
  } finally {
    loading.value = false;
  }
}
function edit(u?: User) {
  form.value = u ? { ...u, password: '', status: u.status || 'active' } : fresh();
  baseline.value = JSON.stringify(form.value);
  formError.value = '';
  dialog.value = true;
}
async function close() {
  if (await guard.confirm()) dialog.value = false;
}
async function save() {
  if (
    !form.value.username.trim() ||
    (!form.value.id && form.value.password.length < 8) ||
    (form.value.password && form.value.password.length < 8)
  ) {
    formError.value = '填写账号，新密码至少8位';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    await api(
      '/portal/manage/users' + (form.value.id ? '/' + form.value.id : ''),
      form.value.id ? 'PUT' : 'POST',
      form.value,
    );
    dialog.value = false;
    await load();
    Message.success('成员信息已保存');
  } catch (e) {
    formError.value = message(e);
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section class="container section management">
    <div class="page-heading">
      <div>
        <h1>成员与管理员</h1>
      </div>
      <a-button type="primary" size="large" @click="edit()">
        <IconPlus />
        添加成员
      </a-button>
    </div>
    <ParentStudentLinks :users="items" />
    <a-input-search
      v-model="search"
      placeholder="搜索姓名、账号或角色"
      :input-attrs="{ 'aria-label': '搜索成员' }"
      class="member-search"
    />
    <PageState
      :loading="loading"
      :error="error"
      :empty="!visible.length"
      title="没有匹配的成员"
      @retry="load"
    />
    <div v-if="!loading && !error" class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th>成员</th>
            <th>账号</th>
            <th>角色</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in visible" :key="u.id">
            <td>
              <span class="member-name">
                <span class="avatar">{{ (u.name || u.username).slice(0, 1) }}</span>
                {{ u.name || '未填写姓名' }}
                <small v-if="u.id === auth.user?.id">我</small>
              </span>
            </td>
            <td>{{ u.username }}</td>
            <td>
              <a-tag>{{ roleNames[u.role] }}</a-tag>
            </td>
            <td>
              <span :class="u.status === 'active' ? 'success-text' : 'error-text'">
                {{ u.status === 'active' ? '正常' : '已停用' }}
              </span>
            </td>
            <td>
              <a-button @click="edit(u)">
                <IconEdit />
                编辑
              </a-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <a-modal
      :visible="dialog"
      :title="form.id ? '编辑成员' : '添加成员'"
      :footer="false"
      :mask-closable="false"
      :width="520"
      @cancel="close"
    >
      <a-alert v-if="formError" type="error" class="mb-24">{{ formError }}</a-alert>
      <a-form :model="form" layout="vertical" @submit="save">
        <a-form-item field="username" label="账号" required>
          <a-input v-model="form.username" autocomplete="off" />
        </a-form-item>
        <a-form-item field="name" label="姓名"><a-input v-model="form.name" /></a-form-item>
        <a-form-item
          field="password"
          :label="form.id ? '重置密码（留空不修改）' : '初始密码'"
          :required="!form.id"
        >
          <a-input-password v-model="form.password" autocomplete="new-password" />
        </a-form-item>
        <a-form-item field="role" label="角色">
          <a-select
            v-model="form.role"
            :disabled="form.id === auth.user?.id"
            :options="Object.entries(roleNames).map(([value, label]) => ({ value, label }))"
          />
        </a-form-item>
        <a-form-item field="status" label="账号状态">
          <a-radio-group v-model="form.status" :disabled="form.id === auth.user?.id">
            <a-radio value="active">正常</a-radio>
            <a-radio value="disabled">停用</a-radio>
          </a-radio-group>
        </a-form-item>
        <p v-if="form.role === 'ADMIN'" class="form-note">
          管理员可管理所有课程、题目和平台成员，请仅授予需要此权限的人员。
        </p>
        <div class="dialog-actions">
          <a-button :disabled="saving" @click="close">取消</a-button>
          <a-button type="primary" html-type="submit" :loading="saving">保存成员</a-button>
        </div>
      </a-form>
    </a-modal>
  </section>
</template>
