<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { IconDown } from '@arco-design/web-vue/es/icon';
import { auth, logout, roleNames, manageQuestions, manageCourses, canModule } from './lib/auth';
import { api, message } from './lib/api';
import Mark from './components/Mark.vue';
import { Modal } from '@arco-design/web-vue';
function focusContent() {
  document.getElementById('main-content')?.focus();
}
const router = useRouter(),
  route = useRoute(),
  profile = ref(false),
  name = ref(''),
  password = ref(''),
  saving = ref(false),
  error = ref(''),
  baseline = ref('');
const active = computed(() =>
  route.path.startsWith('/library') || route.path.startsWith('/practice')
    ? 'library'
    : route.path.startsWith('/life')
      ? 'life'
      : route.path.startsWith('/mood')
        ? 'mood'
        : route.path.startsWith('/assessment')
          ? 'assessment'
          : route.path.startsWith('/training')
            ? 'training'
            : route.path.startsWith('/learning')
              ? 'learning'
              : route.path.startsWith('/manage')
                ? 'manage'
                : 'home',
);
function openProfile() {
  name.value = auth.user?.name || '';
  baseline.value = name.value;
  password.value = '';
  error.value = '';
  profile.value = true;
}
async function closeProfile() {
  if (saving.value) return;
  if (name.value !== baseline.value || password.value) {
    Modal.warning({
      title: '放弃未保存的修改？',
      content: '可以继续编辑，或放弃资料修改。',
      okText: '放弃修改',
      cancelText: '继续编辑',
      hideCancel: false,
      onOk: () => (profile.value = false),
    });
  } else profile.value = false;
}
async function saveProfile() {
  if (!name.value.trim()) {
    error.value = '请填写姓名';
    return;
  }
  if (password.value && password.value.length < 8) {
    error.value = '密码至少8位';
    return;
  }
  saving.value = true;
  try {
    auth.user = await api('/me', 'PUT', {
      name: name.value,
      ...(password.value ? { password: password.value } : {}),
    });
    profile.value = false;
  } catch (e) {
    error.value = message(e);
  } finally {
    saving.value = false;
  }
}
async function exit() {
  const failure = await router.push('/login?from=website');
  if (failure) return;
  logout();
}
</script>
<template>
  <div class="portal" :class="{ 'platform-app': route.path !== '/login' }">
    <a class="skip-link" href="#main-content" @click.prevent="focusContent">跳到主要内容</a>
    <header v-if="auth.user && route.path !== '/login'" class="site-header">
      <div class="header-inner">
        <a href="https://www.ylmz.com.cn/" class="brand" aria-label="一粒麦子，返回官网">
          <Mark />
          <span>
            <strong>一粒麦子</strong>
          </span>
        </a>
        <nav class="main-nav" aria-label="主导航">
          <router-link to="/library" :class="{ active: active === 'library' }">题库</router-link>
          <router-link
            v-if="canModule('application_games')"
            to="/life"
            :class="{ active: active === 'life' }"
          >
            生活
          </router-link>
          <router-link
            v-if="canModule('mood_diary')"
            to="/mood"
            :class="{ active: active === 'mood' }"
          >
            情绪
          </router-link>
          <router-link
            v-if="auth.user?.role !== 'TRAINER'"
            to="/assessment"
            :class="{ active: active === 'assessment' }"
          >
            评估中心
          </router-link>
          <router-link v-if="auth.user" to="/learning" :class="{ active: active === 'learning' }">
            我的学习
          </router-link>
          <a-dropdown
            v-if="manageQuestions || manageCourses || auth.user?.role === 'ADMIN'"
            trigger="click"
          >
            <button class="nav-menu" :class="{ active: active === 'manage' }">
              管理
              <IconDown />
            </button>
            <template #content>
              <a-doption v-if="manageQuestions" @click="router.push('/manage/questions')">
                题库管理
              </a-doption>
              <a-doption v-if="manageQuestions" @click="router.push('/manage/reinforcements')">
                强化物管理
              </a-doption>
              <a-doption v-if="manageCourses" @click="router.push('/manage/courses')">
                课程管理
              </a-doption>
              <a-doption v-if="auth.user?.role === 'ADMIN'" @click="router.push('/manage/users')">
                成员与管理员
              </a-doption>
            </template>
          </a-dropdown>
        </nav>
        <div class="header-actions">
          <a-dropdown v-if="auth.user" trigger="click">
            <button class="account-button" aria-label="个人菜单">
              <span class="avatar">{{ (auth.user.name || auth.user.username).slice(0, 1) }}</span>
              <span class="account-name">{{ auth.user.name || auth.user.username }}</span>
              <IconDown />
            </button>
            <template #content>
              <a-doption disabled>{{ roleNames[auth.user.role] }}</a-doption>
              <a-doption @click="openProfile">个人资料</a-doption>
              <a-doption @click="exit">退出登录</a-doption>
            </template>
          </a-dropdown>
        </div>
      </div>
    </header>
    <main id="main-content" tabindex="-1"><router-view :key="route.path" /></main>
    <a-modal
      :visible="profile"
      title="个人资料"
      :width="480"
      :footer="false"
      @cancel="closeProfile"
    >
      <a-form :model="{ name, password }" layout="vertical" @submit="saveProfile">
        <a-alert v-if="error" type="error">{{ error }}</a-alert>
        <a-form-item field="name" label="姓名" required>
          <a-input v-model="name" :max-length="40" />
        </a-form-item>
        <a-form-item field="password" label="新密码（留空不修改）">
          <a-input-password v-model="password" autocomplete="new-password" />
        </a-form-item>
        <div class="dialog-actions">
          <a-button :disabled="saving" @click="closeProfile">取消</a-button>
          <a-button type="primary" html-type="submit" :loading="saving">保存资料</a-button>
        </div>
      </a-form>
    </a-modal>
  </div>
</template>
