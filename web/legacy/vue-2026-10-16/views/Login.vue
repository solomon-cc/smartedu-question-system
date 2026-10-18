<script setup lang="ts">
import { validateForm } from '../lib/forms';
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { login, auth } from '../stores/auth';
import { landingFor } from '../lib/workspace';
import { request } from '../lib/api';
import { required, messageOf } from '../lib/types';
const router = useRouter(),
  route = useRoute();
const username = ref(''),
  password = ref(''),
  nickname = ref(''),
  showPassword = ref(false),
  loading = ref(false),
  error = ref(''),
  register = ref(false),
  registrationEnabled = ref(false),
  notice = ref('');
onMounted(async () => {
  try {
    registrationEnabled.value = (await request('/config/public')).registrationEnabled;
  } catch {
    /* Login remains available; registration fails closed. */
  }
});
async function submit(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event)) || loading.value) return;
  loading.value = true;
  error.value = '';
  notice.value = '';
  try {
    if (register.value) {
      await request('/auth/register', 'POST', {
        phoneNumber: username.value,
        nickname: nickname.value,
        password: password.value,
      });
      register.value = false;
      notice.value = '注册成功，请使用新账号登录';
      return;
    }
    await login(username.value.trim(), password.value);
    const redirect = String(route.query.redirect || '');
    await router.replace(
      redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.startsWith('/login')
        ? redirect
        : landingFor(auth.user?.role, auth.permissions),
    );
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <section class="login-page" aria-label="登录一粒麦子">
    <header class="public-brandbar">
      <div>
        <v-icon icon="mdi-sprout" size="32" />
        <strong>一粒麦子</strong>
      </div>
    </header>
    <div class="login-shell">
      <aside class="login-story" aria-label="一粒麦子">
        <div class="story-brand">
          <v-icon icon="mdi-sprout" size="32" />
          <strong>一粒麦子</strong>
        </div>
        <div class="desktop-story-copy">
          <span class="brand-kicker">让学习走进真实生活</span>
          <h2>
            把成长，
            <br />
            带进每一天。
          </h2>
          <p>连接课堂与家庭，陪伴每一次练习。</p>
          <div class="audience-line">
            <span>
              <v-icon icon="mdi-school-outline" size="20" />
              机构与老师
            </span>
            <span>
              <v-icon icon="mdi-home-heart" size="20" />
              学生与家庭
            </span>
          </div>
        </div>
        <div class="desktop-worlds" aria-hidden="true">
          <figure class="public-world market">
            <img src="/life/supermarket-v1.jpg" alt="" />
            <figcaption>在真实生活里练习</figcaption>
          </figure>
          <figure class="public-world bag">
            <img src="/life/schoolbag-v1.jpg" alt="" />
            <figcaption>让每一天更有准备</figcaption>
          </figure>
        </div>
        <div class="story-copy">
          <span>让每一步成长，看得见</span>
          <h2>
            在生活中，
            <br />
            练习成长。
          </h2>
        </div>
        <svg class="story-art" viewBox="0 0 400 280" aria-hidden="true">
          <path d="M30 255Q110 185 206 219Q291 189 378 251" fill="#d5dec8" />
          <rect x="67" y="83" width="237" height="155" rx="8" fill="#ffffff" />
          <path d="M57 84L183 22L316 84Z" fill="#759481" />
          <rect x="85" y="113" width="70" height="68" rx="5" fill="#bacfc2" />
          <path d="M120 114V181M85 147H155" stroke="#ffffff" stroke-width="5" />
          <rect x="190" y="99" width="83" height="139" rx="5" fill="#a7c3b3" />
          <circle cx="258" cy="177" r="4" fill="#456752" />
          <circle cx="309" cy="152" r="20" fill="#e1b899" />
          <path d="M282 238V196Q279 175 309 175Q340 175 338 196V238Z" fill="#799994" />
          <path
            d="M290 238L286 259M328 238L335 259"
            stroke="#627d72"
            stroke-width="12"
            stroke-linecap="round"
          />
          <rect x="283" y="185" width="45" height="34" rx="9" fill="#cfdcc4" />
          <path
            d="M296 145Q312 125 329 150"
            fill="none"
            stroke="#71604e"
            stroke-width="11"
            stroke-linecap="round"
          />
          <path
            d="M47 244V166M47 205Q15 201 19 177Q50 178 47 205M48 189Q82 185 77 157Q46 165 48 189"
            stroke="#729279"
            stroke-width="4"
            fill="#a8bda0"
          />
          <path d="M91 257H259" stroke="#c1cdb7" stroke-width="5" stroke-linecap="round" />
        </svg>
      </aside>
      <section class="login-form-wrap" aria-labelledby="login-title">
        <div class="login-brand">
          <v-icon icon="mdi-sprout" size="32" />
          <strong>一粒麦子</strong>
        </div>
        <h1 id="login-title">{{ register ? '注册学生账号' : '欢迎回来' }}</h1>
        <p v-if="register" class="login-caption">创建账号，开始今天的练习。</p>
        <v-alert v-if="error" type="error" variant="tonal" class="mb-4" role="alert">
          {{ error }}
        </v-alert>
        <v-alert v-if="notice" type="success" variant="tonal" class="mb-4" role="status">
          {{ notice }}
        </v-alert>
        <v-form :class="{ 'mt-6': !register }" @submit.prevent="submit">
          <label class="field-label" for="username">{{ register ? '手机号' : '账号' }}</label>
          <v-text-field
            id="username"
            v-model="username"
            :aria-label="register ? '手机号' : '账号'"
            :placeholder="register ? '11 位手机号' : '请输入账号'"
            :inputmode="register ? 'tel' : 'text'"
            autocomplete="username"
            autocapitalize="none"
            :spellcheck="false"
            :disabled="loading"
            prepend-inner-icon="mdi-account-outline"
            :rules="
              register ? [required, (v) => /^1\d{10}$/.test(v) || '请输入有效手机号'] : [required]
            "
          />
          <template v-if="register">
            <label class="field-label" for="nickname">昵称</label>
            <v-text-field
              id="nickname"
              v-model="nickname"
              aria-label="昵称"
              :disabled="loading"
              :rules="[required]"
            />
          </template>
          <label class="field-label" for="password">密码</label>
          <v-text-field
            id="password"
            v-model="password"
            aria-label="密码"
            placeholder="请输入密码"
            :type="showPassword ? 'text' : 'password'"
            :autocomplete="register ? 'new-password' : 'current-password'"
            :disabled="loading"
            prepend-inner-icon="mdi-lock-outline"
            :rules="register ? [required, (v) => v.length >= 8 || '密码至少 8 位'] : [required]"
          >
            <template #append-inner>
              <v-btn
                size="44"
                variant="text"
                :icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                :aria-pressed="showPassword"
                :disabled="loading"
                @click="showPassword = !showPassword"
              />
            </template>
          </v-text-field>
          <v-btn
            type="submit"
            color="primary"
            block
            height="48"
            class="login-submit"
            :loading="loading"
          >
            {{ register ? '注册' : '登录' }}
          </v-btn>
        </v-form>
        <v-btn
          v-if="registrationEnabled"
          variant="text"
          block
          height="44"
          class="mt-4"
          :disabled="loading"
          @click="
            register = !register;
            error = '';
            notice = '';
          "
        >
          {{ register ? '返回登录' : '注册学生账号' }}
        </v-btn>
        <p v-else class="login-support">账号问题请联系管理员</p>
      </section>
    </div>
  </section>
</template>
<style scoped>
.login-page {
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: 40px 24px;
  background: #f4f8f6;
}
.login-shell {
  width: 100%;
  max-width: 960px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: rgb(var(--v-theme-surface));
  border: 1px solid #ccddd3;
  border-radius: 24px;
  overflow: hidden;
}
.login-story {
  background: #eef5f1;
  padding: 40px 32px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 620px;
}
.story-brand,
.login-brand {
  display: flex;
  gap: 12px;
  align-items: center;
  color: rgb(var(--v-theme-primary));
}
.story-brand strong,
.login-brand strong {
  font-size: 24px;
  font-weight: 600;
}
.story-copy {
  margin-top: 32px;
}
.story-copy span {
  font-size: 14px;
  color: #637764;
}
.story-copy h2 {
  font-size: 40px;
  line-height: 1.5;
  font-weight: 600;
  color: #345b48;
  margin-top: 16px;
}
.story-art {
  width: 100%;
  margin-top: 16px;
}
.login-form-wrap {
  padding: 64px 40px;
  align-self: center;
  min-width: 0;
}
.login-brand {
  display: none;
}
.login-form-wrap h1 {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
}
.login-caption {
  font-size: 14px;
  color: #647465;
  margin-bottom: 32px;
}
.field-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}
.login-page :deep(input) {
  font-size: 16px;
}
.login-submit {
  margin-top: 8px;
}
.login-support {
  font-size: 12px;
  color: #647465;
  text-align: center;
  margin-top: 24px;
}
.public-brandbar,
.desktop-story-copy,
.desktop-worlds {
  display: none;
}
@media (min-width: 651px) {
  .login-page {
    padding: 24px 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .public-brandbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 1240px;
    margin: 0 auto 24px;
    color: #3b614b;
  }
  .public-brandbar > div {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 24px;
  }
  .login-shell {
    max-width: 1240px;
    grid-template-columns: minmax(0, 1.6fr) minmax(330px, 1fr);
    gap: 64px;
    border: 0;
    border-radius: 0;
    overflow: visible;
    background: transparent;
    align-items: center;
  }
  .login-story {
    padding: 24px 0;
    min-height: 0;
    background: transparent;
    display: block;
    overflow: visible;
  }
  .story-brand,
  .story-copy,
  .story-art {
    display: none;
  }
  .desktop-story-copy {
    display: block;
    position: relative;
    z-index: 1;
  }
  .brand-kicker {
    display: inline-block;
    color: #647761;
    font-size: 14px;
    letter-spacing: 2px;
    margin-bottom: 16px;
  }
  .desktop-story-copy h2 {
    margin: 0;
    font-size: clamp(32px, 3.6vw, 48px);
    line-height: 1.22;
    letter-spacing: -1px;
    font-weight: 600;
    color: #315c44;
  }
  .desktop-story-copy > p {
    margin: 20px 0 0;
    font-size: 17px;
    color: #60765f;
    line-height: 1.8;
  }
  .audience-line {
    display: flex;
    gap: 24px;
    margin-top: 24px;
    color: #3d604a;
    font-size: 14px;
  }
  .audience-line > span {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .desktop-worlds {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    margin-top: 24px;
  }
  .public-world {
    overflow: hidden;
    border-radius: 16px;
    margin: 0;
    background: #ffffff;
    border: 1px solid #ccddd3;
  }
  .public-world img {
    width: 100%;
    aspect-ratio: 3 / 2;
    object-fit: contain;
    display: block;
    background: #eef5f1;
  }
  .public-world figcaption {
    padding: 10px 12px;
    font-size: 12px;
    color: #426049;
  }
  .login-form-wrap {
    padding: 40px 32px;
    background: #ffffff;
    border: 1px solid #ccddd3;
    border-radius: 16px;
    width: 100%;
    max-width: 420px;
    justify-self: end;
  }
  .login-form-wrap h1 {
    font-size: 26px;
  }
}
@media (min-width: 651px) and (max-width: 1000px) {
  .login-page {
    padding: 24px;
  }
  .login-shell {
    gap: 32px;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 0.9fr);
  }
  .audience-line {
    gap: 12px;
    flex-wrap: wrap;
  }
  .login-form-wrap {
    padding: 32px 24px;
  }
}
@media (min-width: 651px) and (max-height: 800px) {
  .login-page {
    padding: 20px 32px;
  }
  .login-story {
    padding: 0;
  }
  .public-brandbar {
    margin-bottom: 20px;
  }
  .brand-kicker {
    margin-bottom: 12px;
  }
  .desktop-story-copy h2 {
    font-size: clamp(32px, 3.4vw, 44px);
  }
  .desktop-story-copy > p {
    margin-top: 16px;
  }
  .audience-line {
    margin-top: 16px;
  }
  .desktop-worlds {
    margin-top: 20px;
  }
  .login-form-wrap {
    padding: 28px 24px;
  }
  .login-caption {
    margin-bottom: 24px;
  }
}
@media (max-width: 650px) {
  .login-page {
    padding: 0;
    display: block;
    background: rgb(var(--v-theme-surface));
  }
  .login-shell {
    display: block;
    border: 0;
    border-radius: 0;
  }
  .login-story {
    min-height: 0;
    height: 210px;
    padding: 24px;
    display: block;
  }
  .story-brand strong {
    font-size: 22px;
  }
  .story-copy {
    margin-top: 22px;
    position: relative;
    z-index: 1;
  }
  .story-copy span {
    font-size: 12px;
  }
  .story-copy h2 {
    font-size: 27px;
    line-height: 1.4;
    margin-top: 8px;
  }
  .story-art {
    position: absolute;
    right: -8px;
    bottom: 0;
    width: 210px;
    margin: 0;
  }
  .login-form-wrap {
    max-width: 420px;
    padding: 32px 24px;
    margin: auto;
  }
  .login-form-wrap h1 {
    font-size: 26px;
  }
  .login-caption {
    margin-bottom: 24px;
  }
  .login-page {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
@media (max-width: 360px) {
  .story-art {
    right: -24px;
    width: 175px;
  }
  .story-copy h2 {
    font-size: 25px;
  }
  .login-form-wrap {
    padding: 24px;
  }
}
</style>
