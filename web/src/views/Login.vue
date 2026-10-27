<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IconArrowRight } from '@arco-design/web-vue/es/icon';
import { login, auth, landingFor } from '../lib/auth';
import { message } from '../lib/api';
import Mark from '../components/Mark.vue';
const username = ref(''),
  password = ref(''),
  loading = ref(false),
  error = ref(''),
  route = useRoute(),
  router = useRouter();
const destination = computed(() => {
  const redirect = String(route.query.redirect || '');
  return redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login')
    ? redirect
    : landingFor(auth.user?.role);
});
async function continueSession() {
  if (!loading.value) await router.replace(destination.value);
}
async function submit() {
  if (loading.value) return;
  if (!username.value.trim() || !password.value) {
    error.value = '请填写账号和密码';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    await login(username.value.trim(), password.value);
    const redirect = String(route.query.redirect || '');
    await router.replace(
      redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login')
        ? redirect
        : landingFor(auth.user?.role),
    );
  } catch (e) {
    error.value = message(e);
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <section class="learning-entry">
    <div class="entry-story">
      <a href="https://www.ylmz.com.cn/" class="brand" aria-label="一粒麦子，返回官网">
        <Mark />
        <strong>一粒麦子</strong>
      </a>
      <div class="entry-message">
        <span class="entry-label">一粒麦子 · 学习平台</span>
        <h1>
          每一小步，
          <br />
          都在向前。
        </h1>
        <p>
          从适合的练习开始，
          <br />
          让学习自然地融入每一天。
        </p>
      </div>
      <svg class="entry-art" viewBox="0 0 580 340" fill="none" aria-hidden="true">
        <circle cx="292" cy="164" r="138" fill="var(--entry-paper)" />
        <path
          d="M40 304C118 304 104 246 182 246S228 310 308 310 382 254 474 254H554"
          stroke="var(--entry-line)"
          stroke-width="2"
          stroke-dasharray="6 9"
        />
        <path
          d="M137 177Q211 155 290 190V293Q214 258 137 279Z"
          fill="var(--entry-page)"
          stroke="var(--brand)"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M290 190Q368 155 443 177V279Q364 258 290 293Z"
          fill="white"
          stroke="var(--brand)"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M158 199Q216 184 264 206M158 221Q216 206 264 228M316 207Q367 185 418 198M316 229Q367 207 418 220"
          stroke="var(--entry-line)"
          stroke-width="2"
          stroke-linecap="round"
        />
        <path d="M290 191V102" stroke="var(--brand)" stroke-width="3" stroke-linecap="round" />
        <path d="M290 151C245 151 227 123 229 94C265 92 290 113 290 151Z" fill="var(--brand)" />
        <path d="M291 122C289 84 313 56 352 58C352 93 328 121 291 122Z" fill="var(--entry-leaf)" />
        <path
          d="M249 112L288 150M333 76L294 119"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle cx="423" cy="82" r="27" fill="var(--entry-sun)" />
        <path
          d="M102 128V144M94 136H110M399 316V328M393 322H405"
          stroke="var(--brand)"
          stroke-width="2"
          stroke-linecap="round"
        />
        <circle cx="462" cy="202" r="5" fill="var(--entry-leaf)" />
        <circle cx="165" cy="69" r="4" fill="var(--entry-sun)" />
      </svg>
      <p class="entry-signature">练习 · 评估 · 学习</p>
    </div>
    <div class="entry-form-area">
      <div class="login-panel">
        <span class="entry-label">欢迎来到一粒麦子</span>
        <h2>开始今天的学习</h2>
        <p class="muted">登录你的账号，继续自己的学习旅程。</p>
        <a-alert v-if="auth.user && route.query.from === 'website'" class="mb-24">
          当前已登录：{{ auth.user.name || auth.user.username }}。
          <a-button @click="continueSession">继续进入</a-button>
        </a-alert>
        <a-alert v-if="error" type="error" class="mb-24">{{ error }}</a-alert>
        <a-form :model="{ username, password }" layout="vertical" @submit="submit">
          <a-form-item
            field="username"
            label="账号"
            :rules="[{ required: true, message: '请填写账号' }]"
          >
            <a-input
              v-model="username"
              size="large"
              placeholder="输入账号"
              :disabled="loading"
              :input-attrs="{ 'aria-label': '账号', autocomplete: 'username' }"
            />
          </a-form-item>
          <a-form-item
            field="password"
            label="密码"
            :rules="[{ required: true, message: '请填写密码' }]"
          >
            <a-input-password
              v-model="password"
              size="large"
              placeholder="输入密码"
              :disabled="loading"
              :input-attrs="{ 'aria-label': '密码', autocomplete: 'current-password' }"
            />
          </a-form-item>
          <a-button type="primary" size="large" long html-type="submit" :loading="loading">
            登录学习平台
            <IconArrowRight />
          </a-button>
        </a-form>
        <p class="login-help">
          账号由老师或机构开通。
          <br />
          忘记密码？请联系你的老师或机构。
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.learning-entry {
  --entry-paper: #f7f6e9;
  --entry-page: #e6eddd;
  --entry-leaf: #8ba98b;
  --entry-line: #a2b7a5;
  --entry-sun: #e8c878;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  min-height: 100vh;
  min-height: 100dvh;
}
.entry-story {
  background: var(--soft);
  padding: 44px clamp(36px, 5vw, 88px) 28px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.entry-story .brand {
  min-height: 44px;
}
.entry-message {
  margin-top: clamp(48px, 8vh, 100px);
}
.entry-label {
  color: var(--brand);
  font-size: 14px;
  letter-spacing: 2px;
}
.entry-message h1 {
  font-size: clamp(38px, 4vw, 60px);
  line-height: 1.45;
  font-weight: 600;
  letter-spacing: 2px;
  margin: 20px 0;
}
.entry-message p {
  font-size: 16px;
  color: var(--muted);
  line-height: 1.9;
}
.entry-art {
  width: 100%;
  max-width: 500px;
  height: auto;
  margin: auto auto 0;
  padding-top: 20px;
}
.entry-signature {
  font-size: 12px;
  letter-spacing: 4px;
  color: var(--muted);
  margin-top: 20px;
}
.entry-form-area {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 40px;
}
.login-panel {
  border: 0;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
  padding: 0;
  max-width: 368px;
}
.login-panel h2 {
  font-size: 30px;
  line-height: 1.5;
  margin: 16px 0 12px;
  font-weight: 600;
}
.login-panel > .muted {
  font-size: 15px;
  line-height: 1.8;
  margin-bottom: 36px;
}
.login-panel :deep(.arco-input-wrapper) {
  min-height: 50px;
  background: white;
  border: 1px solid var(--line);
  border-radius: 6px;
}
.login-panel :deep(.arco-input-focus) {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px var(--soft);
}
.login-panel :deep(.arco-input) {
  font-size: 16px;
}
.login-panel :deep(.arco-btn-primary) {
  min-height: 50px;
  border-radius: 6px;
  margin-top: 8px;
  font-size: 16px;
}
.login-panel :deep(.arco-form-item-label-col) {
  font-size: 14px;
}
.login-help {
  font-size: 13px;
  line-height: 1.9;
  margin-top: 28px;
  padding-top: 24px;
}
@media (max-width: 900px) {
  .entry-story {
    padding: 32px;
  }
  .entry-message {
    margin-top: 64px;
  }
  .entry-form-area {
    padding: 48px 28px;
  }
  .login-panel h2 {
    font-size: 26px;
  }
}
@media (max-width: 650px) {
  .learning-entry {
    grid-template-columns: 1fr;
  }
  .entry-story {
    padding: 24px;
  }
  .entry-message {
    margin-top: 32px;
  }
  .entry-message h1 {
    font-size: 32px;
    margin: 12px 0;
  }
  .entry-message h1 br,
  .entry-message p br {
    display: none;
  }
  .entry-message p {
    font-size: 14px;
  }
  .entry-art,
  .entry-signature {
    display: none;
  }
  .entry-form-area {
    padding: 40px 24px;
    align-items: flex-start;
  }
  .login-panel {
    max-width: 440px;
  }
  .login-panel h2 {
    font-size: 26px;
  }
}
</style>
