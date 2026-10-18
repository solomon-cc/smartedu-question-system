<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { auth } from '../stores/auth';
import { teacherSectionFor } from '../lib/teacherWorkspace';
import PageHeader from '../components/PageHeader.vue';
import EmptyState from '../components/EmptyState.vue';
const route = useRoute();
const section = computed(() => teacherSectionFor(String(route.params.section), auth.permissions));
</script>
<template>
  <PageHeader :title="section?.title" :description="section?.description">
    <v-btn to="/" variant="outlined" prepend-icon="mdi-arrow-left">返回首页</v-btn>
  </PageHeader>
  <v-alert v-if="section?.id === 'personal'" type="info" variant="tonal" class="mb-6">
    这里汇集学生的成长记录。老师自己的账号资料可在右上角个人菜单中查看。
  </v-alert>
  <v-alert v-if="section?.id === 'development'" type="info" variant="tonal" class="mb-6">
    进入学生档案后，可从已完成的评估建立干预计划，确认目标、布置训练并安排复测。
  </v-alert>
  <div v-if="section?.entries.length" class="section-grid">
    <router-link
      v-for="entry in section.entries"
      :key="entry.id"
      :to="entry.path"
      class="section-entry"
    >
      <v-icon :icon="entry.icon" color="primary" size="28" />
      <div>
        <h2>{{ entry.title }}</h2>
        <p>{{ entry.description }}</p>
      </div>
      <v-icon icon="mdi-arrow-right" size="20" />
    </router-link>
  </div>
  <EmptyState v-else title="暂无可用入口" description="请联系管理员检查当前账号的权限。" />
</template>
<style scoped>
.section-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
.section-entry {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  text-decoration: none;
  color: rgb(var(--v-theme-on-surface));
  padding: 24px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-surface));
  border-radius: 16px;
}
.section-entry div {
  flex: 1;
  min-width: 0;
}
.section-entry h2 {
  font-size: 20px;
}
.section-entry p {
  font-size: 16px;
  line-height: 1.6;
  margin-top: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
}
.section-entry:hover {
  border-color: rgb(var(--v-theme-primary));
}
.section-entry:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
}
@media (max-width: 760px) {
  .section-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .section-entry {
    gap: 16px;
  }
}
</style>
