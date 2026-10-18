<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { auth } from '../../stores/auth';
import { navigationFor, landingFor, pageTitleFor } from '../../lib/workspace';
import { IslandButton, IslandAvatar } from './index';
import { moduleTone } from './palette';
const emit = defineEmits<{ profile: []; logout: []; theme: [] }>();
const route = useRoute();
const drawer = ref(false);
const menuElement = ref<{ $el: HTMLElement }>();
const closeButton = ref<{ $el: HTMLElement }>();
let previousFocus: HTMLElement | null = null;
watch(drawer, async (open) => {
  if (open) previousFocus = document.activeElement as HTMLElement;
  await nextTick();
  if (open) closeButton.value?.$el.focus();
  else if (previousFocus?.isConnected) previousFocus.focus();
});
function menuKeydown(event: KeyboardEvent) {
  if (!drawer.value) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    drawer.value = false;
  } else if (event.key === 'Tab') {
    const controls = Array.from(
      menuElement.value?.$el.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') || [],
    ).filter((element) => element.getClientRects().length);
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
}
onMounted(() => document.addEventListener('keydown', menuKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', menuKeydown));
const navigation = computed(() => navigationFor('STUDENT', auth.permissions));
const home = computed(() => landingFor('STUDENT', auth.permissions));
const primary = computed(() =>
  ['dashboard', 'skills_homework', 'skills_practice', 'skills_stats']
    .map((id) => navigation.value.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => !!item),
);
const title = computed(() =>
  pageTitleFor(String(route.meta.module), 'STUDENT', route.path, route.query, route.meta.title),
);
const focused = computed(() => route.path === '/practice');
const shortTitle: Record<string, string> = {
  dashboard: '首页',
  skills_homework: '作业',
  skills_practice: '练习',
  skills_stats: '成长',
};
watch(
  () => route.fullPath,
  () => {
    drawer.value = false;
  },
);
async function accountAction(action: 'profile' | 'logout') {
  drawer.value = false;
  // Release the menu focus trap before another dialog or navigation guard opens.
  await nextTick();
  if (action === 'profile') emit('profile');
  else emit('logout');
}
</script>
<template>
  <v-navigation-drawer
    ref="menuElement"
    :model-value="drawer"
    @update:model-value="drawer = $event"
    temporary
    width="360"
    location="right"
    :inert="!drawer ? true : undefined"
    :aria-hidden="!drawer ? true : undefined"
    class="island-sidebar"
    role="dialog"
    :aria-modal="drawer ? true : undefined"
    aria-labelledby="student-tools-title"
  >
    <router-link :to="home" class="island-brand">
      <v-icon icon="mdi-sprout" size="30" />
      <span>
        一粒麦子
        <small>我的学习空间</small>
      </span>
    </router-link>
    <div class="island-menu-heading">
      <h2 id="student-tools-title">我的学习工具</h2>
      <IslandButton
        ref="closeButton"
        variant="text"
        icon="mdi-close"
        aria-label="关闭全部学习功能"
        @click="drawer = false"
      />
    </div>
    <nav aria-label="学习导航">
      <router-link
        v-for="item in navigation"
        :key="item.id"
        :to="item.path"
        class="island-nav-link"
        :data-island-tone="moduleTone[item.id] || 'teal'"
        :class="{ selected: route.meta.module === item.id }"
        :aria-current="route.meta.module === item.id ? 'page' : undefined"
      >
        <v-icon :icon="item.icon" size="24" />
        <span>{{ item.id === 'skills_stats' ? '成长记录' : item.title }}</span>
      </router-link>
    </nav>
    <template #append>
      <div class="island-account-actions">
        <IslandButton
          variant="text"
          prepend-icon="mdi-account-outline"
          @click="accountAction('profile')"
        >
          个人资料
        </IslandButton>
        <IslandButton variant="text" prepend-icon="mdi-logout" @click="accountAction('logout')">
          退出登录
        </IslandButton>
      </div>
    </template>
  </v-navigation-drawer>
  <v-app-bar v-if="!focused" flat height="72" class="island-topbar">
    <router-link :to="home" class="island-top-brand">
      <v-icon icon="mdi-sprout" size="28" />
      <span>
        一粒麦子
        <small>我的学习空间</small>
      </span>
    </router-link>
    <span class="island-topbar-title d-none d-md-inline">{{ title }}</span>
    <v-spacer />
    <IslandButton
      variant="text"
      icon="mdi-theme-light-dark"
      aria-label="切换明暗主题"
      @click="emit('theme')"
    />
    <IslandButton
      variant="text"
      aria-label="打开个人资料"
      class="island-profile"
      @click="emit('profile')"
    >
      <IslandAvatar size="34" color="surface-variant">
        {{ (auth.user?.name || auth.user?.username || '').slice(0, 1) }}
      </IslandAvatar>
      <span class="d-none d-sm-inline ml-2">{{ auth.user?.name || auth.user?.username }}</span>
    </IslandButton>
  </v-app-bar>
  <v-bottom-navigation
    v-if="!focused"
    grow
    tag="nav"
    aria-label="常用学习功能"
    height="88"
    class="island-bottom-nav"
  >
    <v-btn
      v-for="item in primary"
      :key="item.id"
      :to="item.path"
      :data-island-tone="moduleTone[item.id] || 'teal'"
      :active="route.meta.module === item.id"
      :aria-current="route.meta.module === item.id ? 'page' : undefined"
    >
      <v-icon :icon="item.icon" />
      <span>{{ shortTitle[item.id] }}</span>
    </v-btn>
    <v-btn :active="drawer" @click="drawer = true" aria-label="更多学习功能">
      <v-icon icon="mdi-dots-horizontal" />
      <span>更多</span>
    </v-btn>
  </v-bottom-navigation>
</template>
<style scoped>
.island-sidebar {
  max-width: calc(100vw - 24px);
}
.island-brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 28px 24px 16px;
  color: var(--island-heading);
  text-decoration: none;
  font-size: 23px;
  font-weight: 700;
}
.island-brand small,
.island-top-brand small {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--island-muted);
}
.island-menu-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px 16px;
}
.island-menu-heading h2 {
  font-size: 18px;
}
nav {
  padding: 0 16px;
}
.island-nav-link {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 52px;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 50px;
  color: var(--island-text);
  text-decoration: none;
  font-size: 16px;
}
.island-nav-link:hover {
  background: var(--island-content);
}
.island-nav-link.selected {
  background: var(--island-mint);
  color: var(--island-heading);
  font-weight: 700;
}
.island-account-actions {
  padding: 16px;
  display: grid;
  gap: 8px;
  border-top: 1px dashed var(--island-border);
}
.island-top-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 24px;
  color: var(--island-heading);
  text-decoration: none;
  font-size: 20px;
  font-weight: 700;
}
.island-topbar-title {
  font-size: 14px;
  color: var(--island-muted);
  margin-left: 28px;
  padding-left: 24px;
  border-left: 1px solid var(--island-border);
}
.island-profile {
  margin-right: 20px;
}
.island-bottom-nav :deep(.v-btn) {
  min-width: 0;
  border-radius: 24px;
  letter-spacing: 0;
  gap: 6px;
  font-size: 14px;
  margin: 8px 4px;
}
.island-bottom-nav :deep(.v-btn .v-icon) {
  font-size: 26px;
}
.island-bottom-nav :deep(.v-btn--active) {
  color: var(--island-heading);
  background: var(--island-mint);
}
@media (max-width: 599px) {
  .island-top-brand {
    padding-left: 16px;
    font-size: 18px;
  }
  .island-profile {
    margin-right: 8px;
  }
  .island-bottom-nav :deep(.v-btn) {
    font-size: 12px;
    margin: 6px 0;
    border-radius: 18px;
  }
}
</style>
