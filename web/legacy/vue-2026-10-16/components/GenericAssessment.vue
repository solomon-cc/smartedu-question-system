<script setup lang="ts">
import {
  IslandButton,
  IslandCard,
  IslandInput,
  IslandTextarea,
  IslandSelect,
  IslandDialog,
} from './island';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { auth, can } from '../stores/auth';
import { request } from '../lib/api';
import {
  assessmentClient,
  responseLabel,
  type AssessmentDefinition,
  type AssessmentMethodInfo,
  type AssessmentRecord,
  type AssessmentResponse,
  type AssessmentItem,
} from '../lib/assessments';
import { required, messageOf, type User } from '../lib/types';
import { validateForm } from '../lib/forms';
import PageHeader from './PageHeader.vue';
import Feedback from './Feedback.vue';
import EmptyState from './EmptyState.vue';
import EditorDialog from './EditorDialog.vue';
const props = defineProps<{ method: AssessmentMethodInfo }>();
const route = useRoute(),
  client = assessmentClient(props.method.id);
const records = ref<AssessmentRecord[]>([]),
  students = ref<User[]>([]),
  definition = ref<AssessmentDefinition | null>(null),
  selected = ref<AssessmentRecord | null>(null),
  responses = ref<AssessmentResponse[]>([]);
const loading = ref(false),
  error = ref(''),
  notice = ref('');
const writer = computed(() => ['ADMIN', 'TEACHER'].includes(auth.user?.role || ''));
const numeric = computed(
  () =>
    props.method.renderer === 'numeric' &&
    !!definition.value &&
    ((definition.value.scoring.options?.length || 0) > 0 ||
      (definition.value.scoring.min !== undefined && definition.value.scoring.max !== undefined)),
);
const items = computed(
  () => definition.value?.items.filter((i) => i.module === selected.value?.module) || [],
);
const recorded = computed(
  () =>
    new Set(
      responses.value.filter((r) => items.value.some((i) => i.code === r.code)).map((r) => r.code),
    ).size,
);
const createOpen = ref(false),
  createBusy = ref(false),
  formError = ref(''),
  createForm = ref({
    studentId: String(route.query.studentId || ''),
    module: '',
    version: props.method.currentVersion,
  });
const creatingBaseline = ref('');
let requestSequence = 0;
async function load() {
  const sequence = ++requestSequence;
  loading.value = true;
  error.value = '';
  try {
    const [list, def] = await Promise.all([
      client.list(writer.value ? String(route.query.studentId || '') : undefined),
      client.catalog(createForm.value.version),
    ]);
    if (sequence !== requestSequence) return;
    records.value = list;
    definition.value = def;
    if (!createForm.value.module || !def.modules.some((m) => m.id === createForm.value.module))
      createForm.value.module = def.modules[0]?.id || '';
    if (writer.value && can('students')) {
      const list = await request<User[]>('/students');
      if (sequence === requestSequence) students.value = list;
    }
  } catch (e) {
    if (sequence === requestSequence) error.value = messageOf(e);
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}
async function view(record: AssessmentRecord) {
  const sequence = ++requestSequence;
  loading.value = true;
  error.value = '';
  try {
    const [scores, def] = await Promise.all([
      client.responses(record.id),
      client.catalog(record.version),
    ]);
    if (sequence !== requestSequence) return;
    selected.value = record;
    definition.value = def;
    responses.value = scores;
  } catch (e) {
    if (sequence === requestSequence) error.value = messageOf(e);
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}
async function openCreate() {
  await load();
  if (!numeric.value || error.value) return;
  creatingBaseline.value = JSON.stringify(createForm.value);
  formError.value = '';
  createOpen.value = true;
}
async function create(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event)) || createBusy.value || loading.value || !numeric.value) return;
  createBusy.value = true;
  formError.value = '';
  try {
    const record = await client.create(
      createForm.value.studentId,
      createForm.value.module,
      createForm.value.version,
    );
    createOpen.value = false;
    records.value = [record, ...records.value];
    await view(record);
  } catch (e) {
    formError.value = messageOf(e);
  } finally {
    createBusy.value = false;
  }
}
const item = ref<AssessmentItem | null>(null),
  responseOpen = ref(false),
  responseBusy = ref(false),
  teacherPanel = ref(true);
const responseForm = ref<AssessmentResponse>({ code: '', score: null, response: '', notes: '' }),
  responseBaseline = ref('');
