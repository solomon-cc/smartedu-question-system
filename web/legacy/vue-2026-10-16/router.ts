import { createRouter, createWebHashHistory } from 'vue-router';
import { auth, can, restore } from './stores/auth';
import { modules } from './lib/modules';
import { landingFor, pageTitleFor } from './lib/workspace';
import { teacherSectionFor } from './lib/teacherWorkspace';
const pages: Record<string, () => Promise<unknown>> = {
  '/': () => import('./views/Dashboard.vue'),
  '/questions': () => import('./views/Questions.vue'),
  '/papers': () => import('./views/Teaching.vue'),
  '/assign': () => import('./views/Teaching.vue'),
  '/students': () => import('./views/Records.vue'),
  '/ability-tracking': () => import('./views/Ability.vue'),
  '/resources': () => import('./views/Assets.vue'),
  '/reinforcements': () => import('./views/Assets.vue'),
  '/skills': () => import('./views/Learning.vue'),
  '/homework': () => import('./views/Learning.vue'),
  '/history': () => import('./views/Records.vue'),
  '/wrong-book': () => import('./views/Learning.vue'),
  '/stats': () => import('./views/Dashboard.vue'),
  '/application': () => import('./views/Scenarios.vue'),
  '/assessment': () => import('./views/Assessment.vue'),
  '/mood-diary': () => import('./views/Mood.vue'),
  '/users': () => import('./views/Users.vue'),
  '/permissions': () => import('./views/Settings.vue'),
  '/admin/audit': () => import('./views/Records.vue'),
  '/logs': () => import('./views/Records.vue'),
  '/admin/config': () => import('./views/Settings.vue'),
  '/help': () => import('./views/Help.vue'),
};
export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/login',
      component: () => import('./views/Login.vue'),
      meta: { public: true, title: '登录' },
    },
    ...modules.map((m) => ({
      path: m.path,
      component: pages[m.path] as any,
      meta: { module: m.id, title: m.title, description: m.description },
    })),
    {
      path: '/teaching/:section',
      component: () => import('./views/TeacherSection.vue'),
      meta: { teacherSection: true },
    },
    {
      path: '/students/:id',
      component: () => import('./views/StudentProfile.vue'),
      meta: { module: 'students', title: '学生档案' },
    },
    {
      path: '/practice',
      component: () => import('./views/Practice.vue'),
      meta: { module: 'skills_practice', title: '专注练习' },
    },
    {
      path: '/forbidden',
      component: () => import('./views/Status.vue'),
      meta: { title: '暂无访问权限' },
    },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('./views/Status.vue'),
      meta: { title: '页面不存在' },
    },
  ],
});
router.beforeEach(async (to) => {
  if (!auth.ready) await restore();
  if (!to.meta.public && !auth.user) return { path: '/login', query: { redirect: to.fullPath } };
  if (to.path === '/login' && auth.user) return landingFor(auth.user?.role, auth.permissions);
  if (to.meta.teacherSection) {
    const section =
      auth.user?.role === 'TEACHER' &&
      teacherSectionFor(String(to.params.section), auth.permissions);
    if (!section) return '/forbidden';
    document.title = `${section.title} · 一粒麦子`;
    return;
  }
  if (to.meta.module && !can(String(to.meta.module))) return '/forbidden';
  document.title = `${pageTitleFor(String(to.meta.module), auth.user?.role, to.path, to.query, to.meta.title)} · 一粒麦子`;
});
window.addEventListener('auth:expired', () => {
  auth.user = null;
  auth.permissions = [];
  if (router.currentRoute.value.path !== '/login')
    router.replace({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } });
});
