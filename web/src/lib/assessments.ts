export interface AssessmentRecord {
  methodId: string;
  id: string;
  studentId: string;
  assessorId: string;
  date: string;
  module: string;
  version: string;
  status: string;
}
export interface AssessmentSummary extends AssessmentRecord {
  studentName: string;
  methodName: string;
  total: number;
  recorded: number;
  correct: number;
}
export interface AssessmentResponse {
  code: string;
  score: number | null;
  response: string;
  notes: string;
}
export interface AssessmentItem {
  code: string;
  title: string;
  module: string;
  category: string;
  script?: string;
  definition?: {
    responsePage: number;
    stimulusPages: number[];
    scriptPages: number[];
    note: string;
  };
}
export interface AssessmentTarget {
  id: string;
  target: string;
  objectiveName: string;
  questionCount: number;
  sourceCodes: string[];
  confirmedAt: string;
}
export interface AssessmentDetail {
  record: AssessmentRecord;
  studentName: string;
  definition: {
    methodId: string;
    version: string;
    instructions: string;
    items: AssessmentItem[];
    scoring: { options: { value: number; title: string }[] };
  };
  responses: AssessmentResponse[];
  targets: AssessmentTarget[];
}
export const moduleName = (s: string) =>
  s === 'D' ? '直接训练（D）' : s === 'G' ? '泛化（G）' : s;
