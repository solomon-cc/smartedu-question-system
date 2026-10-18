import { describe, expect, it } from 'vitest';
import {
  groupOrder,
  landingFor,
  modulePresentation,
  navigationFor,
  quickLinksFor,
  pageTitleFor,
} from './workspace';
import type { Permission, Role } from './types';
const permissions = (ids: string[], role: Role = 'ADMIN') =>
  ids.map((moduleId, sortOrder) => ({
    role,
    moduleId,
    sortOrder,
    parentId: '',
    uiAccess: true,
    apiAccess: true,
  })) as Permission[];
describe('role workspaces', () => {
  it('uses the same role titles for navigation and page headings', () => {
    for (const [role, title] of [
      ['STUDENT', '学习首页'],
      ['TEACHER', '首页'],
      ['ADMIN', '管理工作台'],
    ] as const) {
      expect(navigationFor(role, permissions(['dashboard'], role))[0].title).toBe(title);
      expect(modulePresentation('dashboard', role)?.title).toBe(title);
    }
    expect(modulePresentation('skills_stats', 'TEACHER')?.title).toBe('教学分析');
    expect(modulePresentation('assessment_history', 'STUDENT')?.title).toBe('我的评估');
    expect(modulePresentation('assessment_history', 'TEACHER')?.group).toBe('教学管理');
    expect(groupOrder('ADMIN')[1]).toBe('系统管理');
  });
  it('prioritizes role actions without introducing unauthorized links', () => {
    const all = permissions([
      'questions',
      'papers',
      'users',
      'permissions',
      'system_config',
      'assessment_history',
      'assignments',
      'skills_practice',
      'skills_homework',
    ]);
    expect(quickLinksFor('ADMIN', all)[0].id).toBe('users');
    expect(quickLinksFor('TEACHER', all)[0].id).toBe('assessment_history');
    expect(quickLinksFor('STUDENT', all)[0].id).toBe('skills_homework');
    const restricted = all.map((p) => ({
      ...p,
      uiAccess: p.moduleId !== 'users',
      apiAccess: p.moduleId !== 'permissions',
    }));
    expect(quickLinksFor('ADMIN', restricted).map((m) => m.id)).not.toContain('users');
    expect(quickLinksFor('ADMIN', restricted).map((m) => m.id)).not.toContain('permissions');
    expect(quickLinksFor('ADMIN', [])).toEqual([]);
    expect(landingFor('STUDENT', [])).toBe('/forbidden');
  });
  it('orders child navigation by parent order and keeps a usable landing when dashboard is disabled', () => {
    const list = permissions([
      'skills',
      'skills_practice',
      'assessment',
      'assessment_history',
      'dashboard',
    ]);
    Object.assign(list[0], { sortOrder: 2 });
    Object.assign(list[1], { parentId: 'skills', sortOrder: 1 });
    Object.assign(list[2], { sortOrder: 4 });
    Object.assign(list[3], { parentId: 'assessment', sortOrder: 1 });
    Object.assign(list[4], { sortOrder: 1 });
    expect(navigationFor('STUDENT', list).map((m) => m.id)).toEqual([
      'dashboard',
      'skills_practice',
      'assessment_history',
    ]);
    expect(landingFor('STUDENT', list)).toBe('/');
    expect(
      landingFor(
        'STUDENT',
        list.filter((p) => p.moduleId !== 'dashboard'),
      ),
    ).toBe('/skills');
  });
});

it('distinguishes formal homework, wrong-book practice and classroom preview', () => {
  expect(pageTitleFor('skills_practice', 'STUDENT', '/practice', { homeworkId: 'hw' })).toBe(
    '作业练习',
  );
  expect(pageTitleFor('skills_practice', 'STUDENT', '/practice', { mode: 'wrongbook' })).toBe(
    '错题巩固',
  );
  expect(pageTitleFor('skills_practice', 'TEACHER', '/practice')).toBe('课堂预览');
});

it('identifies the student profile in both the app bar and browser title', () => {
  expect(pageTitleFor('students', 'TEACHER', '/students/123')).toBe('学生档案');
});
