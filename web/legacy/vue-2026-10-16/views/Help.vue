<script setup lang="ts">
import { IslandCard, IslandAvatar } from '../components/island';
import { computed } from 'vue';
import { auth } from '../stores/auth';
import PageHeader from '../components/PageHeader.vue';
const sections = [
  {
    role: 'TEACHER',
    title: '教师：从备课到作业',
    icon: 'mdi-human-male-board',
    steps: [
      '在学业发展中管理学生、题目、试卷和作业。题目可手动添加，也可通过 Excel 模板导入。',
      '选择题目组成试卷，再选择学生和时间布置作业。',
      '在评估中心选择方法与学生，按材料施测并记录表现。',
      '从学生档案确认教学目标、安排训练，再复测对比。',
      '在生活技能中陪同练习；游戏与练习用于课前试玩，不保存学生学习记录。',
      '在个人中心查看学生档案、能力变化与心情历史；课堂素材和强化物统一放在素材库。',
    ],
  },
  {
    role: 'STUDENT',
    title: '学生：找到自己的学习节奏',
    icon: 'mdi-school-outline',
    steps: [
      '通过开始练习选择学科、年级或教学目标。',
      '在家庭作业中查看老师安排的任务，完成后保存学习记录。',
      '答错的题目会在本次练习中重试，最多尝试三次。',
      '通过底部“更多”查看答题历史、错题本、心情与评估记录。评估由老师带领完成。',
    ],
  },
  {
    role: 'ADMIN',
    title: '管理员：建立有序的教学空间',
    icon: 'mdi-shield-account-outline',
    steps: [
      '在用户管理中创建账号，分配教师或学生角色。',
      '通过权限设置控制每个角色的页面入口与接口访问。',
      '在系统配置中设置是否开放注册，以及错题流转规则。',
      '使用作业审计和审计日志查看平台中的真实操作记录。',
    ],
  },
];
const visibleSections = computed(() =>
  auth.user?.role === 'ADMIN'
    ? [...sections].sort((a, b) => Number(b.role === 'ADMIN') - Number(a.role === 'ADMIN'))
    : sections.filter((section) => section.role === auth.user?.role),
);
</script>
<template>
  <PageHeader />
  <div class="section-grid">
    <IslandCard v-for="section in visibleSections" :key="section.title" class="pa-6">
      <IslandAvatar color="surface-variant" rounded="lg" class="mb-5">
        <v-icon :icon="section.icon" color="primary" />
      </IslandAvatar>
      <h2 class="mb-5">{{ section.title }}</h2>
      <ol class="help-steps">
        <li v-for="step in section.steps" :key="step">{{ step }}</li>
      </ol>
    </IslandCard>
  </div>
  <IslandCard class="mt-6 pa-6">
    <h2 class="mb-4">常见问题</h2>
    <v-expansion-panels variant="accordion">
      <v-expansion-panel
        title="为什么看不到某个功能？"
        text="导航入口与角色权限关联。请联系管理员检查该模块的页面入口和接口权限，修改后重新登录。"
      />
      <v-expansion-panel
        title="数据加载失败怎么办？"
        text="先点击页面中的重试按钮。如果仍然失败，请检查网络连接或联系平台管理员。系统不会使用演示数据替代真实记录。"
      />
      <v-expansion-panel
        title="练习完成后为什么要保存？"
        text="保存后，答题历史、错题本和能力记录才会更新。如果提交失败，请保留当前页面并重试，避免丢失本次作答。"
      />
      <v-expansion-panel
        title="如何修改密码或退出账号？"
        :text="
          auth.user?.role === 'STUDENT'
            ? '点右上角头像打开个人资料；需要退出时，打开底部“更多”，选择退出登录。'
            : '点击右上角个人菜单，在个人资料中修改资料或密码。使用共享设备时，操作完成后请退出登录。'
        "
      />
    </v-expansion-panels>
  </IslandCard>
</template>
<style scoped>
.help-steps {
  padding-left: 20px;
  font-size: 16px;
  line-height: 1.9;
  color: rgb(var(--v-theme-on-surface-variant));
}
.help-steps li {
  padding-left: 5px;
  margin-bottom: 17px;
}
</style>
