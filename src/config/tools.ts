// src/config/tools.ts
import { 
  GlassWater, Database, Palette, Search, FileCode2, 
  ShieldCheck, GitCompare, Braces, Sparkles, Server, Zap, TableProperties 
} from 'lucide-astro';

export interface Tool {
  id: string;
  title: string;
  desc: string;
  href: string;
  icon: any; 
  status: 'New' | 'Live' | 'Popular';
  color: string;
  bg: string;
  category: 'json' | 'css' | 'dev' | 'ai';
}

export const TOOLS: Tool[] = [
  {
    id: 'ai-mock-generator',
    title: "AI Mock Generator",
    desc: "Generate realistic mock data using AI.",
    href: "/tools/ai-mock-generator",
    icon: Sparkles,
    status: "New",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    category: "ai"
  },
  {
    id: 'openapi-to-express',
    title: "OpenAPI to Express",
    desc: "Convert specs to Node.js servers.",
    href: "/tools/openapi-to-express",
    icon: Server,
    status: "New",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    category: "dev"
  },
  {
    id: 'pydantic-to-zod',
    title: "Pydantic to Zod",
    desc: "FastAPI JSON to Zod schemas.",
    href: "/tools/pydantic-to-zod",
    icon: Braces,
    status: "Live",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    category: "json"
  },
  {
    id: 'diff-viewer',
    title: "Diff Viewer",
    desc: "Compare text & code versions.",
    href: "/tools/diff-viewer",
    icon: GitCompare,
    status: "Live",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    category: "dev"
  },
  {
    id: 'jwt-debugger',
    title: "JWT Debugger",
    desc: "Decode tokens locally.",
    href: "/tools/jwt-debugger",
    icon: ShieldCheck,
    status: "Live",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    category: "dev"
  },
  {
    id: 'json-to-zod',
    title: "JSON to Zod",
    desc: "Infer Zod schemas instantly.",
    href: "/tools/json-to-zod",
    icon: Database,
    status: "Popular",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    category: "json"
  },
  {
    id: 'regex-tester',
    title: "Regex Tester",
    desc: "Debug JS regex patterns.",
    href: "/tools/regex-tester",
    icon: Search,
    status: "Live",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    category: "dev"
  },
  {
    id: 'mesh-gradient',
    title: "Mesh Gradient",
    desc: "Create aurora backgrounds.",
    href: "/tools/mesh-gradient",
    icon: Palette,
    status: "Live",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    category: "css"
  },
  {
    id: 'glass-generator',
    title: "Glassmorphism",
    desc: "Generate frosted glass CSS.",
    href: "/tools/glass-generator",
    icon: GlassWater,
    status: "Live",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    category: "css"
  },
  {
    id: 'svg-to-jsx',
    title: "SVG to JSX",
    desc: "Convert SVG to React.",
    href: "/tools/svg-to-jsx",
    icon: FileCode2,
    status: "Live",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    category: "dev"
  },
  {
    id: 'openapi-mock',
    title: "OpenAPI Mock",
    desc: "Instant zero-dep mock servers.",
    href: "/tools/openapi-mock",
    icon: Zap,
    status: "Live",
    color: "text-cyan-300",
    bg: "bg-cyan-500/10",
    category: "dev"
  },
  {
    id: 'sql-to-json',
    title: "SQL to JSON Schema",
    desc: "Convert SQL CREATE TABLE to JSON Schema.",
    href: "/tools/sql-to-json",
    icon: TableProperties,
    status: "New",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    category: "dev"
  }
];