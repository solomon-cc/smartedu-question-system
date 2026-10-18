import { beforeEach, it, expect, vi } from 'vitest';
import { router } from './router';
import { auth, type Role } from './lib/auth';
vi.mock('./views/Reinforcements.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/Assessment.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/AssessmentDetail.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/Home.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/Library.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/Training.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/Course.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/Practice.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/MyLearning.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/Login.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/QuestionEditor.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/CourseManager.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/Users.vue', () => ({ default: { template: '<div />' } }));
vi.mock('./views/Status.vue', () => ({ default: { template: '<div />' } }));
beforeEach(async () => {
  vi.stubGlobal('scrollTo', vi.fn());
  auth.ready = true;
  auth.user = null;
  await router.push('/');
});
it('preserves the intended practice URL across the login boundary', async () => {
  await router.push('/practice?objectiveId=number-five&subject=MATH&grade=1');
  expect(router.currentRoute.value.path).toBe('/login');
  expect(router.currentRoute.value.query.redirect).toBe(
    '/practice?objectiveId=number-five&subject=MATH&grade=1',
  );
});
it('enforces management access for each role, including direct URL entry', async () => {
  for (const role of ['STUDENT', 'PARENT', 'TEACHER', 'TRAINER', 'ADMIN'] as Role[]) {
    auth.user = { id: 'test', name: 'Test', username: 'test', role };
    await router.push('/manage/users');
    expect(router.currentRoute.value.path).toBe(role === 'ADMIN' ? '/manage/users' : '/learning');
    await router.push('/manage/courses');
    expect(router.currentRoute.value.path).toBe(
      ['ADMIN', 'TRAINER'].includes(role) ? '/manage/courses' : '/learning',
    );
    for (const path of ['/manage/reinforcements']) {
      await router.push(path);
      expect(router.currentRoute.value.path).toBe(
        ['ADMIN', 'TEACHER'].includes(role) ? path : '/learning',
      );
    }
    await router.push('/manage/questions');
    expect(router.currentRoute.value.path).toBe(
      ['ADMIN', 'TEACHER'].includes(role) ? '/manage/questions' : '/learning',
    );
  }
});
it('requires login for all platform content and preserves direct destinations', async () => {
  for (const path of [
    '/library?grade=1',
    '/training',
    '/assessment',
    '/training/course-id',
    '/missing',
  ]) {
    await router.push(path);
    expect(router.currentRoute.value.path).toBe('/login');
    expect(router.currentRoute.value.query.redirect).toBe(path);
  }
  auth.user = { id: 't', name: 'T', username: 't', role: 'TEACHER' };
  for (const path of ['/library', '/training', '/assessment']) {
    await router.push(path);
    expect(router.currentRoute.value.path).toBe(path);
  }
});

it('supports assessment roles and parent targeted practice only', async () => {
  for (const role of ['STUDENT', 'PARENT', 'TEACHER', 'TRAINER', 'ADMIN'] as Role[]) {
    auth.user = { id: 'test', name: 'Test', username: 'test', role };
    await router.push('/');
    await router.push('/assessment/peak/test');
    expect(router.currentRoute.value.path).toBe(
      role === 'TRAINER' ? '/learning' : '/assessment/peak/test',
    );
  }
  auth.user = { id: 'p', name: 'P', username: 'p', role: 'PARENT' };
  await router.push('/practice?planId=confirmed');
  expect(router.currentRoute.value.path).toBe('/practice');
  await router.push('/practice?objectiveId=random');
  expect(router.currentRoute.value.path).toBe('/learning');
});

it('shows the login entry for website visitors even when a platform session exists', async () => {
  auth.user = { id: 't', name: 'T', username: 't', role: 'TEACHER' };
  await router.push('/login?from=website&redirect=/assessment');
  expect(router.currentRoute.value.path).toBe('/login');
  expect(router.currentRoute.value.query.redirect).toBe('/assessment');
});

it('opens the platform root at login for visitors', async () => {
  await router.push('/');
  expect(router.currentRoute.value.path).toBe('/login');
});
