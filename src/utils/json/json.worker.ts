// src/utils/json/json.worker.ts — runs large JSON jobs off the main thread.
// Input arrives by postMessage from this page only; nothing is fetched or sent anywhere.
import { formatJson } from './format';
import { parseJson, lintJson } from './parse';
import { convert } from './convert';
import type { WorkerRequest } from './worker';

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, job } = e.data;
  try {
    let result: unknown;
    if (job.op === 'format') result = formatJson(job.text, job.opts);
    else if (job.op === 'parse') result = parseJson(job.text, job.opts);
    else if (job.op === 'lint') result = lintJson(job.text, job.opts);
    else result = await convert(job.kind, job.text, job.opts);
    (self as unknown as Worker).postMessage({ id, ok: true, result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
