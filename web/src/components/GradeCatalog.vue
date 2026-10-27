<script setup lang="ts">
import { IconArrowRight } from '@arco-design/web-vue/es/icon';
import { RouterLink } from 'vue-router';
import { platformLogin } from '../lib/sites';
import { gradeLabel, type GradeCard } from '../lib/catalog';
const props = defineProps<{ cards: GradeCard[]; search?: string; loginLinks?: boolean }>();
function link(grade: number, subject: string) {
  const query = { grade, subject, ...(props.search ? { q: props.search } : {}) };
  return props.loginLinks
    ? {
        href: platformLogin(
          '/library?' +
            new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString(),
        ),
      }
    : { to: { path: '/library', query } };
}
</script>
<template>
  <div class="grade-catalog-grid">
    <article
      v-for="c in cards"
      :key="c.grade"
      class="grade-catalog-card"
      :style="{ '--grade-color': c.color }"
    >
      <header class="grade-card-heading">
        <h2>
          <span class="grade-ribbon">{{ String(c.grade).padStart(2, '0') }}</span>
          {{ gradeLabel(c.grade) }}
        </h2>
        <span class="grade-card-label">学习目录</span>
      </header>
      <p class="grade-summary">{{ c.summary }}</p>
      <div class="grade-subject-list">
        <component
          v-for="s in c.subjects"
          :key="s.value"
          :is="loginLinks ? 'a' : RouterLink"
          class="grade-subject-row"
          v-bind="link(c.grade, s.value)"
          :aria-label="
            gradeLabel(c.grade) + s.label + '，' + s.skills + '个知识点，' + s.questions + '道题目'
          "
        >
          <span class="grade-subject-name">{{ s.label }}</span>
          <span class="grade-subject-count">
            {{ s.skills }} 个知识点 · {{ s.questions }} 道题目
          </span>
          <IconArrowRight />
        </component>
      </div>
    </article>
  </div>
</template>

<style scoped>
a.grade-subject-row {
  min-height: 44px;
  color: var(--brand);
  border-radius: 4px;
  padding-inline: 6px;
}
a.grade-subject-row:hover {
  background: var(--surface-soft, #f4f8f5);
}
a.grade-subject-row .grade-subject-name {
  margin-right: auto;
  color: var(--ink);
}
.grade-subject-count {
  font-size: 12px;
  white-space: nowrap;
}
</style>
