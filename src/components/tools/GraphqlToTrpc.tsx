import React, { useState, useEffect } from 'react';
import { ArrowRight, Code2, Database } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import CopyButton from '../ui/CopyButton';

const DEFAULT_GRAPHQL = `type User {
  id: ID!
  name: String!
  email: String
  age: Int
}

type Query {
  getUser(id: ID!): User
  listUsers(limit: Int): [User!]!
}

type Mutation {
  createUser(name: String!, email: String, age: Int): User!
}`;

export default function GraphqlToTrpc() {
  const [input, setInput] = useState(DEFAULT_GRAPHQL);
  const [output, setOutput] = useState('');

  const debouncedInput = useDebounce(input, 300);

  useEffect(() => {
    if (!debouncedInput.trim()) {
      setOutput('// Paste a GraphQL schema to get started.');
      return;
    }
    try {
      setOutput(generateTrpcRouter(debouncedInput));
    } catch (err) {
      setOutput('// Error parsing schema. Please ensure it is valid GraphQL.');
    }
  }, [debouncedInput]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="bg-slate-950/50 px-4 py-3 border-b border-slate-800 flex items-center gap-2">
            <Database className="w-4 h-4 text-pink-400" />
            <label htmlFor="graphqlInput" className="text-sm font-medium text-slate-300">GraphQL Schema</label>
          </div>
          <textarea
            id="graphqlInput"
            className="w-full flex-1 min-h-[500px] bg-transparent p-4 text-sm font-mono text-slate-300 focus:outline-none resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Paste your GraphQL schema here..."
          />
        </div>

        {/* Output Column */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden relative group">
          <div className="bg-slate-950/50 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-medium text-slate-300">tRPC Router (TypeScript)</span>
            </div>
            <CopyButton text={output} variant="ghost" size="sm" />
          </div>
          <label htmlFor="trpcOutput" className="sr-only">tRPC Router Output</label>
          <textarea
            id="trpcOutput"
            className="w-full flex-1 min-h-[500px] bg-transparent p-4 text-sm font-mono text-sky-300 focus:outline-none resize-none"
            value={output}
            readOnly
            spellCheck={false}
            aria-label="Generated tRPC Router TypeScript code"
          />
        </div>
      </div>
    </div>
  );
}

// --- Zero-Dependency Parser Logic ---
function mapTypeToZod(gqlType: string): string {
  const isRequired = gqlType.endsWith('!');
  const cleanType = gqlType.replace(/!/g, '').replace(/\[|\]/g, '');
  
  let zodType: string;
  if (cleanType === 'String' || cleanType === 'ID') zodType = 'z.string()';
  else if (cleanType === 'Int' || cleanType === 'Float') zodType = 'z.number()';
  else if (cleanType === 'Boolean') zodType = 'z.boolean()';
  else zodType = 'z.any()'; // Fallback for custom objects
  
  if (gqlType.includes('[')) zodType = `z.array(${zodType})`;
  return isRequired ? zodType : `${zodType}.optional()`;
}

function parseArguments(argString: string): string {
  if (!argString) return '';
  const args = argString.split(',').map(a => a.trim());
  const zodFields = args.map(arg => {
    const [name, type] = arg.split(':').map(s => s.trim());
    return `${name}: ${mapTypeToZod(type)}`;
  });
  return `z.object({ ${zodFields.join(', ')} })`;
}

function generateTrpcRouter(schema: string): string {
  const routes: string[] = [];
  
  // Very basic regex to extract Query and Mutation blocks
  const blockRegex = /type\s+(Query|Mutation)\s*{([^}]+)}/g;
  let match;

  while ((match = blockRegex.exec(schema)) !== null) {
    const isMutation = match[1] === 'Mutation';
    const methodType = isMutation ? 'mutation' : 'query';
    const fieldsBlock = match[2];
    
    const fieldRegex = /(\w+)(?:\(([^)]+)\))?\s*:\s*([^ \n]+)/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(fieldsBlock)) !== null) {
      const fieldName = fieldMatch[1];
      const args = fieldMatch[2];
      const returnType = fieldMatch[3];

      let routeStr = `  ${fieldName}: publicProcedure\n`;
      if (args) {
        routeStr += `    .input(${parseArguments(args)})\n`;
      }
      routeStr += `    .${methodType}(async ({ input }) => {\n      // TODO: Return ${returnType}\n      return null as any;\n    }),`;
      routes.push(routeStr);
    }
  }

  if (routes.length === 0) {
    return '// Waiting for type Query or type Mutation...';
  }

  return `import { z } from 'zod';\nimport { router, publicProcedure } from './trpc';\n\nexport const appRouter = router({\n${routes.join('\n\n')}\n});\n\nexport type AppRouter = typeof appRouter;`;
}