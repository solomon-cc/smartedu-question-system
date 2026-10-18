import { request } from './api';
export interface AssessmentMethodInfo {
  id: string;
  name: string;
  currentVersion: string;
  versions: string[];
  renderer: string;
  canLinkTargets: boolean;
  canCompare: boolean;
}
export interface AssessmentRecord {
  id: string;
  methodId: string;
  studentId: string;
  assessorId?: string;
  module: string;
  version: string;
  date: string;
  status: string;
}
export interface AssessmentResponse {
  code: string;
  score: number | null;
  response: string;
  notes: string;
  values?: Record<string, unknown>;
}
export interface AssessmentItem {
  module: string;
  category: string;
  code: string;
  title: string;
  script?: string;
  materials?: string[];
  definition?: unknown;
}
export interface AssessmentDefinition {
  methodId: string;
  version: string;
  modules: { id: string; name: string }[];
  items: AssessmentItem[];
  scoring: {
    label: string;
    options: { value: number; title: string }[];
    min?: number;
    max?: number;
    step?: number;
    reviewValues?: number[];
    reviewToggleLabel?: string;
  };
  instructions: string;
}
export const assessmentClient = (methodId: string) => {
  const base = `/assessments/methods/${encodeURIComponent(methodId)}`;
  const suffix = (key: string, value?: string) =>
    value ? `?${key}=${encodeURIComponent(value)}` : '';
  const recordPath = (id: string) => `${base}/records/${encodeURIComponent(id)}`;
  return {
    catalog: (version?: string) =>
      request<AssessmentDefinition>(`${base}/catalog${suffix('version', version)}`),
    list: (studentId?: string) =>
      request<AssessmentRecord[]>(`${base}/records${suffix('studentId', studentId)}`),
    get: (id: string) => request<AssessmentRecord>(recordPath(id)),
    create: (studentId: string, module: string, version?: string) =>
      request<AssessmentRecord>(`${base}/records`, 'POST', { studentId, module, version }),
    responses: (id: string) => request<AssessmentResponse[]>(`${recordPath(id)}/responses`),
    save: (id: string, response: AssessmentResponse) =>
      request<AssessmentResponse>(`${recordPath(id)}/responses`, 'POST', response),
    complete: (id: string) => request<AssessmentRecord>(`${recordPath(id)}/complete`, 'POST', {}),
  };
};
export const listAssessmentMethods = () => request<AssessmentMethodInfo[]>('/assessments/methods');
export const listAssessmentRecords = (studentId: string) =>
  request<AssessmentRecord[]>(`/assessments/records?studentId=${encodeURIComponent(studentId)}`);
export const assessmentKey = (record: { methodId?: string; id: string }) =>
  `${record.methodId || 'peak'}:${record.id}`;
export const responseLabel = (
  response: AssessmentResponse | null,
  definition?: Pick<AssessmentDefinition, 'scoring'>,
) => {
  if (!response) return '未评';
  const option = definition?.scoring.options?.find((o) => o.value === response.score);
  return option?.title || (response.score === null ? '已记录观察' : String(response.score));
};
