// Test helpers are imported only by test files.
import type { AssessmentMethodInfo } from './assessments';
export const peakMethodFixture: AssessmentMethodInfo = {
  id: 'peak',
  name: 'PEAK 预评估',
  currentVersion: 'peak-pa-user-docs-v1',
  versions: ['peak-pa-user-docs-v1'],
  renderer: 'peak',
  canLinkTargets: true,
  canCompare: true,
};
export const peakDefinitionFixture = (items: any[]) => ({
  methodId: 'peak',
  version: peakMethodFixture.currentVersion,
  modules: [
    { id: 'D', name: '直接训练预评估' },
    { id: 'G', name: '泛化预评估' },
  ],
  items: items.map((i) => ({ ...i, definition: i })),
  scoring: {
    label: '反应',
    options: [
      { value: 0, title: '未通过' },
      { value: 1, title: '正确反应' },
    ],
    reviewValues: [0],
    reviewToggleLabel: '包含正确反应项目',
  },
  instructions: '',
});
