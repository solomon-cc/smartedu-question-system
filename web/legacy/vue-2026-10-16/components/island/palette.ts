/** Official Animal Island app-tile palette, shared by student routes and cards. */
export type IslandTone = 'green' | 'blue' | 'yellow' | 'pink' | 'purple' | 'teal' | 'orange';
export const subjectTone: Record<string, IslandTone> = {
  MATH: 'blue',
  LANGUAGE: 'yellow',
  READING: 'teal',
  LITERACY: 'purple',
};
export const moduleTone: Record<string, IslandTone> = {
  dashboard: 'green',
  skills_homework: 'green',
  skills_practice: 'blue',
  skills_stats: 'purple',
  skills_history: 'blue',
  skills_wrongbook: 'orange',
  application_games: 'teal',
  mood_diary: 'pink',
  assessment_history: 'purple',
};
export const sceneTone: Record<string, IslandTone> = {
  supermarket: 'teal',
  cafe: 'orange',
  schoolbag: 'blue',
};
