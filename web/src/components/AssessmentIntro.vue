<template>
  <section class="assessment-public">
    <div class="container section assessment-intro-grid">
      <div>
        <span class="company-label">评估与成长</span>
        <h1>
          了解当前能力，
          <br />
          找到下一步方向。
        </h1>
        <p>通过有结构的评估记录，看见孩子已经掌握的能力与需要支持的方面，连接后续的教学和练习。</p>
        <a v-if="loginHref" :href="loginHref" class="button primary">
          登录评估中心
          <IconArrowRight />
        </a>
        <router-link v-else class="button primary" to="/login?redirect=/assessment">
          登录评估中心
          <IconArrowRight />
        </router-link>
      </div>
      <div class="assessment-intro-note">
        <span>从评估到练习</span>
        <h2>
          让每一次练习，
          <br />
          都有明确的方向。
        </h2>
        <ol>
          <li>老师为学生安排评估</li>
          <li>逐项记录，持续查看进度</li>
          <li>查看报告，按确认的目标练习</li>
        </ol>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
defineProps<{ loginHref?: string }>();
import { IconArrowRight } from '@arco-design/web-vue/es/icon';
</script>
<style scoped>
.assessment-public {
  background: var(--soft);
  border-bottom: 1px solid var(--line);
}
.assessment-intro-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 80px;
  align-items: center;
  padding-block: 72px;
}
h1 {
  font-size: 44px;
  line-height: 1.45;
  margin: 20px 0 24px;
}
.assessment-intro-grid p {
  max-width: 510px;
  color: var(--muted);
  line-height: 1.9;
  margin-bottom: 30px;
}
.assessment-intro-note {
  border-left: 1px solid var(--line);
  padding-left: 48px;
}
.assessment-intro-note span {
  color: var(--brand);
}
h2 {
  font-size: 28px;
  line-height: 1.6;
  margin: 16px 0;
}
.assessment-intro-note ol {
  padding-left: 22px;
  line-height: 2.8;
  color: var(--muted);
}
@media (max-width: 800px) {
  .assessment-intro-grid {
    gap: 32px;
  }
  h1 {
    font-size: 32px;
  }
  .assessment-intro-note {
    padding-left: 24px;
  }
}
@media (max-width: 600px) {
  .assessment-intro-grid {
    grid-template-columns: 1fr;
  }
  .assessment-intro-note {
    border-left: 0;
    border-top: 1px solid var(--line);
    padding: 24px 0 0;
  }
  .assessment-intro-grid {
    padding-block: 40px;
  }
}
</style>
