// src/utils/openapiParser.ts
import yaml from 'js-yaml';

export function parseOpenAPI(input: string): any {
  if (!input) throw new Error('Input is empty');
  try {
    return JSON.parse(input);
  } catch {
    try {
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