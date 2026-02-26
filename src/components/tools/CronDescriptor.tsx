'use client';
import React, { useState, useMemo, useCallback, useId } from 'react';
import cronstrue from 'cronstrue';
import cronParser from 'cron-parser';
import { Clock, CalendarDays, AlertTriangle, Copy, Check, Trash2 } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CronField {
  name: string;
  value: string;
  description: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function breakdownCronFields(cron: string): CronField[] {
  const parts = cron.trim().split(/\s+/);
  
  if (parts.length < 5) return [];

  const labels = ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week'];
  const descriptions = [
    '0-59',
    '0-23',
    '1-31',
    '1-12 or JAN-DEC',
    '0-7 or SUN-SAT (0 or 7 is Sunday)'
  ];

  return parts.slice(0, 5).map((value, i) => ({
    name: labels[i],
    value,
    description: descriptions[i]
  }));
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every day at midnight', value: '0 0 * * *' },
  { label: 'Every day at noon', value: '0 12 * * *' },
  { label: 'Every weekday at 9 AM', value: '0 9 * * 1-5' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1' },
  { label: 'First day of month', value: '0 0 1 * *' },
  { label: 'Last day of month', value: '0 0 L * *' }
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CronDescriptor() {
  const [cron, setCron] = useState('0 12 * * 1-5'); // Mon-Fri at 12:00 PM
  const [nextRunCount, setNextRunCount] = useState(5);
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');

  const inputId = useId();

  // Debounce cron input to prevent excessive parsing on every keystroke
  const debouncedCron = useDebounce(cron, 300);

  const timezone = useMemo(() => getUserTimezone(), []);

  const { translation, nextRuns, fields, error } = useMemo(() => {
    if (!debouncedCron.trim()) {
      return {
        translation: '',
        nextRuns: [],
        fields: [],
        error: null
      };
    }

    try {
      // Validate field count first
      const parts = debouncedCron.trim().split(/\s+/);
      if (parts.length < 5) {
        return {
          translation: '',
          nextRuns: [],
          fields: [],
          error: 'Cron expression must have at least 5 fields (minute hour day month weekday).'
        };
      }

      // Get human-readable translation
      const humanText = cronstrue.toString(debouncedCron, { 
        throwExceptionOnParseError: true,
        use24HourTimeFormat: false
      });

      // Parse for next run times
      const interval = cronParser.parseExpression(debouncedCron, {
        currentDate: new Date(),
        tz: timezone
      });

      const runs: string[] = [];
      for (let i = 0; i < nextRunCount; i++) {
        const next = interval.next();
        const date = next.toDate();
        runs.push(date.toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'long',
          timeZone: timezone
        }));
      }

      // Field breakdown
      const fieldBreakdown = breakdownCronFields(debouncedCron);

      return {
        translation: humanText,
        nextRuns: runs,
        fields: fieldBreakdown,
        error: null
      };
    } catch (err) {
      const message = err instanceof Error 
        ? err.message 
        : 'Invalid cron expression. Please check your syntax.';
      
      return {
        translation: '',
        nextRuns: [],
        fields: [],
        error: message
      };
    }
  }, [debouncedCron, nextRunCount, timezone]);

  const handleCopy = useCallback(async () => {
    if (!translation) return;
    
    try {
      await navigator.clipboard.writeText(translation);
      setCopyState('success');
    } catch {
      setCopyState('error');
    } finally {
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [translation]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Input Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <label htmlFor={inputId} className="text-sm font-medium text-slate-400">
            Cron Expression
          </label>
          <button
            type="button"
            onClick={() => setCron('')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 rounded px-2 py-1"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden /> Clear
          </button>
        </div>

        <div className="relative">
          <input
            id={inputId}
            type="text"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-2xl font-mono text-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            placeholder="* * * * *"
            spellCheck={false}
            aria-describedby={error ? 'cron-error' : undefined}
            aria-invalid={!!error}
          />
        </div>

        {/* Quick Presets */}
        <div className="mt-4">
          <p className="text-xs text-slate-400 mb-2">Quick Presets:</p>
          <div className="flex flex-wrap gap-2">
            {CRON_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setCron(preset.value)}
                className="text-xs font-medium px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Field Breakdown */}
      {fields.length > 0 && !error && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">
            Field Breakdown
          </h3>
          <div className="grid grid-cols-5 gap-3">
            {fields.map((field) => (
              <div key={field.name} className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1 uppercase tracking-wide">
                  {field.name}
                </div>
                <div className="text-lg font-mono font-bold text-indigo-300 mb-1">
                  {field.value}
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  {field.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Translation Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-5 h-5 text-emerald-400" aria-hidden />
              <h3 className="font-semibold">Human Readable</h3>
            </div>
            {translation && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
              >
                {copyState === 'success' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden /> Copied
                  </>
                ) : copyState === 'error' ? (
                  <>
                    <Copy className="w-3.5 h-3.5 text-red-400" aria-hidden /> Failed
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden /> Copy
                  </>
                )}
              </button>
            )}
          </div>
          
          {error ? (
            <div
              id="cron-error"
              role="alert"
              aria-live="polite"
              className="flex items-start gap-2 text-amber-400 bg-amber-400/10 p-4 rounded-lg text-sm border border-amber-500/30"
            >
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden />
              <p>{error}</p>
            </div>
          ) : translation ? (
            <p className="text-xl md:text-2xl font-bold text-white leading-tight">
              "{translation}"
            </p>
          ) : (
            <p className="text-slate-600 text-sm">Enter a valid cron expression above.</p>
          )}
        </div>

        {/* Next Runs Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-400">
              <CalendarDays className="w-5 h-5 text-sky-400" aria-hidden />
              <h3 className="font-semibold">Next Expected Runs</h3>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Show:
              <input
                type="number"
                min="1"
                max="20"
                value={nextRunCount}
                onChange={(e) => setNextRunCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                className="w-14 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-center text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              />
            </label>
          </div>
          
          {nextRuns.length > 0 ? (
            <>
              <ul className="space-y-2 mb-3 max-h-[400px] overflow-y-auto">
                {nextRuns.map((run, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-xs font-mono text-slate-300 bg-slate-950/50 px-3 py-2 rounded-lg border border-slate-800/50"
                  >
                    <span className="text-slate-600 text-xs shrink-0 mt-0.5">#{index + 1}</span>
                    <span className="leading-relaxed">{run}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-600 flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden />
                Timezone: {timezone}
              </p>
            </>
          ) : (
            <p className="text-slate-600 text-sm">
              {error ? 'Fix the error above to calculate future runs.' : 'Valid expression required.'}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}