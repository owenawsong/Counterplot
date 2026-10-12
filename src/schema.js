import { MODELS } from './engine.js';
export function experimentSchema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Counterplot experiment v1',
    description: 'Relations such as infected ≤ population are checked by the numerical engine.',
    oneOf: Object.entries(MODELS).map(([key, model]) => {
      const properties = Object.fromEntries(
        Object.entries(model.controls).map(([k, c]) => [
          k,
          {
            type: c.step === 1 ? 'integer' : 'number',
            minimum: c.min,
            maximum: c.max,
            description: `${c.label}${c.unit ? ' (' + c.unit + ')' : ''}. ${c.help}`,
          },
        ]),
      );
      return {
        type: 'object',
        additionalProperties: false,
        required: ['schemaVersion', 'model', 'title', 'description', 'parameters'],
        properties: {
          schemaVersion: { const: 1 },
          model: { const: key },
          title: { type: 'string', minLength: 1, maxLength: 140, pattern: '\\S' },
          description: { type: 'string', minLength: 1, maxLength: 1200, pattern: '\\S' },
          parameters: {
            type: 'object',
            additionalProperties: false,
            required: Object.keys(properties),
            properties,
          },
          scenarios: {
            type: 'array',
            maxItems: 8,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'parameters'],
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 80, pattern: '\\S' },
                parameters: { type: 'object', additionalProperties: false, properties },
              },
            },
          },
        },
      };
    }),
  };
}
