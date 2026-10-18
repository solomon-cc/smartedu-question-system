import { modulePresentation } from './workspace';
import type { Permission } from './types';

// Labels and section order follow the supplied teacher-home sketch. Membership
// is returned with server permissions; no section can create new API access.
export const teacherSections = [
  {
    id: 'assessment',
    title: '评估中心',
    icon: 'mdi-clipboard-pulse-outline',
    tone: 'secondary',
    description: '选择评估方法，回顾结果与复测记录。',
    detail: '评估方法 · 评估记录',
    priorities: ['assessment_history'],
  },
  {
    id: 'personal',
    title: '个人中心',
    icon: 'mdi-account-school-outline',
    tone: 'success',
    description: '集中查看学生档案、能力变化与心情历史。',
    detail: '学生成长档案',
    priorities: ['students', 'ability_tracking', 'mood_diary', 'skills_history', 'skills_stats'],
  },
  {
    id: 'academic',
    title: '学业发展',
    icon: 'mdi-book-open-page-variant-outline',
    tone: 'info',
    description: '围绕数学、语言与阅读组织题目、试卷和作业。',
    detail: '题目 · 试卷 · 作业',
    priorities: [
      'students',
      'questions',
      'papers',
      'assignments',
      'skills_practice',
      'skills_homework',
      'skills_history',
      'skills_wrongbook',
    ],
  },
  {
    id: 'life',
    title: '生活技能',
    icon: 'mdi-storefront-outline',
    tone: 'error',
    description: '把练习带进超市、餐厅与日常生活。',
    detail: '场景教学 · 任务安排',
    priorities: ['application_games'],
  },
  {
    id: 'games',
    title: '游戏与练习',
    icon: 'mdi-puzzle-outline',
    tone: 'success',
    description: '试玩互动场景，课前熟悉玩法与提示。',
    detail: '互动游戏 · 课堂试玩',
    priorities: ['application_games'],
  },
  {
    id: 'development',
    title: '发展技能干预',
    icon: 'mdi-bullseye-arrow',
    tone: 'error',
    description: '从评估发现出发，确认目标、安排训练并复测。',
    detail: '干预目标 · 训练计划',
    priorities: ['students', 'ability_tracking'],
  },
  {
    id: 'materials',
    title: '素材库',
    icon: 'mdi-folder-image',
    tone: 'info',
    description: '准备课堂素材，管理适合学生的强化物。',
    detail: '图片与媒体 · 强化物',
    priorities: ['resources', 'reinforcements'],
  },
];

const teacherHomeOrder = [
  'assessment',
  'development',
  'life',
  'games',
  'academic',
  'personal',
  'materials',
];

export function teacherSectionsFor(
  permissions: Permission[],
  surface: 'sidebar' | 'home' = 'sidebar',
) {
  const sections =
    surface === 'home'
      ? [...teacherSections].sort(
          (a, b) => teacherHomeOrder.indexOf(a.id) - teacherHomeOrder.indexOf(b.id),
        )
      : teacherSections;
  return sections.flatMap((section) => {
    const entries = section.priorities.flatMap((id) => {
      const p = permissions.find((p) => p.role === 'TEACHER' && p.moduleId === id);
      const module = modulePresentation(id, 'TEACHER');
      if (!p?.uiAccess || !p.apiAccess || !p.workspaceSections?.includes(section.id) || !module)
        return [];
      const title =
        section.id === 'development' && id === 'students'
          ? '学生干预计划'
          : id === 'students' && section.id === 'personal'
            ? '学生档案'
            : id === 'ability_tracking'
              ? '能力与教学目标'
              : id === 'mood_diary'
                ? '学生心情历史'
                : id === 'skills_stats'
                  ? '教学分析'
                  : id === 'skills_history'
                    ? '学习记录'
                    : id === 'skills_practice'
                      ? '课堂练习'
                      : id === 'skills_homework'
                        ? '学生作业'
                        : id === 'skills_wrongbook'
                          ? '学生错题'
                          : id === 'resources'
                            ? '教学素材'
                            : id === 'reinforcements'
                              ? '强化物'
                              : module.title;
      return [
        {
          ...module,
          title: section.id === 'games' ? '场景游戏试玩' : title,
          path: section.id === 'games' ? '/application?mode=preview' : module.path,
        },
      ];
    });
    if (!entries.length) return [];
    return [
      {
        ...section,
        entries,
        path: ['assessment', 'life'].includes(section.id)
          ? entries[0].path
          : `/teaching/${section.id}`,
      },
    ];
  });
}

export const teacherSectionFor = (id: string, permissions: Permission[]) =>
  teacherSectionsFor(permissions).find((section) => section.id === id);
