<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { request } from '../lib/api';
import { messageOf, required, type RecordData } from '../lib/types';
import { validateForm } from '../lib/forms';
import EditorDialog from './EditorDialog.vue';
const emit = defineEmits<{ changed: [] }>();
const scenes = ref<RecordData[]>([]),
  selected = ref<RecordData | null>(null),
  items = ref<RecordData[]>([]),
  dialog = ref(false),
  itemDialog = ref(false),
  saving = ref(false),
  error = ref(''),
  editId = ref(''),
  baseline = ref(''),
  deleting = ref<RecordData | null>(null);
const form = ref({ name: '', description: '', type: 'supermarket', image: '', icon: '' }),
  itemForm = ref({ name: '', price: 1, image: '' });
const dirty = computed(() => JSON.stringify(form.value) !== baseline.value);
async function load() {
  try {
    scenes.value = await request('/scenarios');
  } catch (e) {
    error.value = messageOf(e);
  }
}
function edit(scene?: RecordData) {
  editId.value = scene?.id || '';
  form.value = {
    name: scene?.name || '',
    description: scene?.description || '',
    type: scene?.type || 'supermarket',
    image: scene?.image || '',
    icon: scene?.icon || '',
  };
  baseline.value = JSON.stringify(form.value);
  dialog.value = true;
  error.value = '';
}
async function save(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event))) return;
  saving.value = true;
  try {
    await request(
      '/scenarios' + (editId.value ? '/' + editId.value : ''),
      editId.value ? 'PUT' : 'POST',
      form.value,
    );
    dialog.value = false;
    await load();
    emit('changed');
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    saving.value = false;
  }
}
async function materials(scene: RecordData) {
  try {
    items.value = await request(`/scenarios/${scene.id}/items`);
    selected.value = scene;
  } catch (e) {
    error.value = messageOf(e);
  }
}
async function addItem(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event)) || !selected.value) return;
  saving.value = true;
  try {
    await request(`/scenarios/${selected.value.id}/items`, 'POST', itemForm.value);
    itemDialog.value = false;
    await materials(selected.value);
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    saving.value = false;
  }
}
async function remove() {
  if (!deleting.value) return;
  saving.value = true;
  try {
    await request('/scenarios/' + deleting.value.id, 'DELETE');
    deleting.value = null;
    await load();
    emit('changed');
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <div class="pa-5">
    <div class="d-flex justify-space-between align-center ga-3 mb-4">
      <h2>场景与素材库</h2>
      <v-btn color="primary" @click="edit()">新增场景</v-btn>
    </div>
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <p class="muted mb-4">
      生活课程包含完整步骤。已有自定义场景和素材保留在这里，未配置任务的场景用于备课。
    </p>
    <div v-for="scene in scenes" :key="scene.id" class="library-row">
      <div>
        <strong>{{ scene.name }}</strong>
        <p class="muted">
          {{ scene.game ? '生活课程 · ' + scene.game.levels.length + ' 个任务' : '自定义素材场景' }}
        </p>
      </div>
      <div class="d-flex ga-2">
        <v-btn variant="tonal" @click="materials(scene)">查看素材</v-btn>
        <template v-if="!scene.game">
          <v-btn
            icon="mdi-pencil-outline"
            variant="text"
            :aria-label="'编辑' + scene.name"
            @click="edit(scene)"
          />
          <v-btn
            icon="mdi-trash-can-outline"
            variant="text"
            color="error"
            :aria-label="'删除' + scene.name"
            @click="deleting = scene"
          />
        </template>
      </div>
    </div>
  </div>
  <EditorDialog v-model="dialog" :dirty="dirty" :saving="saving" max-width="620" v-slot="{ close }">
    <v-card>
      <v-card-title>{{ editId ? '编辑场景' : '新增素材场景' }}</v-card-title>
      <v-form @submit.prevent="save">
        <v-card-text>
          <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
          <v-text-field v-model="form.name" label="名称" :rules="[required]" />
          <v-textarea v-model="form.description" label="说明" rows="2" />
          <v-select
            v-model="form.type"
            :items="[
              { title: '超市', value: 'supermarket' },
              { title: '餐厅', value: 'cafe' },
              { title: '准备物品', value: 'schoolbag' },
            ]"
            label="类型"
          />
          <v-text-field v-model="form.image" label="封面图片地址（可选）" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="close">取消</v-btn>
          <v-btn color="primary" type="submit" :loading="saving">保存</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </EditorDialog>
  <v-dialog :model-value="!!selected" max-width="650" @update:model-value="selected = null">
    <v-card v-if="selected" class="pa-6">
      <h2>{{ selected.name }} · 素材</h2>
      <div v-for="item in items" :key="item.id" class="library-row">
        <span>{{ item.name }}</span>
        <span>¥{{ item.price }}</span>
      </div>
      <p v-if="!items.length" class="muted my-5">还没有素材。</p>
      <div class="d-flex justify-end ga-3 mt-4">
        <v-btn
          v-if="!selected.game"
          color="primary"
          @click="
            itemForm = { name: '', price: 1, image: '' };
            itemDialog = true;
          "
        >
          添加物品
        </v-btn>
        <v-btn @click="selected = null">关闭</v-btn>
      </div>
    </v-card>
  </v-dialog>
  <EditorDialog
    v-model="itemDialog"
    :dirty="!!itemForm.name || !!itemForm.image || itemForm.price !== 1"
    :saving="saving"
    max-width="540"
    v-slot="{ close }"
  >
    <v-card>
      <v-card-title>添加物品</v-card-title>
      <v-form @submit.prevent="addItem">
        <v-card-text>
          <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
          <v-text-field v-model="itemForm.name" label="名称" :rules="[required]" />
          <v-text-field
            v-model.number="itemForm.price"
            type="number"
            min="0"
            step=".01"
            label="价格（元）"
            :rules="[(v) => (Number.isFinite(Number(v)) && Number(v) >= 0) || '价格必须为非负数']"
          />
          <v-text-field v-model="itemForm.image" label="图片地址（可选）" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="close">取消</v-btn>
          <v-btn color="primary" type="submit" :loading="saving">保存</v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </EditorDialog>
  <v-dialog
    :model-value="!!deleting"
    max-width="440"
    :persistent="saving"
    @update:model-value="deleting = null"
  >
    <v-card class="pa-6">
      <h2>删除此素材场景？</h2>
      <p class="my-4">将删除 {{ deleting?.name }} 及其素材。</p>
      <v-alert v-if="error" type="error">{{ error }}</v-alert>
      <div class="d-flex justify-end ga-2">
        <v-btn :disabled="saving" @click="deleting = null">取消</v-btn>
        <v-btn color="error" :loading="saving" @click="remove">删除</v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>
<style scoped>
.library-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #dde5d8;
  padding: 16px 0;
}
.library-row p {
  font-size: 12px;
  margin-top: 4px;
}
@media (max-width: 600px) {
  .library-row {
    flex-wrap: wrap;
  }
}
</style>
