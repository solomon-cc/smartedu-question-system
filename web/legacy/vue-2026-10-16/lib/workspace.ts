import { modules } from './modules';
import type { Permission, Role } from './types';

export const workspaceLabel = (role?: Role) =>
  role === 'STUDENT' ? '学习空间' : role === 'TEACHER' ? '教学空间' : '管理空间';

export function modulePresentation(id: string, role?: Role) {
  const module = modules.find((item) => item.id === id);
  if (!module) return undefined;
  const student = role === 'STUDENT';
  const titles: Record<string, string> = {
    dashboard: student ? '学习首页' : role === 'TEACHER' ? '首页' : '管理工作台',
    skills_stats: student ? '成长记录' : role === 'TEACHER' ? '教学分析' : '平台分析',
    assessment_history: student ? '我的评估' : '评估中心',
    skills_homework: student ? '家庭作业' : '学生作业',
    skills_history: student ? '答题历史' : '学习记录',
    skills_wrongbook: student ? '错题本' : '学生错题',
    skills_practice: student ? '开始练习' : '课堂练习',
    mood_diary: student ? '我的心情' : '学生心情历史',
    application_games: student ? '生活练习' : role === 'TEACHER' ? '生活技能' : '生活能力教学',
  };
  const descriptions: Record<string, string> = {
    dashboard: student
      ? '完成今天的小目标，记录每一步成长。'
      : role === 'TEACHER'
        ? '开展评估、安排作业，跟进学生的学习表现。'
        : '管理平台账号、权限和配置，了解平台运行情况。',
    skills_stats: student
      ? '回顾自己的练习与作业记录。'
      : role === 'TEACHER'
        ? '查看你布置的作业与学生学习记录。'
        : '查看平台整体的答题与作业统计。',
    skills_practice: student
      ? module.description
      : '选择学科、年级或教学目标，预览课堂中的题目与反馈。',
    skills_homework: student
      ? module.description
      : role === 'TEACHER'
        ? '查看你布置的学生作业，前往作业管理安排和跟进任务。'
        : '查看平台学生作业，前往作业管理安排和跟进任务。',
    skills_history: student ? module.description : '回顾学生已提交的练习与作业记录。',
    skills_wrongbook: student ? module.description : '查看学生需要巩固的题目，并预览课堂练习。',
    mood_diary: student ? module.description : '查看学生日记，记录情绪表现与教学观察。',
    assessment_history: student
      ? '和老师一起完成评估，在这里回顾自己的成长记录。'
      : module.description,
  };
  const group =
    id === 'assessment_history' && !student
      ? '教学管理'
      : module.group === '学习与成长' && !student
        ? '课堂与学习'
        : module.group;
  return {
    ...module,
    title: titles[id] || module.title,
    description: descriptions[id] || module.description,
    group,
  };
}

export const groupOrder = (role?: Role) =>
  role === 'STUDENT'
    ? ['概览', '学习与成长', '教学管理', '系统管理', '支持']
    : role === 'ADMIN'
      ? ['概览', '系统管理', '教学管理', '课堂与学习', '支持']
      : ['概览', '教学管理', '课堂与学习', '系统管理', '支持'];

export function navigationFor(role: Role | undefined, permissions: Permission[]) {
  const permitted = permissions.filter((p) => p.uiAccess && p.apiAccess);
  return modules
    .filter((m) => permitted.some((p) => p.moduleId === m.id))
    .map((m) => modulePresentation(m.id, role)!)
    .sort((a, b) => {
      const order = (id: string) => {
        const p = permissions.find((p) => p.moduleId === id);
        const parent = permissions.find((item) => item.moduleId === p?.parentId);
        return [parent?.sortOrder ?? p?.sortOrder ?? 0, p?.sortOrder ?? 0];
      };
      const [ap, ac] = order(a.id),
        [bp, bc] = order(b.id);
      return ap - bp || ac - bc;
    });
}

export function quickLinksFor(role: Role | undefined, permissions: Permission[]) {
  const priorities =
    role === 'STUDENT'
      ? [
          'skills_homework',
          'skills_practice',
          'application_games',
          'skills_wrongbook',
          'skills_history',
          'mood_diary',
        ]
      : role === 'TEACHER'
        ? [
            'assessment_history',
            'assignments',
            'students',
            'ability_tracking',
            'questions',
            'papers',
          ]
        : [
            'users',
            'permissions',
            'system_config',
            'homework_audit',
            'audit_logs',
            'assessment_history',
          ];
  const navigation = navigationFor(role, permissions).filter(
    (m) => m.path !== '/' && m.id !== 'help_docs',
  );
  return navigation
    .sort((a, b) => {
      const rank = (id: string) =>
        priorities.includes(id) ? priorities.indexOf(id) : priorities.length;
      return rank(a.id) - rank(b.id);
    })
    .slice(0, 6);
}

export const landingFor = (role: Role | undefined, permissions: Permission[]) =>
  navigationFor(role, permissions).find((m) => m.id === 'dashboard')?.path ||
  navigationFor(role, permissions)[0]?.path ||
  '/forbidden';

export function pageTitleFor(
  moduleId: string,
  role: Role | undefined,
  path: string,
  query: Record<string, unknown> = {},
  fallback?: unknown,
) {
  if (moduleId === 'application_games' && role === 'TEACHER' && query.mode === 'preview')
    return '游戏与练习';
  if (moduleId === 'students' && path.startsWith('/students/')) return '学生档案';
  if (path === '/practice')
    return role !== 'STUDENT'
      ? '课堂预览'
      : query.homeworkId
        ? '作业练习'
        : query.mode === 'wrongbook'
          ? '错题巩固'
          : '自主练习';
  return modulePresentation(moduleId, role)?.title || fallback || '欢迎回来';
}
