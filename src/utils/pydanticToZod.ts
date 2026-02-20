export function pydanticToZod(schema: any, isOptional = false): string {
  if (!schema) return 'z.unknown()';

  let zodString = '';

  if (schema.$ref) {
    const modelName = schema.$ref.split('/').pop();
    zodString = modelName;
  } else if (schema.anyOf) {
    const nonNullSchema = schema.anyOf.find((s: any) => s.type !== 'null');
    zodString = nonNullSchema ? pydanticToZod(nonNullSchema) + '.nullable()' : 'z.unknown()';
  } else if (schema.type === 'string') {
    zodString = 'z.string()';
    if (schema.format === 'email') zodString += '.email()';
    if (schema.format === 'date-time') zodString += '.datetime()';
  } else if (schema.type === 'integer') {
    zodString = 'z.number().int()';
  } else if (schema.type === 'number') {
    zodString = 'z.number()';
  } else if (schema.type === 'boolean') {
    zodString = 'z.boolean()';
  } else if (schema.type === 'array') {
    const itemSchema = pydanticToZod(schema.items);
    zodString = `z.array(${itemSchema})`;
  } else if (schema.type === 'object' || schema.properties) {
    const props = schema.properties || {};
    const requiredFields = schema.required || [];
    
    const propStrings = Object.entries(props).map(([key, val]: [string, any]) => {
      const isReq = requiredFields.includes(key);
      const fieldZod = pydanticToZod(val, !isReq);
      return `  ${key}: ${fieldZod},`;
    });

    zodString = `z.object({\n${propStrings.join('\n')}\n})`;
  } else {
    zodString = 'z.unknown()';
  }

  if (isOptional && !zodString.endsWith('.optional()') && !zodString.endsWith('.nullable()')) {
    zodString = schema.$ref ? `z.lazy(() => ${zodString}.optional())` : zodString + '.optional()';
  }

  return zodString;
}