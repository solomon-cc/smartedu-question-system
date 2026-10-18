export const rewardGames = [
  { title: '反应力测试', value: 'reaction' },
  { title: '记忆翻牌', value: 'memory' },
  { title: '极速算术', value: 'math' },
  { title: '轻松点击', value: 'clicker' },
  { title: '记忆序列', value: 'simon' },
  { title: '深呼吸', value: 'breath' },
];
export const rewardIcons: Record<string, string> = {
  star: 'mdi-star-circle-outline',
  thumbs: 'mdi-thumb-up-outline',
  heart: 'mdi-heart-outline',
  party: 'mdi-party-popper',
};
export const isImageSource = (value: string | undefined) =>
  !!value && /^(https?:\/\/|data:image\/(png|jpeg|gif|webp);base64,|\/)/i.test(value);
