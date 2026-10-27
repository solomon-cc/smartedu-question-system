export interface GameItem {
  id: string;
  name: string;
  price: number;
  image: string;
  art: string;
}
export interface GameChoice {
  id: string;
  label: string;
  art: string;
}
export interface GameStep {
  id: string;
  title: string;
  prompt: string;
  hint: string;
  kind: string;
  choices: GameChoice[];
}
export interface GameLevel {
  id: string;
  name: string;
  goal: string;
  budgetCents: number;
  targets: { itemId: string; quantity: number }[];
  wallet: { cents: number; count: number }[];
  steps: GameStep[];
}
export interface GameDefinition {
  version: string;
  environment: string;
  background: string;
  goals: string[];
  transfer: string[];
  levels: GameLevel[];
}
export interface GameScenario {
  id: string;
  name: string;
  description: string;
  type: string;
  image: string;
  game?: GameDefinition;
}
export interface GameAction {
  kind: string;
  itemId?: string;
  value?: number;
  choiceId?: string;
  requestId?: string;
}
export interface GameSession {
  id: string;
  scenarioId: string;
  scenarioName: string;
  studentId: string;
  actorId: string;
  mode: string;
  levelId: string;
  status: string;
  startedAt: string;
  definition: GameDefinition;
  items: GameItem[];
  state: {
    step: number;
    cart: Record<string, number>;
    money: Record<string, number>;
    totalCents: number;
    paidCents: number;
    finished: boolean;
  };
  events: {
    stepId: string;
    kind: string;
    correct: boolean;
    advanced: boolean;
    feedback: string;
    at: string;
  }[];
}
export interface GameResult {
  session: GameSession;
  feedback: string;
  correct: boolean;
}
export interface GameSummary {
  id: string;
  scenarioName: string;
  studentName: string;
  studentId: string;
  mode: string;
  levelName: string;
  status: string;
  startedAt: string;
  stepsCompleted: number;
  totalSteps: number;
  errors: number;
  hints: number;
  independentSteps: number;
}
export const yuan = (cents: number) =>
  (cents / 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
export const centsFrom = (value: string) =>
  /^\d+(\.\d{1,2})?$/.test(value) ? Math.round(Number(value) * 100) : null;
