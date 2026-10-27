<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Message, Modal } from '@arco-design/web-vue';
import { IconPlus, IconStar } from '@arco-design/web-vue/es/icon';
import { api, message } from '../lib/api';
import type { User } from '../lib/auth';
import { rewardGames, rewardImage } from '../lib/rewards';
import { vFieldLabel } from '../lib/fieldLabel';
import PageState from '../components/PageState.vue';
import { useLeaveGuard } from '../components/useLeaveGuard';
interface Reward {
  id: string;
  name: string;
  type: string;
  image: string;
  prompt: string;
  duration: number;
  isGlobal: boolean;
  targetStudentIds: string[];
  ruleType: string;
  ruleValue: number;
  isActive: boolean;
}
const types = [
  { label: '图片 / 贴纸', value: 'sticker' },
  { label: '表扬提示', value: 'text' },
  { label: '互动游戏', value: 'game' },
  { label: '动画', value: 'animation' },
];
const rules = [
  { label: '累计答对次数', value: 'correct_count' },
  { label: '固定答题次数', value: 'fixed' },
  { label: '平均概率间隔', value: 'average' },
];
const fresh = (): Reward => ({
  id: '',
  name: '',
  type: 'text',
  image: '',
  prompt: '做得很好，继续加油！',
  duration: 3,
  isGlobal: true,
  targetStudentIds: [],
  ruleType: 'correct_count',
  ruleValue: 3,
  isActive: true,
});
const items = ref<Reward[]>([]),
  students = ref<User[]>([]),
  loading = ref(true),
  error = ref(''),
  search = ref(''),
  dialog = ref(false),
  saving = ref(false),
  formError = ref(''),
  form = ref(fresh()),
  baseline = ref(''),
  studentsLoading = ref(true),
  studentsError = ref('');
