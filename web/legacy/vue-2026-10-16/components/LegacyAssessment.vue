<script setup lang="ts">
import { IslandButton, IslandCard } from './island';
import { onMounted, ref } from 'vue';
import { auth, can } from '../stores/auth';
import { request } from '../lib/api';
import { useTask } from '../lib/useData';
import type { RecordData } from '../lib/types';
import PageHeader from './PageHeader.vue';
import Feedback from './Feedback.vue';
import EmptyState from './EmptyState.vue';
const { loading, error, run } = useTask();
const items = ref<RecordData[]>([]),
  students = ref<RecordData[]>([]),
  scores = ref<RecordData[]>([]),
  selected = ref<RecordData | null>(null);
const areas: Record<string, string> = { milestone: '里程碑', barrier: '障碍', transition: '转衔' };
async function load() {
  await run(async () => {
    items.value = (await request('/assessments')) || [];
    if (can('students')) students.value = (await request('/students')) || [];
  });
}
async function view(item: RecordData) {
  await run(async () => {
    scores.value = (await request(`/assessments/${item.id}/scores`)) || [];
    selected.value = item;
  });
}
onMounted(load);
</script>
<template>
  <PageHeader title="VB-MAPP 历史记录" description="原有记录单独保留，仅供查阅，不计入 PEAK 评估。">
    <IslandButton v-if="selected" variant="outlined" @click="selected = null">
      返回历史列表
    </IslandButton>
  </PageHeader>
  <Feedback :error="error" :loading="loading" @retry="selected ? view(selected) : load()" />
  <IslandCard v-if="selected">
    <v-card-title>{{ selected.date }} · 历史评分</v-card-title>
    <div v-if="auth.user?.role === 'STUDENT'" class="pa-5 student-legacy-list">
      <div v-for="score in scores" :key="score.id" class="mb-4">
        <h3>{{ areas[score.area] || score.area }} · {{ score.category }}</h3>
        <p>项目 {{ score.itemNumber }} · 记录分数 {{ score.score }}</p>
      </div>
      <EmptyState
        v-if="!scores.length"
        title="此记录没有评分"
        description="原有评估记录保留，未迁移为其他方法的项目。"
      />
    </div>
    <v-data-table
      v-else
      :items="scores"
      :headers="[
        { title: '领域', key: 'area' },
        { title: '类别', key: 'category' },
        { title: '项目编号', key: 'itemNumber' },
        { title: '分数', key: 'score' },
      ]"
    >
      <template #item.area="{ item }">{{ areas[item.area] || item.area }}</template>
      <template #no-data>
        <EmptyState title="此记录没有评分" description="原有评估记录保留，未迁移为 PK 项目。" />
      </template>
    </v-data-table>
  </IslandCard>
  <IslandCard v-else>
    <div v-if="auth.user?.role === 'STUDENT'" class="pa-5 student-legacy-list">
      <div v-for="item in items" :key="item.id" class="mb-4">
        <h3>{{ item.date }}</h3>
        <p class="my-3">{{ item.status === 'completed' ? '已完成' : '评估中' }}</p>
        <IslandButton variant="outlined" @click="view(item)">查看记录</IslandButton>
      </div>
      <EmptyState
        v-if="!items.length"
        title="没有历史 VB-MAPP 记录"
        description="当前评估方法的记录，可在我的评估中查看。"
      />
    </div>
    <v-data-table
      v-else
      :items="items"
      :loading="loading"
      :headers="[
        { title: '日期', key: 'date' },
        { title: '学生', key: 'studentId' },
        { title: '原状态', key: 'status' },
        { title: '操作', key: 'actions', sortable: false },
      ]"
    >
      <template #item.studentId="{ item }">
        {{ students.find((s) => s.id === item.studentId)?.name || item.studentId }}
      </template>
      <template #item.status="{ item }">
        {{ item.status === 'completed' ? '已完成' : '评估中' }}
      </template>
      <template #item.actions="{ item }">
        <IslandButton variant="text" color="primary" :disabled="loading" @click="view(item)">
          查看记录
        </IslandButton>
      </template>
      <template #no-data>
        <EmptyState
          title="没有历史 VB-MAPP 记录"
          description="当前评估请返回评估中心，选择 PEAK。"
        />
      </template>
    </v-data-table>
  </IslandCard>
</template>
