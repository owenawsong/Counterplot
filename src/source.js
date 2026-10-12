import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// LF normalization makes the same source fingerprint portable across Git checkout policies.
export const ENGINE_SHA256 = createHash('sha256')
  .update(readFileSync(new URL('./engine.js', import.meta.url), 'utf8').replace(/\r\n?/g, '\n'))
  .digest('hex');
export const ANALYSIS_SHA256 = createHash('sha256')
  .update(readFileSync(new URL('./analysis.js', import.meta.url), 'utf8').replace(/\r\n?/g, '\n'))
  .digest('hex');
