import type {
  AssessmentRecord,
  AssessmentResponse,
  AssessmentDefinition,
  AssessmentMethodInfo,
} from './assessments';
export interface LearningPlan {
  id: string;
  studentId: string;
  methodId?: string;
  assessmentId: string;
  module: string;
  version: string;
  sourceCodes: string[];
  objectiveId: string;
  objectiveName: string;
  target: string;
  notes: string;
  confirmedBy: string;
  confirmedAt: string;
  paperId: string;
  homeworkId: string;
  followupAssessmentId: string;
}
export interface PlanComparison {
  baseline: AssessmentRecord;
  followup: AssessmentRecord;
  method?: AssessmentMethodInfo;
  scoring?: AssessmentDefinition['scoring'];
  items: {
    code: string;
    title: string;
    before: AssessmentResponse | null;
    after: AssessmentResponse | null;
    observation?: string;
  }[];
}
export function comparisonLabel(
  before: AssessmentResponse | null,
  after: AssessmentResponse | null,
  observation?: string,
) {
  return observation || (!before || !after ? '未评 · 暂不比较' : '已记录两次反应');
}
export const assessmentLabel = (item: AssessmentRecord, methodName = item.methodId) =>
  `${methodName} ${item.module} · ${item.date} · ${item.status === 'completed' ? '已完成' : '评估中'}`;
