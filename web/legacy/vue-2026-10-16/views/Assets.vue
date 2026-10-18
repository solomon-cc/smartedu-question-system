<script setup lang="ts">
import { validateForm } from '../lib/forms';
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import EditorDialog from '../components/EditorDialog.vue';
import { focusFormAlert } from '../lib/forms';
import { useRoute } from 'vue-router';
import { request, query } from '../lib/api';
import { required, messageOf, type RecordData } from '../lib/types';
import { auth } from '../stores/auth';
import { useTask } from '../lib/useData';
import PageHeader from '../components/PageHeader.vue';
import Feedback from '../components/Feedback.vue';
import EmptyState from '../components/EmptyState.vue';
import RewardGame from '../components/RewardGame.vue';
import { rewardGames, isImageSource, rewardIcons } from '../lib/rewards';
const route = useRoute(),
  reward = computed(() => route.path === '/reinforcements'),
  endpoint = computed(() => (reward.value ? '/reinforcements' : '/resources')),
  { loading, error, success, run, refresh } = useTask();
const items = ref<RecordData[]>([]),
  students = ref<RecordData[]>([]),
  search = ref(''),
  page = ref(1),
  total = ref(0),
  dialog = ref(false),
  selected = ref<RecordData | null>(null),
  deleting = ref<RecordData | null>(null),
  formError = ref(''),
  baseline = ref(''),
  saving = ref(false),
  preview = ref<RecordData | null>(null);
const resourceTypes: Record<string, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  file: '文件',
};
const blank = () => ({
  name: '',
  url: '',
  type: reward.value ? 'sticker' : 'image',
  tags: [] as string[],
  visibility: 'personal',
  image: '',
  prompt: '',
  duration: 3,
  isGlobal: true,
  targetStudentIds: [] as string[],
  ruleType: 'correct_count',
  ruleValue: 3,
  isActive: true,
});
const form = ref(blank()),
  dirty = computed(() => JSON.stringify(form.value) !== baseline.value),
  filtered = computed(() =>
    reward.value
      ? items.value.filter((x) =>
          `${x.name} ${(x.tags || []).join(' ')}`
            .toLowerCase()
            .includes(search.value.toLowerCase()),
        )
      : items.value,
  );
async function load() {
  await refresh(async () => {
    if (reward.value) items.value = (await request(endpoint.value)) || [];
    else {
      const data = await request(
        `${endpoint.value}?${query({ page: page.value, pageSize: 12, keyword: search.value.trim() })}`,
      );
      items.value = data.list || [];
      total.value = data.total;
    }
  });
}
async function edit(item?: RecordData) {
  selected.value = item || null;
  form.value = { ...blank(), ...item };
  formError.value = '';
  baseline.value = JSON.stringify(form.value);
  dialog.value = true;
  if (reward.value) {
    try {
      students.value = (await request('/students')) || [];
    } catch (e) {
      formError.value = messageOf(e);
    }
  }
}
async function save(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event)) || saving.value) return;
  if (reward.value && !form.value.isGlobal && !form.value.targetStudentIds.length) {
    formError.value = '请选择适用学生';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    await request(
      endpoint.value + (selected.value ? '/' + selected.value.id : ''),
      selected.value ? 'PUT' : 'POST',
      form.value,
    );
    dialog.value = false;
    await load();
    success.value = '已保存';
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
    await request(endpoint.value + '/' + id, 'DELETE');
    items.value = items.value.filter((x) => x.id !== id);
  }, '已删除');
  if (!reward.value) {
    if (!items.value.length && page.value > 1) page.value--;
    else await load();
  }
}
const validURL = (v: string) =>
  !v ||
  /^https?:\/\//i.test(v) ||
  /^data:image\/(png|jpeg|webp);base64,/.test(v) ||
  '请输入 http(s) 图片或媒体链接';
