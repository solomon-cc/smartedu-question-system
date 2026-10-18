import { describe, expect, it } from 'vitest';
import { teacherSectionsFor, teacherSectionFor } from './teacherWorkspace';
import type { Permission } from './types';
const p = (
  moduleId: string,
  sections: string[],
  overrides: Partial<Permission> = {},
): Permission => ({
  role: 'TEACHER',
  moduleId,
  parentId: '',
  uiAccess: true,
  apiAccess: true,
  sortOrder: 1,
  workspaceSections: sections,
  ...overrides,
});
describe('teacher card and sidebar permissions', () => {
  it('uses the requested section order with real destinations', () => {
    const sections = teacherSectionsFor([
      p('resources', ['materials']),
      p('students', ['academic', 'development', 'personal']),
      p('ability_tracking', ['development', 'personal']),
      p('assessment_history', ['assessment']),
      p('application_games', ['life', 'games']),
      p('skills_practice', ['academic']),
    ]);
    expect(sections.map((s) => s.title)).toEqual([
      '评估中心',
      '个人中心',
      '学业发展',
      '生活技能',
      '游戏与练习',
      '发展技能干预',
      '素材库',
    ]);
    expect(sections[0].path).toBe('/assessment');
    expect(sections.find((s) => s.id === 'life')?.path).toBe('/application');
    expect(
      teacherSectionsFor(
        [
          p('resources', ['materials']),
          p('students', ['academic', 'development', 'personal']),
          p('assessment_history', ['assessment']),
          p('application_games', ['life', 'games']),
        ],
        'home',
      ).map((s) => s.id),
    ).toEqual(['assessment', 'development', 'life', 'games', 'academic', 'personal', 'materials']);
    expect(sections.at(-1)?.entries[0].path).toBe('/resources');
  });
  it('collects all eight academic functions and both material functions', () => {
    const academic = [
      'students',
      'questions',
      'papers',
      'assignments',
      'skills_practice',
      'skills_homework',
      'skills_history',
      'skills_wrongbook',
    ];
    const list = [
      ...academic.map((id) => p(id, ['academic'])),
      p('resources', ['materials']),
      p('reinforcements', ['materials']),
    ];
    expect(teacherSectionFor('academic', list)?.entries.map((e) => e.id)).toEqual(academic);
    expect(teacherSectionFor('materials', list)?.entries.map((e) => e.id)).toEqual([
      'resources',
      'reinforcements',
    ]);
    expect(teacherSectionFor('games', list)).toBeUndefined();
  });
  it('removes disabled entries, drops empty sections, and rejects unknown or non-teacher access', () => {
    const permissions = [
      p('resources', ['materials'], { apiAccess: false }),
      p('reinforcements', ['materials'], { uiAccess: false }),
      p('assessment_history', ['assessment']),
      p('students', ['personal'], { role: 'STUDENT' }),
    ];
    expect(teacherSectionsFor(permissions).map((s) => s.id)).toEqual(['assessment']);
    expect(teacherSectionFor('materials', permissions)).toBeUndefined();
    expect(teacherSectionFor('unknown', permissions)).toBeUndefined();
    expect(teacherSectionsFor([p('resources', [])])).toEqual([]);
  });
});
