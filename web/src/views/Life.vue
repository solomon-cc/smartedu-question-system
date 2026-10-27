<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { IconArrowRight, IconPlayArrow } from '@arco-design/web-vue/es/icon';
import { auth, canModule, type User } from '../lib/auth';
import { api, message, query } from '../lib/api';
import type { GameScenario, GameSession, GameResult, GameSummary } from '../lib/lifeGames';
import PageState from '../components/PageState.vue';
import LifePlayer from '../components/LifePlayer.vue';
const route = useRoute();
const previewOnly = computed(() => auth.user?.role === 'TEACHER' && route.query.mode === 'preview');
const own = computed(() => auth.user?.role === 'STUDENT');
const scenarios = ref<GameScenario[]>([]),
  students = ref<User[]>([]),
  records = ref<GameSummary[]>([]),
  loading = ref(true),
  error = ref(''),
  historyError = ref(''),
  historyLoading = ref(false),
  studentsError = ref(''),
  busy = ref(false),
  dialog = ref(false),
  selected = ref<GameScenario | null>(null),
  levelId = ref(''),
  studentId = ref(''),
  player = ref<GameSession | null>(null),
  page = ref(1),
  total = ref(0),
  formError = ref('');
let sequence = 0;
async function history() {
  if (previewOnly.value) return;
  const seq = ++sequence;
  historyLoading.value = true;
  historyError.value = '';
  try {
    const d = await api<{ list: GameSummary[]; total: number }>(
      '/scenario-sessions?' + query({ studentId: studentId.value, page: page.value, pageSize: 10 }),
    );
    if (seq === sequence) {
      records.value = d.list;
      total.value = d.total;
    }
  } catch (e) {
    if (seq === sequence) historyError.value = message(e);
  } finally {
    if (seq === sequence) historyLoading.value = false;
  }
}
async function loadStudents() {
  studentsError.value = '';
  if (!previewOnly.value && !own.value && canModule('students'))
    try {
      students.value = (await api<User[]>('/students')) || [];
    } catch (e) {
      studentsError.value = message(e);
    }
}
async function load() {
  loading.value = true;
  error.value = '';
  try {
    scenarios.value = ((await api<GameScenario[]>('/scenarios')) || []).filter(
      (s) => s.game?.levels?.length,
    );
  } catch (e) {
    error.value = message(e);
  } finally {
    loading.value = false;
  }
}
function choose(scene: GameScenario) {
  selected.value = scene;
  levelId.value = scene.game!.levels[0]!.id;
  formError.value = '';
  dialog.value = true;
}
async function start(preview = false) {
  if (previewOnly.value) preview = true;
  if (!selected.value || busy.value) return;
  if (!preview && !own.value && !studentId.value) {
    formError.value = '请选择学生';
    return;
  }
  busy.value = true;
  formError.value = '';
  try {
    player.value = preview
      ? (
          await api<GameResult>(`/scenarios/${selected.value.id}/preview`, 'POST', {
            levelId: levelId.value,
            actions: [],
          })
        ).session
      : await api<GameSession>('/scenario-sessions', 'POST', {
          scenarioId: selected.value.id,
          levelId: levelId.value,
          studentId: studentId.value,
        });
    dialog.value = false;
  } catch (e) {
    formError.value = message(e);
  } finally {
    busy.value = false;
  }
}
async function open(record: GameSummary) {
  if (busy.value) return;
  busy.value = true;
  historyError.value = '';
  try {
    player.value = await api<GameSession>('/scenario-sessions/' + record.id);
  } catch (e) {
    historyError.value = message(e);
  } finally {
    busy.value = false;
  }
}
function closePlayer() {
  player.value = null;
  void history();
}
watch(studentId, () => {
  page.value = 1;
  void history();
});
watch(page, history);
onMounted(() => {
  void load();
  void loadStudents();
  void history();
});
</script>
<template>
  <section class="container section life-page">
    <LifePlayer v-if="player" :key="player.id" :initial="player" @close="closePlayer" />
    <template v-else>
      <div class="page-heading"><h1>生活</h1></div>
      <a-alert v-if="studentsError" type="error" class="mb-24">
        {{ studentsError }}
        <a-button @click="loadStudents">重试学生列表</a-button>
      </a-alert>
      <PageState
        :loading="loading"
        :error="error"
        :empty="!scenarios.length"
        title="暂无生活场景"
        @retry="load"
      />
      <div v-if="!loading && !error" class="life-grid">
        <article v-for="scene in scenarios" :key="scene.id" class="life-card">
          <img
            v-if="scene.game?.background"
            :src="scene.game.background"
            :alt="scene.name + '场景'"
            loading="lazy"
          />
          <div>
            <h2>{{ scene.name }}</h2>
            <p>{{ scene.description }}</p>
            <div class="life-card-footer">
              <span>{{ scene.game?.levels.length }} 个任务</span>
              <a-button type="primary" @click="choose(scene)">
                <IconPlayArrow />
                {{ own ? '开始练习' : '选择任务' }}
              </a-button>
            </div>
          </div>
        </article>
      </div>
      <section v-if="!previewOnly" class="life-history">
        <div class="section-heading compact">
          <h2>{{ own ? '我的练习记录' : '练习记录' }}</h2>
          <label v-if="!own && students.length">
            学生
            <select v-model="studentId" aria-label="筛选生活练习学生">
              <option value="">全部学生</option>
              <option v-for="student in students" :key="student.id" :value="student.id">
                {{ student.name || student.username }}
              </option>
            </select>
          </label>
        </div>
        <PageState
          :loading="historyLoading"
          :error="historyError"
          :empty="!records.length"
          title="暂无练习记录"
          @retry="history"
        />
        <div v-if="!historyLoading && !historyError && records.length" class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th v-if="!own">学生</th>
                <th>场景任务</th>
                <th>进度</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id">
                <td v-if="!own">{{ record.studentName }}</td>
                <td>
                  {{ record.scenarioName }}
                  <small class="record-level">{{ record.levelName }}</small>
                </td>
                <td>
                  {{
                    record.status === 'completed'
                      ? '已完成'
                      : `${record.stepsCompleted} / ${record.totalSteps} 步`
                  }}
                </td>
                <td>{{ new Date(record.startedAt).toLocaleString('zh-CN') }}</td>
                <td>
                  <a-button type="text" :disabled="busy" @click="open(record)">
                    {{ record.status === 'ongoing' ? '继续 / 查看' : '查看记录' }}
                    <IconArrowRight />
                  </a-button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <a-pagination
          v-if="total > 10"
          v-model:current="page"
          :total="total"
          :page-size="10"
          :show-total="true"
        />
      </section>
    </template>
  </section>
  <a-modal
    :visible="dialog"
    :title="selected?.name || '选择任务'"
    :footer="false"
    :mask-closable="false"
    :closable="!busy"
    @cancel="dialog = false"
  >
    <form class="life-form" @submit.prevent="start()">
      <a-alert v-if="formError" type="error">{{ formError }}</a-alert>
      <label>
        任务
        <select v-model="levelId" aria-label="生活任务" :disabled="busy">
          <option v-for="level in selected?.game?.levels" :key="level.id" :value="level.id">
            {{ level.name }}
          </option>
        </select>
      </label>
      <p class="muted">{{ selected?.game?.levels.find((l) => l.id === levelId)?.goal }}</p>
      <label v-if="!previewOnly && !own && canModule('students')">
        学生
        <select v-model="studentId" aria-label="练习学生" :disabled="busy">
          <option value="">请选择学生</option>
          <option v-for="student in students" :key="student.id" :value="student.id">
            {{ student.name || student.username }}
          </option>
        </select>
      </label>
      <div class="dialog-actions">
        <a-button :disabled="busy" @click="dialog = false">取消</a-button>
        <a-button v-if="!own" :loading="busy" @click="start(true)">预览任务</a-button>
        <a-button
          v-if="!previewOnly && (own || canModule('students'))"
          type="primary"
          html-type="submit"
          :loading="busy"
        >
          {{ own ? '开始练习' : '开始指导' }}
        </a-button>
      </div>
    </form>
  </a-modal>
</template>
<style scoped>
.life-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
.life-card {
  border: 1px solid var(--line);
  border-radius: 6px;
  overflow: hidden;
}
.life-card > img {
  width: 100%;
  aspect-ratio: 16/8;
  object-fit: cover;
  display: block;
}
.life-card > div {
  padding: 20px;
}
.life-card h2 {
  font-size: 21px;
}
.life-card p {
  font-size: 14px;
  color: var(--muted);
  margin: 12px 0 20px;
}
.life-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.life-card-footer > span {
  font-size: 13px;
  color: var(--muted);
}
.life-history {
  margin-top: 32px;
}
.life-history label {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 14px;
}
.record-level {
  display: block;
  color: var(--muted);
  margin-top: 4px;
}
.life-form {
  display: grid;
  gap: 20px;
}
.life-form label {
  display: grid;
  gap: 8px;
}
select {
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 10px 12px;
  min-height: 44px;
  background: white;
  color: var(--ink);
  font: inherit;
}
.life-form select {
  width: 100%;
}
.arco-pagination {
  margin-top: 20px;
}
@media (max-width: 900px) {
  .life-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .life-grid {
    grid-template-columns: 1fr;
  }
  .life-history .section-heading {
    flex-wrap: wrap;
  }
}
</style>
