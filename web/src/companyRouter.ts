import { createRouter, createWebHashHistory } from 'vue-router';
import CompanyOverview from './components/CompanyOverview.vue';
import { platformLogin } from './lib/sites';
export const companyRouter = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: CompanyOverview, meta: { title: '儿童发展与融合支持' } },
    {
      path: '/library',
      component: () => import('./views/company/Library.vue'),
      meta: { title: '题库介绍' },
    },
    {
      path: '/assessment',
      component: () => import('./components/AssessmentIntro.vue'),
      props: { loginHref: platformLogin('/assessment') },
      meta: { title: '评估介绍' },
    },
    {
      path: '/training',
      component: () => import('./views/company/Training.vue'),
      meta: { title: '培训课程' },
    },
    { path: '/:pathMatch(.*)*', component: CompanyOverview },
  ],
  scrollBehavior: (to) => (to.hash ? { el: to.hash, top: 104, behavior: 'instant' } : { top: 0 }),
});
companyRouter.afterEach((to) => {
  document.title = `${to.meta.title} · 一粒麦子`;
});

companyRouter.beforeEach((to) => {
  if (!['/', '/library', '/assessment', '/training'].includes(to.path)) {
    if (
      /^\/(assessment|training|practice|learning|life|mood|application|manage|login)(?:[/?]|$)/.test(
        to.path,
      )
    ) {
      window.location.assign(
        platformLogin(
          to.path === '/login' ? String(to.query.redirect || '/learning') : to.fullPath,
        ),
      );
      return false;
    }
    return '/';
  }
});
