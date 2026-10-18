<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { IconArrowRight } from '@arco-design/web-vue/es/icon';
import Mark from './components/Mark.vue';
import SiteFooter from './components/SiteFooter.vue';
import { platformLogin } from './lib/sites';
const route = useRoute();
const active = computed(() => route.path);
function focusContent() {
  document.getElementById('main-content')?.focus();
}
</script>
<template>
  <div class="portal company-site">
    <a class="skip-link" href="#main-content" @click.prevent="focusContent">跳到主要内容</a>
    <header class="site-header">
      <div class="header-inner">
        <a href="/" class="brand" aria-label="一粒麦子公司官网">
          <Mark />
          <span><strong>一粒麦子</strong></span>
        </a>
        <nav class="main-nav" aria-label="官网导航">
          <router-link to="/" :class="{ active: active === '/' }">首页</router-link>
          <router-link to="/library" :class="{ active: active === '/library' }">题库</router-link>
          <router-link to="/assessment" :class="{ active: active === '/assessment' }">
            评估
          </router-link>
          <router-link to="/training" :class="{ active: active === '/training' }">培训</router-link>
        </nav>
        <div class="header-actions">
          <a :href="platformLogin()" class="button primary company-platform-link">
            登录学习平台
            <IconArrowRight />
          </a>
        </div>
      </div>
    </header>
    <main id="main-content" tabindex="-1"><router-view :key="route.path" /></main>
    <SiteFooter company />
  </div>
</template>
<style scoped>
.company-site :deep(.arco-icon) {
  width: 1em;
  height: 1em;
  display: inline-block;
  vertical-align: middle;
}
.company-platform-link {
  white-space: nowrap;
}
.company-site .main-nav {
  gap: 28px;
}
@media (max-width: 800px) {
  .company-site .main-nav {
    gap: 20px;
  }
  .company-platform-link {
    padding-inline: 16px;
    font-size: 14px;
  }
}
@media (max-width: 540px) {
  .company-platform-link {
    min-height: 42px;
    padding: 8px 12px;
  }
  .company-site .main-nav {
    justify-content: center;
    width: 100%;
    gap: 32px;
  }
}
</style>
