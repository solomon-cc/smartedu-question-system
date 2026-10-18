<script setup lang="ts">
import { IconArrowUp, IconLaunch } from '@arco-design/web-vue/es/icon';
import Mark from './Mark.vue';
const props = withDefaults(defineProps<{ company?: boolean }>(), { company: false });
const companyLink = (section: string) =>
  props.company ? '#/#' + section : 'https://www.ylmz.com.cn/#/#' + section;
const platformLink = (path: string) => '#' + path;
const companyArticle = 'https://mp.weixin.qq.com/s/ecF7FPsMa43ovdYIIB4cxw';
function backToTop() {
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.getElementById('main-content')?.focus({ preventScroll: true });
}
</script>
<template>
  <footer class="portal-footer">
    <div class="container">
      <div class="portal-footer-main">
        <div class="portal-footer-identity">
          <a
            :href="company ? '/' : 'https://www.ylmz.com.cn/'"
            class="portal-footer-brand"
            aria-label="一粒麦子，返回公司官网"
          >
            <Mark />
            <span>一粒麦子</span>
          </a>
        </div>
        <nav class="portal-footer-nav" aria-label="了解一粒麦子">
          <h2>了解我们</h2>
          <a :href="companyLink('company-about')">公司介绍</a>
          <a :href="companyLink('company-services')">我们做什么</a>
          <a :href="companyLink('company-team')">师资团队</a>
        </nav>
        <nav class="portal-footer-nav" :aria-label="company ? '学习服务' : '学习与成长'">
          <h2>{{ company ? '学习服务' : '学习与成长' }}</h2>
          <a :href="platformLink('/library')">{{ company ? '题库介绍' : '探索题库' }}</a>
          <a :href="platformLink('/assessment')">{{ company ? '评估介绍' : '评估中心' }}</a>
          <a :href="platformLink('/training')">培训课程</a>
        </nav>
        <div class="portal-footer-story">
          <h2>公众号</h2>
          <a
            :href="companyArticle"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="阅读公司介绍，微信公众号文章，在新窗口打开"
          >
            阅读公司介绍
            <IconLaunch />
          </a>
          <span class="portal-footer-story-note">一粒麦子ABA</span>
        </div>
      </div>
      <div class="portal-footer-bottom">
        <small>© {{ new Date().getFullYear() }} 一粒麦子</small>
        <button type="button" @click="backToTop">
          返回顶部
          <IconArrowUp />
        </button>
      </div>
    </div>
  </footer>
</template>
<style scoped>
.portal-footer {
  background: #173e32;
  color: #fff;
}
.portal-footer-main {
  display: grid;
  grid-template-columns: 1.65fr 0.8fr 0.9fr 1.15fr;
  gap: 48px;
  padding: 48px 0 40px;
}
.portal-footer-brand {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  min-height: 44px;
  font-size: 24px;
  letter-spacing: 2px;
  font-weight: 600;
  color: #fff;
}
.portal-footer-brand svg {
  width: 42px;
  height: 42px;
  color: #39745b;
}
.portal-footer-nav {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.portal-footer-nav h2 {
  font-size: 14px;
  color: #f4f4e9;
  font-weight: 600;
  margin: 8px 0 18px;
}
.portal-footer-nav a {
  font-size: 14px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  color: #bbcec2;
  padding: 2px 0;
}
.portal-footer a:hover {
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 5px;
}
.portal-footer-story {
  padding-left: 32px;
  border-left: 1px solid #426155;
}
.portal-footer-story-label {
  font-size: 12px;
  letter-spacing: 1px;
  color: #bbcec2;
}
.portal-footer-story h2 {
  font-size: 14px;
  line-height: 1.6;
  color: #f4f4e9;
  font-weight: 600;
  margin: 8px 0 18px;
}
.portal-footer-story a {
  color: #f4f4e9;
  display: inline-flex;
  gap: 24px;
  align-items: center;
  min-height: 44px;
  font-size: 14px;
  border-bottom: 1px solid #698272;
}
.portal-footer-story-note {
  display: block;
  font-size: 12px;
  color: #bbcec2;
  margin-top: 12px;
}
.portal-footer-bottom {
  border-top: 1px solid #426155;
  padding: 18px 0;
  display: flex;
  gap: 32px;
  align-items: center;
  color: #bbcec2;
  font-size: 12px;
}
.portal-footer-bottom small {
  font-size: inherit;
}
.portal-footer-bottom button {
  margin-left: auto;
  display: inline-flex;
  gap: 12px;
  align-items: center;
  min-height: 44px;
  background: transparent;
  border: 0;
  padding: 0 4px;
  font: inherit;
  color: #edf2e7;
  cursor: pointer;
}
.portal-footer-bottom button:hover {
  text-decoration: underline;
  text-underline-offset: 5px;
}
.portal-footer a:focus-visible,
.portal-footer button:focus-visible {
  outline: 2px solid #f1d589;
  outline-offset: 5px;
  border-radius: 2px;
}
@media (max-width: 1050px) {
  .portal-footer-main {
    gap: 28px;
    grid-template-columns: 1.45fr 0.8fr 0.8fr 1.15fr;
  }
  .portal-footer-story {
    padding-left: 24px;
  }
  .portal-footer-brand {
    font-size: 21px;
  }
}
@media (max-width: 800px) {
  .portal-footer-main {
    grid-template-columns: 1.2fr 1fr 1fr;
    padding-top: 44px;
    gap: 32px 24px;
  }
  .portal-footer-identity {
    grid-column: 1 / -1;
    padding-bottom: 28px;
    border-bottom: 1px solid #426155;
  }
  .portal-footer-story {
    padding-left: 20px;
  }
  .portal-footer-story h2 {
    font-size: 14px;
  }
  .portal-footer-bottom {
    gap: 16px;
    flex-wrap: wrap;
  }
  .portal-footer-bottom > span {
    display: none;
  }
}
@media (max-width: 540px) {
  .portal-footer-main {
    grid-template-columns: 1fr 1fr;
    gap: 28px;
    padding-block: 36px;
  }
  .portal-footer-story {
    grid-column: 1 / -1;
    padding: 24px 0 0;
    border-left: 0;
    border-top: 1px solid #426155;
  }
  .portal-footer-story h2 br {
    display: none;
  }
  .portal-footer-story h2 {
    margin: 12px 0;
  }
  .portal-footer-bottom {
    padding-block: 12px;
    gap: 8px;
  }
}
</style>
