import type { Experiment } from './engine.js';
export function renderExperiment(
  spec: Experiment,
  options?: { gallery?: boolean },
): Promise<string>;
export function escapeHtml(value: unknown): string;
export function scriptJson(value: unknown): string;
export function document(title: string, body: string, css: string, script?: string): string;
export const mark: string;
