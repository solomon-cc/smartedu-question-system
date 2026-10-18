<script setup lang="ts">
import { computed } from 'vue';
import { auth } from '../stores/auth';
import { teacherSectionsFor } from '../lib/teacherWorkspace';
import PageHeader from './PageHeader.vue';
import EmptyState from './EmptyState.vue';
const sections = computed(() => teacherSectionsFor(auth.permissions, 'home'));
</script>
<template>
  <PageHeader
    title="首页"
    :description="`${auth.user?.name || auth.user?.username}，欢迎回来。选择今天的教学工作。`"
  />
  <section v-if="sections.length" class="teacher-home-grid" aria-label="教学功能入口">
    <router-link
      v-for="section in sections"
      :key="section.id"
      :to="section.path"
      :class="['teaching-card', `card-${section.id}`]"
    >
      <div class="card-heading">
        <span class="card-icon"><v-icon :icon="section.icon" size="24" /></span>
        <h2>{{ section.title }}</h2>
        <v-icon icon="mdi-arrow-top-right" size="18" class="card-arrow" />
      </div>
      <p class="card-description">{{ section.description }}</p>
      <span class="card-detail">{{ section.detail }}</span>
    </router-link>
  </section>
  <EmptyState v-else title="暂无可用教学入口" description="请联系管理员检查页面与接口权限。" />
</template>
<style scoped>
.teacher-home-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}
.teaching-card {
  grid-column: span 2;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 24px;
  gap: 16px;
  text-decoration: none;
  color: rgb(var(--v-theme-on-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
  background: rgb(var(--v-theme-surface));
  transition:
    border-color 160ms,
    background-color 160ms;
}
.card-assessment,
.card-development,
.card-personal,
.card-materials {
  grid-column: span 3;
}
.card-assessment {
  background: rgb(var(--v-theme-surface-variant));
  border-color: rgba(var(--v-theme-primary), 0.18);
}
.card-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}
.card-icon {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}
.card-heading h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.4;
  font-weight: 600;
  text-wrap: balance;
}
.card-arrow {
  margin-left: auto;
  flex: 0 0 auto;
  color: rgb(var(--v-theme-on-surface-variant));
}
.card-description {
  margin: 0;
  font-size: 16px;
  line-height: 1.6;
  color: rgb(var(--v-theme-on-surface-variant));
}
.card-detail {
  margin-top: auto;
  font-size: 12px;
  line-height: 1.5;
  color: rgb(var(--v-theme-on-surface-variant));
}
.teaching-card:active {
  background: rgba(var(--v-theme-primary), 0.1);
}
.teaching-card:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 3px;
}
@media (hover: hover) and (pointer: fine) {
  .teaching-card:hover {
    border-color: rgba(var(--v-theme-primary), 0.5);
  }
}
@media (max-width: 900px) {
  .teacher-home-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .teaching-card {
    grid-column: span 1;
  }
  .card-materials {
    grid-column: 1 / -1;
  }
}
@media (max-width: 540px) {
  .teacher-home-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .teaching-card {
    grid-column: 1;
    padding: 20px;
    gap: 12px;
  }
  .card-heading h2 {
    font-size: 20px;
  }
  .card-description {
    padding-left: 56px;
  }
  .card-detail {
    padding-left: 56px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .teaching-card {
    transition: none;
  }
}
</style>
