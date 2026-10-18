<script setup lang="ts">
import { validateForm } from '../lib/forms';
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { request } from '../lib/api';
import { modulePresentation } from '../lib/workspace';
import { roles, required, type Permission, type RecordData, type Role } from '../lib/types';
import { auth } from '../stores/auth';
import { useTask } from '../lib/useData';
import PageHeader from '../components/PageHeader.vue';
import Feedback from '../components/Feedback.vue';
import UnsavedChangesGuard from '../components/UnsavedChangesGuard.vue';
const route = useRoute(),
  isPermissions = computed(() => route.path === '/permissions'),
  { loading, error, success, run } = useTask(),
  permissions = ref<Permission[]>([]),
  role = ref('STUDENT'),
  config = ref<RecordData>({}),
  settings = ref({ registrationEnabled: false }),
  loaded = ref(false),
  saving = ref(false),
  baseline = ref(''),
  changesGuard = ref<InstanceType<typeof UnsavedChangesGuard>>();
const snapshot = () =>
  JSON.stringify(isPermissions.value ? permissions.value : [config.value, settings.value]);
const dirty = computed(() => loaded.value && snapshot() !== baseline.value);
const rolePermissions = computed(() => permissions.value.filter((p) => p.role === role.value));
function title(id: string) {
  return (
    modulePresentation(id, role.value as Role)?.title ||
    (
      {
        skills: '技能学习',
        application: '应用场景',
        assessment: '能力评估',
        mood: '情绪管理',
        mood_stats: '情绪统计',
        stats: '统计分析',
      } as Record<string, string>
    )[id] ||
    id
  );
}
async function load() {
  await run(async () => {
    if (isPermissions.value) permissions.value = (await request('/admin/permissions')) || [];
    else
      [config.value, settings.value] = await Promise.all([
        request('/admin/config'),
        request('/admin/settings'),
      ]);
    loaded.value = true;
    baseline.value = snapshot();
    success.value = '';
  });
}
async function reload() {
  if (await changesGuard.value?.confirm()) await load();
}
async function save(event?: Promise<{ valid: boolean }>) {
  if (!loaded.value || loading.value || !dirty.value) return;
  if (event && !(await validateForm(event))) return;
  saving.value = true;
  await run(async () => {
    if (isPermissions.value) {
      await request('/admin/permissions', 'POST', permissions.value);
      auth.permissions = await request('/me/permissions');
    } else {
      await request('/admin/config', 'POST', config.value);
      await request('/admin/settings', 'POST', settings.value);
    }
    baseline.value = snapshot();
  }, '设置已保存');
  saving.value = false;
}
onMounted(load);
</script>
<template>
  <PageHeader>
    <v-btn variant="outlined" prepend-icon="mdi-refresh" :disabled="loading" @click="reload">
      重新加载
    </v-btn>
  </PageHeader>
  <Feedback :error="error" :loading="loading" @retry="reload" />
  <template v-if="isPermissions">
    <v-alert type="info" variant="tonal" class="mb-6">
      页面入口与接口权限共同生效。关闭权限会阻止相应角色访问该模块，保存后重新登录可刷新其他账号的页面入口。
    </v-alert>
    <v-card data-settings-editor>
      <v-tabs v-model="role" color="primary">
        <v-tab v-for="r in roles" :key="r.value" :value="r.value">{{ r.title }}</v-tab>
      </v-tabs>
      <v-data-table
        :items="rolePermissions"
        :headers="[
          { title: '功能模块', key: 'moduleId' },
          { title: '显示入口', key: 'uiAccess' },
          { title: '接口访问', key: 'apiAccess' },
          { title: '顺序', key: 'sortOrder' },
        ]"
        :items-per-page="50"
        hide-default-footer
      >
        <template #item.moduleId="{ item }">
          <div class="py-3">
            <div class="table-title">{{ title(item.moduleId) }}</div>
            <div v-if="item.parentId" class="text-caption text-medium-emphasis">
              {{ title(item.parentId) }} / 子模块
            </div>
          </div>
        </template>
        <template #item.uiAccess="{ item }">
          <v-switch
            v-model="item.uiAccess"
            :aria-label="`${title(item.moduleId)} 显示入口`"
            color="primary"
            hide-details
            :disabled="
              role === auth.user?.role && ['permissions', 'dashboard'].includes(item.moduleId)
            "
          />
        </template>
        <template #item.apiAccess="{ item }">
          <v-switch
            v-model="item.apiAccess"
            :aria-label="`${title(item.moduleId)} 接口访问`"
            color="primary"
            hide-details
            :disabled="
              role === auth.user?.role && ['permissions', 'dashboard'].includes(item.moduleId)
            "
          />
        </template>
        <template #item.sortOrder="{ item }">
          <v-text-field
            v-model.number="item.sortOrder"
            :aria-label="`${title(item.moduleId)} 排序`"
            type="number"
            min="0"
            max="999"
            hide-details
            density="compact"
            style="max-width: 90px"
          />
        </template>
      </v-data-table>
    </v-card>
    <div v-if="loaded" class="page-actions mt-6">
      <span class="muted">
        {{ dirty ? '有未保存的权限修改' : '权限已加载' }} · 当前查看{{
          roles.find((r) => r.value === role)?.title
        }}
      </span>
      <v-btn
        color="primary"
        :loading="loading"
        :disabled="!dirty"
        prepend-icon="mdi-content-save-outline"
        @click="save()"
      >
        保存权限
      </v-btn>
    </div>
  </template>
  <v-form v-else-if="loaded" data-settings-editor @submit.prevent="save">
    <v-card class="mb-6">
      <div class="panel-header">
        <div>
          <h2>账号与注册</h2>
          <p>控制平台是否接受学生自助注册</p>
        </div>
        <v-icon icon="mdi-account-cog-outline" />
      </div>
      <v-card-text>
        <v-switch
          v-model="settings.registrationEnabled"
          label="开放学生注册"
          color="primary"
          hide-details
        />
        <p class="form-note mt-2">关闭后，登录页隐藏注册入口，已有账号仍可正常登录。</p>
      </v-card-text>
    </v-card>
    <v-card class="mb-6">
      <div class="panel-header">
        <div>
          <h2>错题学习规则</h2>
          <p>为答错后的练习设置清晰的进阶路径</p>
        </div>
        <v-icon icon="mdi-book-sync-outline" />
      </div>
      <v-card-text>
        <v-switch
          v-model="config.globalEnabled"
          label="启用错题流转规则"
          color="primary"
          hide-details
        />
        <v-switch
          v-model="config.excludeMistakesFromPractice"
          label="自主练习中排除错题本题目"
          color="primary"
          hide-details
        />
        <v-divider class="my-6" />
        <div class="section-grid">
          <v-card v-for="(stage, key) in config.stages" :key="key" class="pa-4" variant="outlined">
            <h3 class="mb-4">阶段 {{ key }}</h3>
            <v-text-field v-model="stage.label" label="阶段名称" :rules="[required]" />
            <v-select
              v-model="stage.nextWrong"
              label="答错后进入"
              :items="
                Object.entries(config.stages).map(([k, v]) => ({
                  title: (v as RecordData).label,
                  value: Number(k),
                }))
              "
            />
            <v-select
              v-model="stage.nextCorrect"
              label="答对后进入"
              :items="
                Object.entries(config.stages).map(([k, v]) => ({
                  title: (v as RecordData).label,
                  value: Number(k),
                }))
              "
            />
            <v-switch
              v-model="stage.showAnswer"
              label="显示答案提示"
              color="primary"
              hide-details
            />
          </v-card>
        </div>
      </v-card-text>
    </v-card>
    <div class="page-actions">
      <span class="muted" role="status">{{ dirty ? '有未保存的配置修改' : '配置已加载' }}</span>
      <v-btn
        type="submit"
        color="primary"
        prepend-icon="mdi-content-save-outline"
        :loading="loading"
        :disabled="!dirty"
      >
        保存系统配置
      </v-btn>
    </div>
  </v-form>
  <UnsavedChangesGuard ref="changesGuard" :dirty="dirty" :busy="saving" />
  <v-snackbar :model-value="!!success" @update:model-value="success = ''">{{ success }}</v-snackbar>
</template>