let debounce: ReturnType<typeof setTimeout>;
watch(page, load);
watch(search, () => {
  if (reward.value) return;
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    if (page.value === 1) load();
    else page.value = 1;
  }, 300);
});
onBeforeUnmount(() => clearTimeout(debounce));
onMounted(load);
</script>
<template>
  <PageHeader>
    <v-btn color="primary" prepend-icon="mdi-plus" @click="edit()">
      {{ reward ? '新增强化物' : '添加素材' }}
    </v-btn>
  </PageHeader>
  <Feedback :error="error" :loading="loading" @retry="load" />
  <v-card class="mb-6">
    <div class="toolbar">
      <v-text-field
        v-model="search"
        :label="reward ? '搜索强化物' : '搜索素材名称或标签'"
        prepend-inner-icon="mdi-magnify"
        hide-details
        class="search-field"
      />
      <v-spacer />
      <span class="muted">
        {{ reward ? filtered.length : total }} 个{{ reward ? '强化物' : '素材' }}
      </span>
      <v-btn icon="mdi-refresh" variant="text" aria-label="刷新素材" @click="load" />
    </div>
  </v-card>
  <div v-if="filtered.length" class="section-grid">
    <v-card v-for="item in filtered" :key="item.id">
      <button
        type="button"
        class="asset-preview"
        :aria-label="`预览 ${item.name}`"
        @click="preview = item"
      >
        <v-img
          v-if="reward ? isImageSource(item.image) : item.type === 'image'"
          :src="reward ? item.image : item.url"
          :alt="item.name"
          height="170"
          contain
        />
        <v-icon
          v-else
          :icon="
            reward
              ? 'mdi-gift-outline'
              : item.type === 'video'
                ? 'mdi-play-circle-outline'
                : 'mdi-file-outline'
          "
          size="52"
          color="primary"
        />
      </button>
      <v-card-text>
        <div class="d-flex justify-space-between align-center">
          <h3>{{ item.name }}</h3>
          <v-chip size="x-small" variant="tonal" color="primary">
            {{
              reward
                ? item.isActive
                  ? '启用'
                  : '停用'
                : item.visibility === 'public'
                  ? '公开'
                  : '个人'
            }}
          </v-chip>
        </div>
        <p class="muted mt-3">
          {{
            reward
              ? `${item.isGlobal ? '所有学生' : '指定学生'} · 每 ${item.ruleValue} 次 · ${item.type === 'game' ? '手动结束游戏' : `${item.duration} 秒`}`
              : resourceTypes[item.type] || item.type
          }}
        </p>
        <div v-if="item.tags?.length" class="d-flex ga-1 mt-3 flex-wrap">
          <v-chip v-for="tag in item.tags" :key="tag" size="x-small">{{ tag }}</v-chip>
        </div>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-btn variant="text" size="small" color="primary" @click="preview = item">预览</v-btn>
        <v-spacer />
        <v-btn
          v-if="reward || item.creatorId === auth.user?.id"
          icon="mdi-pencil-outline"
          size="small"
          :aria-label="`编辑 ${item.name}`"
          @click="edit(item)"
        />
        <v-btn
          v-if="reward || item.creatorId === auth.user?.id"
          icon="mdi-trash-can-outline"
          size="small"
          color="error"
          :aria-label="`删除 ${item.name}`"
          @click="deleting = item"
        />
      </v-card-actions>
    </v-card>
  </div>
  <v-card v-else-if="!loading && !error">
    <EmptyState
      :title="search ? '没有匹配的内容' : reward ? '准备一份鼓励' : '建立你的素材库'"
      :description="
        reward
          ? '添加图片、提示语或小游戏，配置适用学生和触发频率。'
          : '添加图片或视频链接，集中管理教学素材。'
      "
      :icon="reward ? 'mdi-gift-outline' : 'mdi-folder-image'"
    />
  </v-card>
  <v-pagination
    v-if="!reward && total > 12"
    v-model="page"
    :length="Math.ceil(total / 12)"
    :total-visible="5"
    class="mt-5"
    aria-label="素材分页"
  />
  <EditorDialog v-model="dialog" :dirty="dirty" :saving="saving" v-slot="{ close }">
    <v-card :title="`${selected ? '编辑' : '新增'}${reward ? '强化物' : '素材'}`">
      <v-form @submit.prevent="save" class="overflow-y-auto">
        <v-card-text>
          <v-alert v-if="formError" type="error" class="mb-4" data-form-error tabindex="-1">
            {{ formError }}
          </v-alert>
          <v-text-field v-model="form.name" label="名称" :rules="[required]" />
          <template v-if="reward">
            <v-select
              v-model="form.type"
              label="类型"
              :items="[
                { title: '图片 / 贴纸', value: 'sticker' },
                { title: '表扬提示', value: 'text' },
                { title: '互动游戏', value: 'game' },
                { title: '动画', value: 'animation' },
              ]"
            />
            <v-select
              v-if="form.type === 'game'"
              v-model="form.image"
              label="游戏"
              :items="rewardGames"
              :rules="[required]"
            />
            <v-combobox
              v-else
              v-model="form.image"
              label="图片链接或内置图案（选填）"
              :items="['star', 'thumbs', 'heart', 'party']"
            />
            <v-textarea v-model="form.prompt" label="鼓励语" rows="2" />
            <div class="dialog-form-grid">
              <v-select
                v-model="form.ruleType"
                label="触发规则"
                :items="[
                  { title: '累计答对次数', value: 'correct_count' },
                  { title: '固定答题次数', value: 'fixed' },
                  { title: '平均概率', value: 'average' },
                ]"
              />
              <v-text-field
                v-model.number="form.ruleValue"
                label="触发间隔"
                type="number"
                min="1"
                :rules="[(v) => (Number.isInteger(Number(v)) && Number(v) >= 1) || '请输入正整数']"
              />
              <v-text-field
                v-if="form.type !== 'game'"
                v-model.number="form.duration"
                label="展示时长（秒）"
                type="number"
                min="1"
                max="60"
                :rules="[(v) => (v >= 1 && v <= 60) || '请填写 1–60 秒']"
              />
            </div>
            <v-switch v-model="form.isGlobal" label="适用于所有学生" color="primary" />
            <v-autocomplete
              v-if="!form.isGlobal"
              v-model="form.targetStudentIds"
              label="适用学生"
              :items="students.map((s) => ({ title: s.name || s.username, value: s.id }))"
              multiple
              chips
              :rules="[required]"
            />
            <v-switch v-model="form.isActive" label="启用强化物" color="primary" hide-details />
          </template>
          <template v-else>
            <v-select
              v-model="form.type"
              label="素材类型"
              :items="[
                { title: '图片', value: 'image' },
                { title: '视频', value: 'video' },
                { title: '音频', value: 'audio' },
                { title: '其他文件', value: 'file' },
              ]"
            />
            <v-text-field v-model="form.url" label="素材链接" :rules="[required, validURL]" />
            <v-combobox
              v-model="form.tags"
              label="标签（输入后按回车）"
              multiple
              chips
              closable-chips
            />
            <v-select
              v-model="form.visibility"
              label="可见范围"
              :items="[
                { title: '仅自己', value: 'personal' },
                { title: '公开共享', value: 'public' },
              ]"
            />
          </template>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn :disabled="saving" @click="close">取消</v-btn>
          <v-btn type="submit" color="primary" variant="flat" :loading="saving">保存</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </EditorDialog>
  <v-dialog :model-value="!!deleting" @update:model-value="deleting = null" max-width="420">
    <v-card title="确认删除？">
      <v-card-text>将删除「{{ deleting?.name }}」，此操作无法撤销。</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="deleting = null">取消</v-btn>
        <v-btn color="error" @click="remove">确认删除</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog :model-value="!!preview" @update:model-value="preview = null">
    <v-card v-if="preview" :title="preview.name">
      <v-card-text class="text-center">
        <v-img
          v-if="reward ? isImageSource(preview.image) : preview.type === 'image'"
          :src="reward ? preview.image : preview.url"
          :alt="preview.name"
          max-height="380"
        />
        <video
          v-else-if="preview.type === 'video'"
          :src="preview.url"
          controls
          style="width: 100%"
        />
        <audio v-else-if="preview.type === 'audio'" :src="preview.url" controls />
        <v-btn
          v-else-if="!reward"
          :href="/^https?:\/\//.test(preview.url) ? preview.url : undefined"
          target="_blank"
          rel="noopener noreferrer"
        >
          打开素材
        </v-btn>
        <RewardGame v-if="reward && preview.type === 'game'" :game="preview.image || 'breath'" />
        <v-icon
          v-else-if="reward && !isImageSource(preview.image)"
          :icon="rewardIcons[preview.image] || 'mdi-star-circle-outline'"
          size="64"
          color="secondary"
        />
        <h2 v-if="reward && preview.type !== 'game'" class="mt-5">
          {{ preview.prompt || '做得很好，继续加油！' }}
        </h2>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="preview = null">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-snackbar :model-value="!!success" @update:model-value="success = ''">{{ success }}</v-snackbar>
</template>
<style scoped>
.asset-preview {
  width: 100%;
  border: 0;
  font: inherit;
  color: inherit;
  height: 190px;
  background: rgba(var(--v-theme-primary), 0.04);
  display: grid;
  place-items: center;
  padding: 12px;
  cursor: pointer;
}
.asset-preview .v-img {
  width: 100%;
}
</style>
