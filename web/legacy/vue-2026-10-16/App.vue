<script setup lang="ts">
import StudentNavigation from './components/island/StudentNavigation.vue';
import { IslandButton, IslandCard, IslandInput, IslandDialog } from './components/island';
import { validateForm } from './lib/forms';
import { editingControl, focusEditingControl } from './lib/focus';
import { computed, provide, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay, useTheme } from 'vuetify';
import { auth, logout } from './stores/auth';
import {
  navigationFor,
  groupOrder,
  modulePresentation,
  workspaceLabel,
  landingFor,
  pageTitleFor,
} from './lib/workspace';
import { request } from './lib/api';
import { teacherSectionFor, teacherSectionsFor } from './lib/teacherWorkspace';
import { messageOf, required, type User } from './lib/types';
const route = useRoute(),
  router = useRouter(),
  theme = useTheme(),
  { mobile } = useDisplay();
const drawer = ref(!mobile.value),
  profile = ref(false),
  profileName = ref(''),
  password = ref(''),
  profileError = ref(''),
  saving = ref(false),
  profileBaseline = ref(''),
  profileDiscard = ref(false);
const profileDirty = computed(
  () => profileName.value !== profileBaseline.value || !!password.value,
);
let profileControl: HTMLElement | undefined;
function rememberProfileFocus(event: FocusEvent) {
  profileControl = editingControl(event) || profileControl;
}
const student = computed(() => auth.user?.role === 'STUDENT');
const studentTheme = computed(() =>
  theme.global.name.value === 'dark' ? 'studentIslandDark' : 'studentIsland',
);
provide('studentIslandTheme', studentTheme);
const navigation = computed(() => navigationFor(auth.user?.role, auth.permissions));
const groups = computed(() =>
  groupOrder(auth.user?.role).filter((group) => navigation.value.some((m) => m.group === group)),
);
const teacherSections = computed(() => teacherSectionsFor(auth.permissions));
const activeSection = computed(() =>
  route.meta.teacherSection
    ? String(route.params.section)
    : route.meta.module === 'application_games' && route.query.mode === 'preview'
      ? 'games'
      : teacherSections.value.find((s) => s.entries.some((e) => e.id === route.meta.module))?.id,
);
const pageTitle = computed(() =>
  route.meta.teacherSection
    ? teacherSectionFor(String(route.params.section), auth.permissions)?.title
    : pageTitleFor(
        String(route.meta.module),
        auth.user?.role,
        route.path,
        route.query,
        route.meta.title,
      ),
);
const home = computed(() => landingFor(auth.user?.role, auth.permissions));
const expandedGroups = ref<string[]>([]);
watch(
  () => auth.user?.role,
  (role) => {
    expandedGroups.value =
      role === 'STUDENT'
        ? groupOrder(role)
        : ['概览', '支持', role === 'ADMIN' ? '系统管理' : '教学管理'];
  },
  { immediate: true },
);
function expandCurrentGroup() {
  const group = modulePresentation(String(route.meta.module), auth.user?.role)?.group;
  if (group && !expandedGroups.value.includes(group)) expandedGroups.value.push(group);
}
watch(() => route.path, expandCurrentGroup, { immediate: true });
function toggleGroup(group: string) {
  expandedGroups.value = expandedGroups.value.includes(group)
    ? expandedGroups.value.filter((g) => g !== group)
    : [...expandedGroups.value, group];
}
watch(
  () => route.path,
  () => {
    if (mobile.value) drawer.value = false;
  },
);
watch(mobile, (value) => (drawer.value = !value));
function focusContent() {
  document.getElementById('main-content')?.focus();
}
function switchTheme() {
  const name = theme.global.name.value === 'light' ? 'dark' : 'light';
  theme.change(name);
  localStorage.setItem('smartedu.theme', name);
}
function openProfile() {
  profileControl = undefined;
  profileName.value = auth.user?.name || '';
  password.value = '';
  profileError.value = '';
  profileBaseline.value = profileName.value;
  profile.value = true;
}
function closeProfile() {
  if (saving.value) return;
  if (profileDirty.value) profileDiscard.value = true;
  else profile.value = false;
}
function restoreProfileFocus() {
  if (profile.value && !profileDiscard.value)
    focusEditingControl('.profile-editor .v-overlay__content', profileControl);
}
async function saveProfile(event: Promise<{ valid: boolean }>) {
  if (!(await validateForm(event))) return;
  saving.value = true;
  profileError.value = '';
  try {
    auth.user = await request<User>('/me', 'PUT', {
      name: profileName.value,
      ...(password.value ? { password: password.value } : {}),
    });
    profile.value = false;
  } catch (e) {
    profileError.value = messageOf(e);
  } finally {
    saving.value = false;
  }
}
async function exit() {
  // Keep the current role while page guards check unsaved learning or management work.
  if (route.path !== home.value) {
    const failure = await router.push(home.value);
    if (failure) return;
  }
  logout();
  router.replace('/login');
}
</script>
<template>
  <v-app
    :theme="route.path === '/login' ? 'light' : student ? studentTheme : undefined"
    :class="{ 'student-island': student }"
  >
    <a
      v-if="auth.user && route.path !== '/login'"
      href="#main-content"
      class="skip-link"
      @click.prevent="focusContent"
    >
      跳到主要内容
    </a>
    <StudentNavigation
      v-if="student && route.path !== '/login'"
      @profile="openProfile"
      @logout="exit"
      @theme="switchTheme"
    />
    <template v-if="auth.user && route.path !== '/login' && !student">
      <v-navigation-drawer v-model="drawer" :temporary="mobile" width="248" class="sidebar">
        <router-link :to="home" class="brand">
          <div class="brand-mark"><v-icon icon="mdi-sprout" size="29" /></div>
          <div>
            <strong>一粒麦子</strong>
            <span>SMARTEDU · 智慧教育</span>
          </div>
        </router-link>
        <div class="workspace-badge">
          <span class="status-dot" />
          {{ workspaceLabel(auth.user.role) }}
        </div>
        <v-list nav density="comfortable" class="nav-list">
          <template v-if="auth.user.role === 'TEACHER'">
            <v-list-item
              v-if="navigation.some((m) => m.id === 'dashboard')"
              to="/"
              exact
              prepend-icon="mdi-view-dashboard-outline"
              title="首页"
              color="primary"
              rounded="lg"
            />
            <v-list-item
              v-for="section in teacherSections"
              :key="section.id"
              :to="section.path"
              :active="activeSection === section.id"
              :prepend-icon="section.icon"
              :title="section.title"
              color="primary"
              rounded="lg"
            />
            <v-divider class="my-4" />
            <v-list-item
              v-for="item in navigation.filter(
                (m) =>
                  !teacherSections.some((s) => s.entries.some((e) => e.id === m.id)) &&
                  m.id !== 'dashboard',
              )"
              :key="item.id"
              :to="item.path"
              :prepend-icon="item.icon"
              :title="item.title"
              color="primary"
              rounded="lg"
            />
          </template>
          <template v-else v-for="group in groups" :key="group">
            <button
              v-if="auth.user.role !== 'STUDENT' && !['概览', '支持'].includes(group)"
              type="button"
              class="nav-group-toggle"
              :aria-expanded="expandedGroups.includes(group)"
              :aria-controls="`nav-${group}`"
              @click="toggleGroup(group)"
            >
              <span>{{ group }}</span>
              <v-icon
                :icon="expandedGroups.includes(group) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                size="18"
              />
            </button>
            <div v-else class="nav-heading">{{ group }}</div>
            <div v-show="expandedGroups.includes(group)" :id="`nav-${group}`">
              <v-list-item
                v-for="item in navigation.filter((m) => m.group === group)"
                :key="item.id"
                :to="item.path"
                :exact="item.path === '/'"
                :prepend-icon="item.icon"
                :title="item.title"
                color="primary"
                rounded="lg"
              />
            </div>
          </template>
        </v-list>
        <template #append>
          <div class="sidebar-footer">
            <v-icon icon="mdi-sprout-outline" size="20" />
            <span>让每一份成长被看见</span>
          </div>
        </template>
      </v-navigation-drawer>
      <v-app-bar flat height="72" class="topbar">
        <v-app-bar-nav-icon v-if="mobile" aria-label="打开导航菜单" @click="drawer = !drawer" />
        <div class="topbar-breadcrumb">
          <span class="text-medium-emphasis">{{ workspaceLabel(auth.user.role) }}</span>
          <v-icon icon="mdi-chevron-right" size="16" />
          <strong>{{ pageTitle }}</strong>
        </div>
        <v-spacer />
        <span class="topbar-date">
          {{
            new Date().toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })
          }}
        </span>
        <v-btn
          icon="mdi-theme-light-dark"
          variant="text"
          aria-label="切换明暗主题"
          @click="switchTheme"
        />
        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" class="profile-trigger" variant="text" aria-label="个人菜单">
              <v-avatar color="primary" size="34" class="mr-2">
                {{ (auth.user.name || auth.user.username).slice(0, 1) }}
              </v-avatar>
              <span class="d-none d-sm-inline">{{ auth.user.name || auth.user.username }}</span>
              <v-icon icon="mdi-chevron-down" class="ml-2" size="16" />
            </v-btn>
          </template>
          <v-list min-width="180">
            <v-list-item prepend-icon="mdi-account-outline" title="个人资料" @click="openProfile" />
            <v-list-item prepend-icon="mdi-logout" title="退出登录" @click="exit" />
          </v-list>
        </v-menu>
      </v-app-bar>
    </template>
    <v-main tag="div">
      <main id="main-content" tabindex="-1" :class="auth.user ? 'page-container' : ''">
        <router-view :key="route.path" />
      </main>
    </v-main>
    <IslandDialog
      :model-value="profile"
      :persistent="saving"
      class="profile-editor"
      @focusin="rememberProfileFocus"
      scrollable
      @update:model-value="closeProfile"
    >
      <IslandCard title="个人资料">
        <v-form @submit.prevent="saveProfile">
          <v-card-text>
            <v-alert v-if="profileError" type="error" class="mb-4">{{ profileError }}</v-alert>
            <IslandInput v-model="profileName" label="姓名" :rules="[required]" />
            <IslandInput
              v-model="password"
              label="新密码（留空则不修改）"
              type="password"
              autocomplete="new-password"
              :rules="[(v: string) => !v || v.length >= 8 || '密码至少 8 位']"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <IslandButton :disabled="saving" @click="closeProfile">取消</IslandButton>
            <IslandButton type="submit" color="primary" variant="flat" :loading="saving">
              保存资料
            </IslandButton>
          </v-card-actions>
        </v-form>
      </IslandCard>
    </IslandDialog>
    <IslandDialog v-model="profileDiscard" max-width="440" @after-leave="restoreProfileFocus">
      <IslandCard title="放弃未保存的修改？">
        <v-card-text>个人资料还未保存。可以继续编辑，或放弃本次修改。</v-card-text>
        <v-card-actions>
          <v-spacer />
          <IslandButton color="primary" variant="flat" @click="profileDiscard = false">
            继续编辑
          </IslandButton>
          <IslandButton
            color="error"
            @click="
              profileDiscard = false;
              profile = false;
            "
          >
            放弃修改
          </IslandButton>
        </v-card-actions>
      </IslandCard>
    </IslandDialog>
  </v-app>
</template>
