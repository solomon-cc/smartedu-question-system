<script setup lang="ts">
import { IslandButton, IslandCard } from '../components/island';
import { useRoute } from 'vue-router';
import { landingFor } from '../lib/workspace';
import { auth } from '../stores/auth';
import PageHeader from '../components/PageHeader.vue';
import EmptyState from '../components/EmptyState.vue';
const route = useRoute();
</script>
<template>
  <PageHeader description="通过导航或返回按钮，继续访问可用页面。" />
  <IslandCard>
    <EmptyState
      heading="h2"
      :title="String(route.meta.title)"
      :description="
        route.path === '/forbidden'
          ? '当前账号尚未获得此模块权限，请联系管理员。'
          : '这个地址没有对应的页面，请通过导航继续。'
      "
      icon="mdi-sign-direction"
    >
      <IslandButton
        v-if="landingFor(auth.user?.role, auth.permissions) !== '/forbidden'"
        :to="landingFor(auth.user?.role, auth.permissions)"
        color="primary"
      >
        返回可用页面
      </IslandButton>
    </EmptyState>
  </IslandCard>
</template>
