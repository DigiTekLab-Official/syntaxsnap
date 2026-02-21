// src/utils/openapiParser.ts
import yaml from 'js-yaml';

// Prevent processing of extremely large inputs that could block the main thread
const MAX_INPUT_SIZE = 512 * 1024; // 512 KB

export function parseOpenAPI(input: string): any {
  if (!input) throw new Error('Input is empty');
  if (input.length > MAX_INPUT_SIZE) throw new Error('Input exceeds maximum allowed size (512 KB)');
  
  try {
    return JSON.parse(input);
  } catch {
    try {
      // In js-yaml v4, load() is safe by default. No schema argument needed.
      return yaml.load(input);
    } catch {
      throw new Error('Invalid JSON or YAML');
    }
  }
}

export function generateMockServer(input: string): string {
  try {
    const schema = parseOpenAPI(input);
    const paths = schema.paths || {};
    
    let code = `import express from 'express';\nconst app = express();\napp.use(express.json());\n\n`;
    
    Object.entries(paths).forEach(([path, methods]: [string, any]) => {
      Object.keys(methods).forEach((method) => {
        const expressPath = path.replace(/{([^}]+)}/g, ':$1');
        code += `// ${method.toUpperCase()} ${path}\n`;
        code += `app.${method.toLowerCase()}('${expressPath}', (req, res) => {\n`;
        code += `  res.json({ message: "Mock response for ${path}", timestamp: new Date() });\n`;
        code += `});\n\n`;
      });
    });

    code += `app.listen(3000, () => console.log('Mock server on port 3000'));`;
    return code;
  } catch (err: any) {
    return `// Error generating server: ${err.message}`;
  }
}