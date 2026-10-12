export type Model = 'descent' | 'loan' | 'circuit' | 'epidemic' | 'bayes';
export interface Parameters {
  descent: { rate: number; a: number; b: number; x: number; y: number; steps: number };
  loan: { principal: number; apr: number; years: number; extra: number };
  circuit: {
    resistance: number;
    capacitance: number;
    supply: number;
    initial: number;
    duration: number;
  };
  epidemic: {
    population: number;
    infected: number;
    beta: number;
    recovery: number;
    intervention: number;
    reduction: number;
    days: number;
  };
  bayes: { prevalence: number; sensitivity: number; specificity: number; population: number };
}
export type Experiment<M extends Model = Model> = M extends Model
  ? {
      schemaVersion: 1;
      model: M;
      title: string;
      description: string;
      parameters: Parameters[M];
      scenarios?: Array<{ name: string; parameters: Partial<Parameters[M]> }>;
    }
  : never;
export interface Control {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  help: string;
}
export interface ModelDefinition {
  label: string;
  field: string;
  question: string;
  formula: string;
  controls: Record<string, Control>;
  assumptions: string[];
  references: Array<{ label: string; url: string }>;
}
export interface Metric {
  label: string;
  value: number | null;
  unit: string;
  digits: number;
}
export interface Point {
  x: number;
  y: number | null;
}
export interface Series {
  name: string;
  points: Point[];
  unit: string;
}
export interface Chart {
  xLabel: string;
  yLabel: string;
  series: Series[];
  marker?: Point;
  logRecommended?: boolean;
  kind?: string;
}
export interface Result<M extends Model = Model> {
  engineVersion: string;
  model: M;
  parameters: Parameters[M];
  metrics: Metric[];
  chart: Chart;
  secondary?: Chart;
  columns: string[];
  rows: Array<Record<string, number | string | null>>;
  insights: Array<{ label: string; text: string }>;
  warnings: string[];
}
export const VERSION: string;
export const MODELS: Readonly<Record<Model, ModelDefinition>>;
export class SpecError extends Error {
  issues: string[];
  constructor(issues: string[]);
}
export function createSpec(): Experiment<'descent'>;
export function createSpec<M extends Model>(model: M): Experiment<M>;
export function validateSpec(spec: unknown): Experiment;
export function evaluate<M extends Model>(
  spec: Experiment<M>,
  overrides?: Partial<Parameters[M]>,
): Result<M>;
export function csv(result: Pick<Result, 'columns' | 'rows'>): string;
