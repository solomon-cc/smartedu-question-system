import { subjects, subjectName, subjectValue, type Topic } from './types';
// Muted brand accents; grades retain their text labels for identification.
export const gradeColors = [
  '#346b59',
  '#8a654b',
  '#546e83',
  '#756281',
  '#5f7653',
  '#8b6e38',
  '#346b59',
  '#8a654b',
  '#546e83',
  '#756281',
  '#5f7653',
  '#8b6e38',
];
export const gradeLabel = (grade: number) =>
  `${['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '高一', '高二', '高三'][grade] || grade}${grade < 10 ? '年级' : ''}`;
export function gradeCardsFor(topics: Topic[], search = '') {
  const term = search.trim().toLowerCase();
  return Array.from(new Set(topics.map((t) => t.grade)))
    .sort((a, b) => a - b)
    .map((grade) => {
      const all = topics.filter((t) => t.grade === grade);
      const filtered = all.map((t) => ({
        ...t,
        objectives: t.objectives.filter((o) =>
          `${t.name} ${o.name} ${subjectName(t.subject)} ${gradeLabel(grade)}`
            .toLowerCase()
            .includes(term),
        ),
      }));
      return {
        grade,
        color: gradeColors[(grade - 1) % gradeColors.length],
        summary: [...new Set(all.map((t) => t.name))].slice(0, 5).join('、'),
        subjects: subjects
          .map((s) => {
            const selected = filtered.filter((t) => subjectValue(t.subject) === s.value);
            return {
              ...s,
              skills: selected.reduce(
                (n, t) => n + t.objectives.filter((o) => o.count > 0).length,
                0,
              ),
              questions: selected.reduce(
                (n, t) => n + t.objectives.reduce((a, o) => a + o.count, 0),
                0,
              ),
            };
          })
          .filter((s) => s.questions > 0),
      };
    })
    .filter((c) => c.subjects.length);
}
export type GradeCard = ReturnType<typeof gradeCardsFor>[number];