function edit(i: AssessmentItem) {
  item.value = i;
  responseForm.value = {
    ...(responses.value.find((r) => r.code === i.code) || {
      code: i.code,
      score: null,
      response: '',
      notes: '',
    }),
  };
  responseBaseline.value = JSON.stringify(responseForm.value);
  formError.value = '';
  teacherPanel.value = true;
  responseOpen.value = true;
}
async function save(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event)) || responseBusy.value || !selected.value) return;
  responseBusy.value = true;
  formError.value = '';
  try {
    const saved = await client.save(selected.value.id, {
      ...responseForm.value,
      score: Number(responseForm.value.score),
    });
    responses.value = [...responses.value.filter((r) => r.code !== saved.code), saved];
    responseOpen.value = false;
    notice.value = '反应记录已保存';
  } catch (e) {
    formError.value = messageOf(e);
  } finally {
    responseBusy.value = false;
  }
}
const finishOpen = ref(false);
async function finish() {
  if (!selected.value || loading.value) return;
  loading.value = true;
  error.value = '';
  try {
    selected.value = await client.complete(selected.value.id);
    records.value = records.value.map((r) => (r.id === selected.value?.id ? selected.value! : r));
    finishOpen.value = false;
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    loading.value = false;
  }
}
watch(() => createForm.value.version, load);
onMounted(async () => {
  await load();
  if (error.value) return;
  const record = records.value.find((r) => r.id === route.query.assessmentId);
  if (record) await view(record);
  else if (route.query.assessmentId) error.value = '未找到该方法下的评估记录';
  else if (route.query.new === '1' && writer.value) openCreate();
});
</script>
<template>
  <PageHeader>
    <IslandButton
      v-if="route.query.studentId && can('students')"
      variant="outlined"
      :to="`/students/${encodeURIComponent(String(route.query.studentId))}`"
    >
      学生档案
    </IslandButton>
    <IslandButton v-if="selected" variant="outlined" :disabled="loading" @click="selected = null">
      返回列表
    </IslandButton>
    <IslandButton
      v-else-if="writer"
      color="primary"
      :disabled="loading || !numeric"
      @click="openCreate"
    >
      新建 {{ method.name }}
    </IslandButton>
  </PageHeader>
  <Feedback :error="error" :loading="loading" @retry="selected ? view(selected) : load()" />
  <v-alert v-if="definition && !numeric && writer" type="info" variant="tonal" class="mb-4">
    此方法需要专用施测界面，当前可回看已有记录。
  </v-alert>
  <IslandCard v-if="selected" class="pa-6">
    <div class="d-flex justify-space-between align-center flex-wrap ga-3">
      <div>
        <h2>
          {{ method.name }} ·
          {{ definition?.modules.find((m) => m.id === selected?.module)?.name || selected.module }}
        </h2>
        <p class="muted">
          {{ selected.date }} · {{ selected.version }} ·
          {{ selected.status === 'completed' ? '已完成 · 只读' : '评估中' }}
        </p>
      </div>
      <IslandButton
        v-if="writer && selected.status === 'ongoing' && numeric"
        color="primary"
        :disabled="loading || !recorded"
        @click="finishOpen = true"
      >
        复核并完成
      </IslandButton>
    </div>
    <p class="my-4">
      已记录 {{ recorded }} / {{ items.length }} 项，未评 {{ items.length - recorded }} 项
    </p>
    <p v-if="writer" class="muted mb-4">{{ definition?.instructions }}</p>
    <IslandButton
      v-if="
        writer &&
        selected.status === 'completed' &&
        method.canLinkTargets &&
        can('students') &&
        can('ability_tracking')
      "
      variant="outlined"
      class="mb-4"
      :to="{
        path: `/students/${encodeURIComponent(selected.studentId)}`,
        query: { assessmentId: selected.id, methodId: method.id },
      }"
    >
      从评估发现确认目标
    </IslandButton>
    <div v-for="i in items" :key="i.code" class="generic-item">
      <div>
        <h3>{{ writer ? i.title : '任务 ' + (items.indexOf(i) + 1) }}</h3>
        <p class="muted">
          {{
            responseLabel(responses.find((r) => r.code === i.code) || null, definition || undefined)
          }}
        </p>
        <p v-if="writer && responses.find((r) => r.code === i.code)?.response">
          {{ responses.find((r) => r.code === i.code)?.response }}
        </p>
      </div>
      <IslandButton
        v-if="writer"
        variant="tonal"
        :disabled="!numeric || selected.status === 'completed'"
        @click="edit(i)"
      >
        记录反应
      </IslandButton>
    </div>
  </IslandCard>
  <div v-else-if="!loading && !error" class="section-grid">
    <IslandCard v-for="record in records" :key="record.id" class="pa-6">
      <h2>{{ method.name }}</h2>
      <p class="muted my-3">
        {{ record.date }} · {{ record.module }} ·
        {{ record.status === 'completed' ? '已完成' : '评估中' }}
      </p>
      <IslandButton variant="tonal" @click="view(record)">查看记录</IslandButton>
    </IslandCard>
    <EmptyState
      v-if="!records.length"
      title="暂无评估记录"
      description="由老师带领完成评估后，会保留本次记录。"
    />
  </div>
  <EditorDialog
    v-model="createOpen"
    :dirty="JSON.stringify(createForm) !== creatingBaseline"
    :saving="createBusy"
    v-slot="{ close }"
  >
    <IslandCard :title="`新建 ${method.name}`">
      <v-form @submit.prevent="create">
        <v-card-text>
          <v-alert v-if="formError" type="error" role="alert" class="mb-4">{{ formError }}</v-alert>
          <v-autocomplete
            v-model="createForm.studentId"
            :items="students"
            item-title="name"
            item-value="id"
            label="学生"
            :rules="[required]"
            :disabled="createBusy"
          />
          <IslandSelect
            v-model="createForm.version"
            :items="method.versions"
            label="材料版本"
            :rules="[required]"
            :disabled="createBusy"
          />
          <IslandSelect
            v-model="createForm.module"
            :items="definition?.modules || []"
            item-title="name"
            item-value="id"
            label="评估模块"
            :rules="[required]"
            :disabled="createBusy"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <IslandButton :disabled="createBusy" @click="close">取消</IslandButton>
          <IslandButton
            type="submit"
            color="primary"
            variant="flat"
            :loading="createBusy"
            :disabled="loading"
          >
            创建评估
          </IslandButton>
        </v-card-actions>
      </v-form>
    </IslandCard>
  </EditorDialog>
  <EditorDialog
    v-model="responseOpen"
    :dirty="JSON.stringify(responseForm) !== responseBaseline"
    :saving="responseBusy"
    :max-width="960"
    v-slot="{ close }"
  >
    <IslandCard :title="item?.title">
      <v-form @submit.prevent="save">
        <v-card-text>
          <IslandButton variant="outlined" class="mb-4" @click="teacherPanel = !teacherPanel">
            {{ teacherPanel ? '展示给学生' : '返回老师记录' }}
          </IslandButton>
          <div v-if="item?.materials?.length" class="generic-materials">
            <img
              v-for="url in item.materials"
              :key="url"
              :src="url"
              :alt="item.title + '题目材料'"
            />
          </div>
          <template v-if="teacherPanel">
            <p class="my-4">{{ item?.script }}</p>
            <v-alert v-if="formError" type="error" role="alert" class="mb-4">
              {{ formError }}
            </v-alert>
            <IslandSelect
              v-if="definition?.scoring.options?.length"
              v-model="responseForm.score"
              :label="definition.scoring.label"
              :items="definition.scoring.options"
              :rules="[required]"
              :disabled="responseBusy"
            />
            <IslandInput
              v-else
              v-model="responseForm.score"
              type="number"
              :label="definition?.scoring.label"
              :min="definition?.scoring.min"
              :max="definition?.scoring.max"
              :step="definition?.scoring.step || 'any'"
              :rules="[required]"
              :disabled="responseBusy"
            />
            <IslandTextarea
              :disabled="responseBusy"
              v-model="responseForm.response"
              label="实际反应"
              rows="2"
              maxlength="4000"
            />
            <IslandTextarea
              :disabled="responseBusy"
              v-model="responseForm.notes"
              label="备注"
              rows="2"
              maxlength="4000"
            />
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <IslandButton :disabled="responseBusy" @click="close">关闭</IslandButton>
          <IslandButton
            v-if="teacherPanel"
            type="submit"
            color="primary"
            variant="flat"
            :loading="responseBusy"
          >
            保存记录
          </IslandButton>
        </v-card-actions>
      </v-form>
    </IslandCard>
  </EditorDialog>
  <IslandDialog v-model="finishOpen" max-width="480" :persistent="loading">
    <IslandCard title="复核并完成评估">
      <v-card-text>
        <v-alert v-if="error" type="error" class="mb-4" role="alert">{{ error }}</v-alert>
        请核对本次反应记录。完成条件由该评估方法的规则检查，完成后记录为只读。
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <IslandButton :disabled="loading" @click="finishOpen = false">取消</IslandButton>
        <IslandButton color="primary" variant="flat" :loading="loading" @click="finish">
          确认完成
        </IslandButton>
      </v-card-actions>
    </IslandCard>
  </IslandDialog>
  <v-snackbar :model-value="!!notice" @update:model-value="notice = ''">{{ notice }}</v-snackbar>
</template>
<style scoped>
.generic-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 0;
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}
.generic-materials {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
}
.generic-materials img {
  width: auto;
  max-width: 100%;
  max-height: 420px;
  object-fit: contain;
}
</style>
