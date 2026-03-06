
export enum Role {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}

export enum Subject {
  MATH = 'MATH',
  LANGUAGE = 'LANGUAGE',
  READING = 'READING',
  LITERACY = 'LITERACY'
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  MULTIPLE_SELECT = 'MULTIPLE_SELECT',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_BLANK = 'FILL_BLANK',
  CALCULATION = 'CALCULATION'
}

export interface User {
  id: string;
  username: string;
  name?: string;
  password?: string; // Kept for type compatibility but not returned by API
  role: Role;
  grade?: number;
  token?: string;
}

export interface QuestionOption {
  text?: string;
  image?: string;
  value: string;
}

export interface Question {
  id: string;
  subject: Subject | string;
  grade: number;
  type: QuestionType | string;
  stemText: string;
  stemImage?: string;
  options?: QuestionOption[];
  answer: string;
  hint?: string;
  objectiveId?: string;
  attempts?: number;
  correctRate?: number;
}

export interface Homework {
  id: string;
  teacherId: string;
  paperId: string;
  name: string;
  classId: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'completed';
  completed: number;
  total: number;
  studentIds: string[];
  repeatInterval?: 'none' | 'daily' | '3days' | 'weekly' | 'monthly';
  nextRunDate?: string;
}

export interface SkillTopic {
  id: string;
  name: string;
  subject: string;
  grade: number;
  objectives: SkillObjective[];
}

export interface SkillObjective {
  id: string;
  topicId: string;
  name: string;
  target: string;
}

export interface AbilityRecord {
  id: string;
  studentId: string;
  objectiveId: string;
  date: string;
  status: 'Y' | 'N';
  accuracy: number;
}

export interface Reinforcement {
  id: string;
  name: string;
  type: 'ANIMATION' | 'VIDEO';
  url: string;
}

export interface ReinforcementRule {
  id: string;
  targetId: string; // Could be a student ID or a tag
  reinforcementId: string;
  frequency: number; // e.g., every 3 correct answers
}

export interface AttemptState {
  questionId: string;
  attempts: number; // Max 4
}

export interface Resource {
  id: string;
  name: string;
  url: string;
  type: string;
  tags: string[];
  visibility: 'personal' | 'public';
  creatorId: string;
  createdAt: string;
}
