import type { Experiment, Model, Parameters } from './engine.js';
export interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
}
export const ANALYSIS_LIMITS: Readonly<{ axisPoints: 201; cells: 625; estimatedWork: 2000000 }>;
export function metricCatalog(spec: Experiment): MetricDefinition[];
export interface SweepAxis<P extends string = string> {
  parameter: P;
  min: number;
  max: number;
  points: number;
}
export interface ResolvedSweepAxis extends SweepAxis {
  label: string;
  unit: string;
  integer: boolean;
  values: number[];
}
export interface SweepConfig<P extends string = string> {
  axes: SweepAxis<P>[];
  metrics?: string[];
  objective?: { metric: string; direction: 'min' | 'max' };
}
export interface SweepRow {
  gridIndex: number[];
  coordinates: Record<string, number>;
  values: Record<string, number | null>;
  status: 'ok' | 'undefined' | 'invalid';
  warnings: string[];
}
export interface SweepResult {
  kind: 'sweep';
  engineVersion: string;
  model: Model;
  parameters: Record<string, number>;
  axes: ResolvedSweepAxis[];
  metrics: MetricDefinition[];
  objective: { metric: string; direction: 'min' | 'max' } | null;
  rows: SweepRow[];
  best: {
    metric: string;
    direction: 'min' | 'max';
    value: number;
    coordinates: Record<string, number>;
    gridIndex: number[];
    ties: number;
  } | null;
  cells: number;
  invalidCells: number;
  undefinedCells: number;
  estimatedWork: number;
  warnings: string[];
}
export function sweep<S extends Experiment>(
  spec: S,
  config: SweepConfig<Extract<keyof Parameters[S['model']], string>>,
): SweepResult;
export interface SensitivityConfig<P extends string = string> {
  parameters?: P[];
  steps?: Partial<Record<P, number>>;
  metrics?: string[];
}
export interface SensitivityEndpoint {
  coordinate: number;
  status: 'ok' | 'invalid' | 'unavailable';
  warnings: string[];
}
export interface SensitivityEstimate {
  baseline: number | null;
  lower: number | null;
  upper: number | null;
  deltaInput: number | null;
  deltaOutput: number | null;
  slope: number | null;
  endpointSlope: number | null;
  baselineDefined: boolean;
  status: 'ok' | 'undefined-baseline' | 'undefined-comparison';
  elasticity: number | null;
}
export interface SensitivityRow {
  parameter: string;
  label: string;
  unit: string;
  center: number;
  step: number;
  discrete: boolean;
  lower: SensitivityEndpoint;
  upper: SensitivityEndpoint;
  method: 'central' | 'secant' | 'forward' | 'backward' | 'unavailable';
  estimates: Record<string, SensitivityEstimate>;
  warnings: string[];
}
export interface SensitivityResult {
  kind: 'sensitivity';
  engineVersion: string;
  model: Model;
  parameters: Record<string, number>;
  metrics: MetricDefinition[];
  rows: SensitivityRow[];
  estimatedWork: number;
  warnings: string[];
}
export function sensitivity<S extends Experiment>(
  spec: S,
  config?: SensitivityConfig<Extract<keyof Parameters[S['model']], string>>,
): SensitivityResult;
