import {
  assessmentClient,
  type AssessmentDefinition,
  type AssessmentResponse,
} from './assessments';
import type { PeakItem, PeakScore } from './peak';
const client = assessmentClient('peak');
export function peakItems(definition: AssessmentDefinition): PeakItem[] {
  if (definition.methodId !== 'peak') throw new Error('评估材料与方法不匹配');
  return definition.items.map(
    (i, index) =>
      (i.definition as PeakItem) || {
        module: i.module as 'D' | 'G',
        category: i.category,
        code: i.code,
        title: i.title,
        script: i.script || '',
        itemNumber: index + 1,
        scriptPages: [],
        stimulusPages: [],
        responsePage: 0,
        note: '',
      },
  );
}
function peakScore(response: AssessmentResponse): PeakScore {
  if (response.score !== 0 && response.score !== 1) throw new Error('PEAK 反应记录格式不正确');
  return { ...response, score: response.score };
}
export const peakAssessmentClient = {
  list: client.list,
  create: client.create,
  complete: client.complete,
  catalog: async (version?: string) => peakItems(await client.catalog(version)),
  scores: async (id: string) => (await client.responses(id)).map(peakScore),
  save: async (id: string, score: PeakScore) => peakScore(await client.save(id, score)),
};