const visible = computed(() =>
  items.value.filter((x) =>
    `${x.name} ${x.prompt}`.toLowerCase().includes(search.value.trim().toLowerCase()),
  ),
);
const guard = useLeaveGuard(
  () => dialog.value && JSON.stringify(form.value) !== baseline.value,
  () => saving.value,
);
const imageSource = rewardImage;
async function load() {
  loading.value = true;
  error.value = '';
  try {
    items.value = (await api<Reward[]>('/portal/manage/reinforcements')) || [];
  } catch (e) {
    error.value = message(e);
  } finally {
    loading.value = false;
  }
}
async function loadStudents() {
  studentsLoading.value = true;
  studentsError.value = '';
  try {
    students.value = (await api<User[]>('/portal/students')) || [];
  } catch (e) {
    studentsError.value = message(e);
  } finally {
    studentsLoading.value = false;
  }
}
function edit(item?: Reward) {
  form.value = item
    ? { ...fresh(), ...item, targetStudentIds: [...(item.targetStudentIds || [])] }
    : fresh();
  baseline.value = JSON.stringify(form.value);
  formError.value = '';
  dialog.value = true;
}
async function close() {
  if (await guard.confirm()) dialog.value = false;
}
async function save() {
  if (saving.value) return;
  if (form.value.type === 'game' && !rewardGames.some((g) => g.value === form.value.image)) {
    formError.value = '请选择一种互动游戏';
    return;
  }
  if (!form.value.isGlobal && (studentsLoading.value || studentsError.value)) {
    formError.value = '请先重试加载学生列表';
    return;
  }
  if (!form.value.name.trim() || (!form.value.isGlobal && !form.value.targetStudentIds.length)) {
    formError.value = '填写强化物名称，并选择适用学生';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    await api(
      '/portal/manage/reinforcements' + (form.value.id ? '/' + form.value.id : ''),
      form.value.id ? 'PUT' : 'POST',
      form.value,
    );
    dialog.value = false;
    await load();
    Message.success('强化物已保存');
  } catch (e) {
    formError.value = message(e);
  } finally {
    saving.value = false;
  }
}
function remove(item: Reward) {
  Modal.warning({
    title: '删除这个强化物？',
    content: `“${item.name}”删除后将不能恢复。`,
    okText: '删除',
    cancelText: '取消',
    hideCancel: false,
    onOk: async () => {
      try {
        await api('/portal/manage/reinforcements/' + item.id, 'DELETE');
        await load();
        Message.success('已删除');
      } catch (e) {
        Message.error(message(e));
      }
    },
  });
}
onMounted(() => {
  void load();
  void loadStudents();
});
</script>
<template>
  <section class="container section management">
    <div class="page-heading">
      <div>
        <h1>强化物管理</h1>
      </div>
      <a-button type="primary" size="large" @click="edit()">
        <IconPlus />
        新增强化物
      </a-button>
    </div>
    <a-input-search
      v-model="search"
      placeholder="搜索名称或鼓励语"
      :input-attrs="{ 'aria-label': '搜索强化物' }"
      class="member-search"
    />
    <PageState
      :loading="loading"
      :error="error"
      :empty="!visible.length"
      title="暂无匹配的强化物"
      @retry="load"
    />
    <div v-if="!loading && !error" class="reward-grid">
      <article v-for="item in visible" :key="item.id" class="reward-card">
        <div class="reward-visual">
          <img v-if="imageSource(item.image)" :src="item.image" alt="" loading="lazy" />
          <IconStar v-else />
          <a-tag :color="item.isActive ? 'green' : 'gray'">
            {{ item.isActive ? '已启用' : '已停用' }}
          </a-tag>
        </div>
        <h2>{{ item.name }}</h2>
        <p class="reward-prompt">{{ item.prompt || '未设置鼓励语' }}</p>
        <dl>
          <div>
            <dt>类型</dt>
            <dd>{{ types.find((x) => x.value === item.type)?.label || item.type }}</dd>
          </div>
          <div>
            <dt>适用范围</dt>
            <dd>
              {{ item.isGlobal ? '所有学生' : `${item.targetStudentIds?.length || 0} 位指定学生` }}
            </dd>
          </div>
          <div>
            <dt>触发</dt>
            <dd>
              {{ rules.find((x) => x.value === item.ruleType)?.label }} · {{ item.ruleValue }}
            </dd>
          </div>
        </dl>
        <footer>
          <a-button @click="edit(item)">编辑</a-button>
          <a-button status="danger" type="text" @click="remove(item)">删除</a-button>
        </footer>
      </article>
    </div>
    <a-modal
      :visible="dialog"
      :width="620"
      :footer="false"
      :mask-closable="false"
      :esc-to-close="false"
      :closable="!saving"
      :title="form.id ? '编辑强化物' : '新增强化物'"
      @cancel="close"
    >
      <a-form class="dialog-form" :model="form" layout="vertical" :disabled="saving" @submit="save">
        <a-alert v-if="formError" type="error">{{ formError }}</a-alert>
        <a-form-item label="名称" required>
          <a-input
            v-model="form.name"
            :max-length="100"
            :input-attrs="{ 'aria-label': '强化物名称' }"
          />
        </a-form-item>
        <div class="form-grid">
          <a-form-item v-field-label="'强化物类型'" label="类型">
            <a-select
              v-model="form.type"
              :options="types"
              aria-label="强化物类型"
              @change="form.image = form.type === 'game' ? 'breath' : ''"
            />
          </a-form-item>
          <a-form-item v-field-label="'强化物状态'" label="状态">
            <a-select
              v-model="form.isActive"
              :options="[
                { label: '启用', value: true },
                { label: '停用', value: false },
              ]"
              aria-label="强化物状态"
            />
          </a-form-item>
        </div>
        <a-form-item v-field-label="'鼓励语'" label="鼓励语">
          <a-textarea
            v-model="form.prompt"
            :max-length="1000"
            :input-attrs="{ 'aria-label': '鼓励语' }"
          />
        </a-form-item>
        <a-form-item
          v-field-label="'强化物内容'"
          :label="form.type === 'game' ? '小游戏' : '图片链接或图案标识'"
          :help="
            form.type === 'game'
              ? '完成后可直接返回练习。'
              : '可填写 http(s) 图片链接，或 star、thumbs、heart、party。'
          "
        >
          <a-select v-if="form.type === 'game'" v-model="form.image" :options="rewardGames" />
          <a-input v-else v-model="form.image" :input-attrs="{ 'aria-label': '强化物内容' }" />
        </a-form-item>
        <div class="form-grid">
          <a-form-item v-field-label="'触发规则'" label="触发规则">
            <a-select v-model="form.ruleType" :options="rules" aria-label="触发规则" />
          </a-form-item>
          <a-form-item v-field-label="'间隔次数'" label="间隔次数">
            <a-input-number
              v-model="form.ruleValue"
              :min="1"
              :max="1000"
              :precision="0"
              aria-label="间隔次数"
            />
          </a-form-item>
        </div>
        <a-form-item v-field-label="'展示时长'" label="展示时长（秒）">
          <a-input-number
            v-model="form.duration"
            :min="1"
            :max="300"
            :precision="0"
            aria-label="展示时长"
          />
        </a-form-item>
        <a-form-item label="适用范围">
          <a-radio-group v-model="form.isGlobal">
            <a-radio :value="true">所有学生</a-radio>
            <a-radio :value="false">指定学生</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="!form.isGlobal" v-field-label="'适用学生'" label="学生" required>
          <a-select
            v-model="form.targetStudentIds"
            :loading="studentsLoading"
            :disabled="saving || studentsLoading || !!studentsError"
            multiple
            allow-search
            :options="students.map((s) => ({ label: s.name || s.username, value: s.id }))"
            aria-label="适用学生"
          />
          <a-alert v-if="studentsError" type="error">
            {{ studentsError }}
            <a-button @click="loadStudents">重试加载学生</a-button>
          </a-alert>
        </a-form-item>
        <div class="dialog-actions">
          <a-button :disabled="saving" @click="close">取消</a-button>
          <a-button html-type="submit" type="primary" :loading="saving">保存</a-button>
        </div>
      </a-form>
    </a-modal>
  </section>
</template>
<style scoped>
.reward-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  margin-top: 28px;
}
.reward-card {
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 24px;
  min-width: 0;
}
.reward-visual {
  height: 112px;
  background: var(--soft);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 6px;
  margin-bottom: 20px;
}
.reward-visual > svg {
  font-size: 48px;
  color: var(--brand);
}
.reward-visual img {
  max-width: 100%;
  height: 100%;
  object-fit: contain;
}
.reward-visual .arco-tag {
  position: absolute;
  top: 10px;
  right: 10px;
}
.reward-card h2 {
  font-size: 20px;
  margin-bottom: 12px;
}
.reward-prompt {
  color: var(--muted);
  font-size: 14px;
  line-height: 1.8;
  min-height: 50px;
  overflow-wrap: anywhere;
}
.reward-card dl {
  font-size: 13px;
  margin: 18px 0;
}
.reward-card dl > div {
  display: flex;
  gap: 16px;
  padding: 6px 0;
}
.reward-card dt {
  color: var(--muted);
  min-width: 56px;
}
.reward-card dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.reward-card footer {
  display: flex;
  gap: 12px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
@media (max-width: 1050px) {
  .reward-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .reward-grid {
    grid-template-columns: 1fr;
  }
}
</style>
