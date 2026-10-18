export interface PeakItem {
  module: 'D' | 'G';
  category: string;
  itemNumber: number;
  code: string;
  title: string;
  script: string;
  scriptPages: number[];
  stimulusPages: number[];
  responsePage: number;
  note: string;
}
export interface PeakScore {
  code: string;
  score: number;
  response: string;
  notes: string;
}
export const peakCategories = { D: ['FLS', 'PLS', 'VCS', 'VMS'], G: ['LLS', 'CMS', 'CPM', 'RPR'] };
export function summarizePeak(items: PeakItem[], scores: PeakScore[]) {
  const codes = new Set(items.map((i) => i.code));
  const recorded = new Map(scores.filter((s) => codes.has(s.code)).map((s) => [s.code, s]));
  return {
    total: items.length,
    recorded: recorded.size,
    correct: [...recorded.values()].filter((s) => s.score === 1).length,
  };
}
