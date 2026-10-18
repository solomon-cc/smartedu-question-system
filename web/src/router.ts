import { createRouter, createWebHashHistory } from 'vue-router';
import { auth, restore, landingFor, manageQuestions, manageCourses, canPractice } from './lib/auth';
const routes = [
  { path: '/', redirect: '/login' },
  { path: '/library', component: () => import('./views/Library.vue'), meta: { title: '题库' } },
  {
    path: '/assessment',
    component: () => import('./views/Assessment.vue'),
    meta: { title: '评估中心' },
  },
  {
    path: '/assessment/:method/:id',
    component: () => import('./views/AssessmentDetail.vue'),
    meta: { title: '评估记录与报告', auth: true, assessment: true },
  },
  { path: '/training', component: () => import('./views/Training.vue'), meta: { title: '培训' } },
  {
    path: '/training/:id',
    component: () => import('./views/Course.vue'),
    meta: { title: '课程学习', auth: true },
  },
  {
    path: '/practice',
    component: () => import('./views/Practice.vue'),
    meta: { title: '知识点练习', auth: true, practice: true },
  },
  {
    path: '/learning',
    component: () => import('./views/MyLearning.vue'),
    meta: { title: '我的学习', auth: true },
  },
  { path: '/login', component: () => import('./views/Login.vue'), meta: { title: '登录' } },
  {
    path: '/manage/questions',
    component: () => import('./views/QuestionEditor.vue'),
    meta: { title: '题库管理', auth: true, questions: true },
  },
  {
    path: '/manage/courses',
    component: () => import('./views/CourseManager.vue'),
    meta: { title: '课程管理', auth: true, courses: true },
  },
  {
    path: '/manage/reinforcements',
    component: () => import('./views/Reinforcements.vue'),
    meta: { title: '强化物管理', auth: true, questions: true },
  },
  { path: '/manage/appointments', redirect: '/assessment' },
  {
    path: '/manage/users',
    component: () => import('./views/Users.vue'),
    meta: { title: '成员管理', auth: true, admin: true },
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('./views/Status.vue'),
    meta: { title: '页面不存在' },
  },
];
export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: (to) => (to.hash ? { el: to.hash, top: 104, behavior: 'instant' } : { top: 0 }),
});
router.beforeEach(async (to) => {
  if (!auth.ready) await restore();
  if (to.path !== '/login' && !auth.user)
    return { path: '/login', query: { redirect: to.fullPath } };
  if (to.path === '/login' && auth.user && to.query.from !== 'website')
    return landingFor(auth.user.role);
  if (
    (to.meta.admin && auth.user?.role !== 'ADMIN') ||
    (to.meta.questions && !manageQuestions.value) ||
    (to.meta.courses && !manageCourses.value) ||
    (to.meta.practice &&
      !canPractice.value &&
      !(auth.user?.role === 'PARENT' && to.query.planId)) ||
    (to.meta.assessment &&
      !['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'].includes(auth.user?.role || ''))
  )
    return '/learning';
  document.title = `${to.meta.title} · 一粒麦子学习平台`;
});
window.addEventListener('auth:expired', () => {
  auth.user = null;
  if (router.currentRoute.value.path !== '/login')
    router.replace({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } });
});
