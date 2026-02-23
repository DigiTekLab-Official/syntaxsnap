import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FileCode2, Settings2, Box } from 'lucide-react';
import CopyButton from '../ui/CopyButton';

type Framework = 'node' | 'next' | 'astro';
type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';
type NodeVersion = '18' | '20' | '22';

export default function DockerfileGenerator() {
  const [framework, setFramework] = useState<Framework>('next');
  const [pm, setPm] = useState<PackageManager>('pnpm');
  const [nodeVersion, setNodeVersion] = useState<NodeVersion>('22');
  const [activeTab, setActiveTab] = useState<'dockerfile' | 'ignore'>('dockerfile');
  
  const dockerfile = useMemo(() => generateDockerfile(framework, pm, nodeVersion), [framework, pm, nodeVersion]);
  const dockerignore = useMemo(() => generateDockerignore(framework), [framework]);
  const activeOutput = activeTab === 'dockerfile' ? dockerfile : dockerignore;

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  return (
    <div ref={rootRef} className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Configuration Sidebar (Left) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
              <Settings2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-slate-200">Configuration</h2>
            </div>

            {/* Framework Select */}
            <div className="space-y-3 mb-6">
              <span id="frameworkLabel" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Framework</span>
              <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-labelledby="frameworkLabel">
                {(['next', 'node', 'astro'] as Framework[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFramework(f)}
                    role="radio"
                    aria-checked={framework === f}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between border ${
                      framework === f 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' 
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {f === 'next' ? 'Next.js (Standalone)' : f === 'node' ? 'Node.js (Express/API)' : 'Astro (Node SSR)'}
                    {framework === f && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Package Manager Select */}
            <div className="space-y-3 mb-6">
              <span id="pmLabel" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Package Manager</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="pmLabel">
                {(['npm', 'yarn', 'pnpm', 'bun'] as PackageManager[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPm(p)}
                    role="radio"
                    aria-checked={pm === p}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      pm === p 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Node Version Select */}
            <div className="space-y-3">
              <span id="nodeVersionLabel" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Node.js Version</span>
              <div className="flex gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800" role="radiogroup" aria-labelledby="nodeVersionLabel">
                {(['18', '20', '22'] as NodeVersion[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setNodeVersion(v)}
                    role="radio"
                    aria-checked={nodeVersion === v}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      nodeVersion === v 
                        ? 'bg-slate-800 text-slate-200 shadow' 
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    v{v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Output Area (Right) */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col flex-1 overflow-hidden shadow-xl">
            {/* Tabs & Toolbar */}
            <div className="bg-slate-950/50 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveTab('dockerfile')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'dockerfile' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <Box className="w-4 h-4" /> Dockerfile
                </button>
                <button 
                  onClick={() => setActiveTab('ignore')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'ignore' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <FileCode2 className="w-4 h-4" /> .dockerignore
                </button>
              </div>
              
              <CopyButton text={activeOutput} label="Copy" variant="ghost" />
            </div>

            {/* Code Output */}
            <div className="relative flex-1 group">
              <label htmlFor="dockerOutput" className="sr-only">
                {activeTab === 'dockerfile' ? 'Generated Dockerfile' : 'Generated .dockerignore'}
              </label>
              <textarea
                id="dockerOutput"
                className="w-full h-full min-h-[500px] bg-[#0d1117] p-6 text-[13px] leading-relaxed font-mono text-slate-300 focus:outline-none resize-none"
                value={activeOutput}
                readOnly
                spellCheck={false}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- Generator Logic ---

function getPmSetup(pm: PackageManager) {
  switch (pm) {
    case 'pnpm': return 'RUN npm install -g pnpm';
    case 'yarn': return 'RUN npm install -g yarn';
    case 'bun': return 'RUN npm install -g bun';
    default: return '';
  }
}

function getInstallCmd(pm: PackageManager) {
  switch (pm) {
    case 'pnpm': return 'RUN pnpm install --frozen-lockfile';
    case 'yarn': return 'RUN yarn install --frozen-lockfile';
    case 'bun': return 'RUN bun install --frozen-lockfile';
    default: return 'RUN npm ci';
  }
}

function getBuildCmd(pm: PackageManager) {
  switch (pm) {
    case 'pnpm': return 'RUN pnpm run build';
    case 'yarn': return 'RUN yarn build';
    case 'bun': return 'RUN bun run build';
    default: return 'RUN npm run build';
  }
}

function generateDockerfile(framework: Framework, pm: PackageManager, version: NodeVersion) {
  const baseImage = `FROM node:${version}-alpine AS base`;
  const pmSetup = getPmSetup(pm);
  const installCmd = getInstallCmd(pm);
  const buildCmd = getBuildCmd(pm);
  
  const runnerImage = `FROM node:${version}-alpine AS runner\nWORKDIR /app\nENV NODE_ENV=production`;

  if (framework === 'next') {
    return `# Optimized Multi-stage Dockerfile for Next.js (Standalone)
${baseImage}
${pmSetup ? pmSetup + '\n' : ''}
# Step 1. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY package.json ${pm === 'yarn' ? 'yarn.lock' : pm === 'pnpm' ? 'pnpm-lock.yaml' : pm === 'bun' ? 'bun.lockb' : 'package-lock.json'} ./
${installCmd}
COPY . .
# Next.js telemetry disable
ENV NEXT_TELEMETRY_DISABLED=1
${buildCmd}

# Step 2. Production image, copy all the files and run next
${runnerImage}
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]`;
  }

  if (framework === 'astro') {
    return `# Optimized Dockerfile for Astro (Node SSR Adapter)
${baseImage}
${pmSetup ? pmSetup + '\n' : ''}
FROM base AS builder
WORKDIR /app
COPY package.json ${pm === 'yarn' ? 'yarn.lock' : pm === 'pnpm' ? 'pnpm-lock.yaml' : pm === 'bun' ? 'bun.lockb' : 'package-lock.json'} ./
${installCmd}
COPY . .
${buildCmd}

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Copy built app and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER node
EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:4321/ || exit 1

CMD ["node", "./dist/server/entry.mjs"]`;
  }

  // Default Node.js
  return `# Optimized Dockerfile for Node.js App
${baseImage}
${pmSetup ? pmSetup + '\n' : ''}
FROM base AS builder
WORKDIR /app
COPY package.json ${pm === 'yarn' ? 'yarn.lock' : pm === 'pnpm' ? 'pnpm-lock.yaml' : pm === 'bun' ? 'bun.lockb' : 'package-lock.json'} ./
${installCmd}
COPY . .
${buildCmd}

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER node
EXPOSE 8080
ENV PORT=8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/index.js"]`;
}

function generateDockerignore(framework: Framework) {
  const baseIgnore = `Dockerfile
.dockerignore
node_modules
npm-debug.log
yarn-error.log
pnpm-debug.log
.git
.gitignore
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
README.md`;

  if (framework === 'next') {
    return `${baseIgnore}
.next
out
build
coverage`;
  }

  if (framework === 'astro') {
    return `${baseIgnore}
.astro
dist
build`;
  }

  return `${baseIgnore}
dist
build
coverage`;
}