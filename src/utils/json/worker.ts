// src/utils/json/worker.ts — async API that runs small inputs inline and
// hands anything over 1 MB to a Web Worker so typing never blocks.
//
// Each "channel" (format, parse, convert…) has at most one job in flight. A new
// job on a busy channel terminates the old worker, so a stale 10 MB format never
// delays the result for what the user just typed.
import { formatJson, type FormatOptions, type FormatResult } from './format';
import { parseJson, lintJson, type ParseOptions, type ParseError, type LintOptions, type Issue } from './parse';
import { convert } from './convert';
import type { ConvertOp, ConvertOptions, ConvertResult } from './types';

/** Inputs at or above this many characters go to the worker. */
export const WORKER_THRESHOLD = 1024 * 1024;

export type WorkerJob =
  | { op: 'format'; text: string; opts: FormatOptions }
  | { op: 'parse'; text: string; opts: ParseOptions }
  | { op: 'lint'; text: string; opts: LintOptions }
  | { op: 'convert'; kind: ConvertOp; text: string; opts: ConvertOptions };

export interface WorkerRequest { id: number; job: WorkerJob }
interface WorkerResponse { id: number; ok: boolean; result?: unknown; error?: string }

/** Rejection reason when a newer job replaced this one. Callers can ignore it. */
export class SupersededError extends Error {
  constructor() { super('Superseded by a newer job'); this.name = 'SupersededError'; }
}

interface Channel { worker: Worker | null; pending: { id: number; resolve: (v: unknown) => void; reject: (e: unknown) => void } | null }
const channels = new Map<string, Channel>();
let nextId = 1;

function spawn(): Worker {
  return new Worker(new URL('./json.worker.ts', import.meta.url), { type: 'module', name: 'syntaxsnap-json' });
}

function runInWorker<T>(channel: string, job: WorkerJob): Promise<T> {
  let ch = channels.get(channel);
  if (!ch) { ch = { worker: null, pending: null }; channels.set(channel, ch); }
  if (ch.pending) {
    // Drop the stale job: kill its worker and reject its promise.
    ch.worker?.terminate();
    ch.worker = null;
    ch.pending.reject(new SupersededError());
    ch.pending = null;
  }
  const c = ch;
  if (!c.worker) {
    c.worker = spawn();
    c.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const p = c.pending;
      if (!p || p.id !== e.data.id) return;
      c.pending = null;
      if (e.data.ok) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error));
    };
    c.worker.onerror = (e) => {
      const p = c.pending;
      c.pending = null;
      c.worker?.terminate();
      c.worker = null;
      p?.reject(new Error(e.message || 'The background worker failed.'));
    };
  }
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    c.pending = { id, resolve: resolve as (v: unknown) => void, reject };
    c.worker!.postMessage({ id, job } satisfies WorkerRequest);
  });
}

const useWorker = (text: string) => text.length >= WORKER_THRESHOLD && typeof Worker !== 'undefined';

/** Yield once so a big inline job never runs inside the input event handler. */
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export async function formatAsync(text: string, opts: FormatOptions = {}, channel = 'format'): Promise<FormatResult> {
  if (useWorker(text)) return runInWorker<FormatResult>(channel, { op: 'format', text, opts });
  await tick();
  return formatJson(text, opts);
}

export async function parseAsync(text: string, opts: ParseOptions = {}, channel = 'parse'): Promise<{ value?: unknown; error?: ParseError }> {
  if (useWorker(text)) return runInWorker(channel, { op: 'parse', text, opts });
  return parseJson(text, opts);
}

export async function lintAsync(text: string, opts: LintOptions = {}, channel = 'lint'): Promise<Issue[]> {
  if (useWorker(text)) return runInWorker(channel, { op: 'lint', text, opts });
  return lintJson(text, opts);
}

export async function convertAsync(kind: ConvertOp, text: string, opts: ConvertOptions = {}, channel = 'convert'): Promise<ConvertResult> {
  if (useWorker(text)) return runInWorker<ConvertResult>(channel, { op: 'convert', kind, text, opts });
  return convert(kind, text, opts);
}
