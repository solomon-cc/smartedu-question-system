export interface PracticeReward {
  id: string;
  name: string;
  type: 'text' | 'sticker' | 'animation' | 'game';
  image?: string;
  prompt?: string;
  duration: number;
}
export const rewardGames = [
  { value: 'reaction', label: '等待与反应' },
  { value: 'memory', label: '图形配对' },
  { value: 'math', label: '轻松算一算' },
  { value: 'clicker', label: '点亮星星' },
  { value: 'simon', label: '跟随顺序' },
  { value: 'breath', label: '呼吸放松' },
];
export const rewardImage = (value = '') => /^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value);
