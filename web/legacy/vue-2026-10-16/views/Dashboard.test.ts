import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import Dashboard from './Dashboard.vue';
import { auth } from '../stores/auth';
import { request } from '../lib/api';
import type { Role } from '../lib/types';
const route = vi.hoisted(() => ({ path: '/', meta: { module: 'dashboard' } }));
vi.mock('vue-router', () => ({ useRoute: () => route }));
vi.mock('../lib/api', () => ({ request: vi.fn() }));
let wrapper: VueWrapper;
function setup(role: Role, path = '/', denied = '') {
  route.path = path;
  route.meta.module = path === '/stats' ? 'skills_stats' : 'dashboard';
  auth.user = { id: 'audit', username: 'audit', name: '体验账号', role };
  auth.permissions = [
    'dashboard',
    'skills_stats',
    'mood_diary',
    'users',
    'assessment_history',
    'skills_homework',
  ].map((moduleId) => ({
    role,
    moduleId,
    parentId: '',
    sortOrder: 1,
    uiAccess: true,
    apiAccess: moduleId !== denied,
  }));
  wrapper = mount(Dashboard, {
    global: {
      stubs: {
        PageHeader: { template: '<header><slot/></header>' },
        Feedback: true,
        TrendChart: true,
        EmptyState: { props: ['title'], template: '<p>{{title}}</p>' },
        RouterLink: { props: ['to'], template: '<a :href="to"><slot/></a>' },
        VCard: { template: '<section><slot/></section>' },
        VBtn: { template: '<button><slot/></button>' },
        VIcon: true,
        VAvatar: true,
        VChip: true,
        VList: { template: '<div><slot/></div>' },
        VListItem: { props: ['title'], template: '<div>{{title}}<slot name="append"/></div>' },
        VDataTable: true,
      },
    },
  });
}
afterEach(() => {
  wrapper?.unmount();
  vi.clearAllMocks();
  auth.user = null;
  auth.permissions = [];
});
describe('dashboard data boundaries', () => {
  it('uses teacher statistics without requesting platform trends or online accounts', async () => {
    vi.mocked(request).mockResolvedValue({
      todayAssigned: 2,
      recentHomeworks: [
        { id: 'hw', name: '老师的作业', date: '2026-10-01', completed: 1, total: 3 },
      ],
      studentSummaries: [],
    });
    setup('TEACHER', '/stats');
    await flushPromises();
    expect(request).toHaveBeenCalledExactlyOnceWith('/teacher/stats');
    expect(wrapper.text()).toContain('老师的作业');
    expect(wrapper.text()).not.toContain('在线用户');
    expect(wrapper.text()).not.toContain('平台答题正确率');
  });
  it('shows teacher business cards without fetching statistics on the home page', async () => {
    setup('TEACHER');
    auth.permissions.forEach((p) => {
      p.workspaceSections =
        p.moduleId === 'assessment_history'
          ? ['assessment']
          : p.moduleId === 'mood_diary'
            ? ['personal']
            : [];
    });
    await flushPromises();
    expect(request).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('评估中心');
    expect(wrapper.text()).toContain('个人中心');
    expect(wrapper.text()).not.toContain('最近布置的作业');
    expect(wrapper.find('.welcome-banner').exists()).toBe(false);
  });
  it('makes analysis a data page rather than another home page', async () => {
    vi.mocked(request).mockResolvedValue({
      accuracy: '75%',
      practiceTrends: [{ date: '2026-10-01', count: 4, accuracy: 75 }],
      homeworkTrends: [],
    });
    setup('STUDENT', '/stats');
    await flushPromises();
    expect(request).toHaveBeenCalledExactlyOnceWith('/student/stats');
    expect(wrapper.text()).toContain('每日学习明细');
    expect(wrapper.find('.welcome-banner').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('常用功能');
  });
  it('keeps main admin statistics visible when online status fails', async () => {
    vi.mocked(request)
      .mockResolvedValueOnce({ totalUsers: 9, totalQuestions: 20 })
      .mockRejectedValueOnce(new Error('在线状态暂不可用'));
    setup('ADMIN');
    await flushPromises();
    expect(wrapper.text()).toContain('9');
    expect(wrapper.text()).toContain('20');
    expect(request).toHaveBeenCalledWith('/dashboard/online-users');
  });
  it('does not fetch unavailable student statistics when learning data permission is disabled', async () => {
    vi.mocked(request).mockResolvedValue([]);
    setup('STUDENT', '/', 'skills_stats');
    await flushPromises();
    expect(request).toHaveBeenCalledExactlyOnceWith('/homeworks');
    expect(request).not.toHaveBeenCalledWith('/student/stats');
    expect(wrapper.text()).toContain('老师给我的任务');
    expect(wrapper.find('.growth-numbers').exists()).toBe(false);
  });
});
