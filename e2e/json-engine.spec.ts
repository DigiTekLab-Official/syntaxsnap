// e2e/json-engine.spec.ts — unit-style checks of the JSON engine (no browser page needed).
import { test, expect } from '@playwright/test';
import { repairJson, extractJsonBlock } from '../src/utils/json/repair';
import { parseJson, lintJson } from '../src/utils/json/parse';
import { diffJson } from '../src/utils/json/compare';
import { toJsonPath } from '../src/utils/json/tree';

const parsed = (s: string) => {
  const r = parseJson(s);
  expect(r.error, `should parse: ${s}`).toBeUndefined();
  return r.value;
};

test.describe('repairJson', () => {
  test('unwraps a ```json code fence and the prose around it', () => {
    const llm = 'Here you go:\n```json\n{"a": 1, "b": [true, false]}\n```\nAnything else?';
    expect(extractJsonBlock(llm)).toBe('{"a": 1, "b": [true, false]}');
    expect(parsed(repairJson(llm))).toEqual({ a: 1, b: [true, false] });
  });

  test('unwraps a bare ``` fence', () => {
    expect(parsed(repairJson('```\n[1, 2, 3,]\n```'))).toEqual([1, 2, 3]);
  });

  test('fixes comments, quotes, bare keys, Python literals and trailing commas', () => {
    const input = "```json\n{\n  // id\n  id: 7, /* inline */\n  'name': 'Ann',\n  ok: True, none: None,\n  list: [1, 2,],\n}\n```";
    expect(parsed(repairJson(input))).toEqual({ id: 7, name: 'Ann', ok: true, none: null, list: [1, 2] });
  });

  test('adds missing commas and closes truncated output', () => {
    expect(parsed(repairJson('{"a": 1 "b": {"c": [1 2'))).toEqual({ a: 1, b: { c: [1, 2] } });
  });

  test('wraps NDJSON lines in an array', () => {
    expect(parsed(repairJson('{"n":1}\n{"n":2}\n{"n":3}'))).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  test('never changes text inside strings', () => {
    expect(parsed(repairJson("{'msg': 'True, None // not a comment, trailing,]'}"))).toEqual({ msg: 'True, None // not a comment, trailing,]' });
  });
});

test.describe('parseJson and lintJson', () => {
  test('reports line and column', () => {
    expect(parseJson('{\n  "a": 1\n  "b": 2\n}').error).toMatchObject({ line: 3, column: 3, message: 'Missing comma between properties.' });
  });

  test('tolerant mode accepts JSONC', () => {
    expect(parseJson("{/* c */ 'a': 1, // x\n}", { tolerant: true }).value).toEqual({ a: 1 });
  });

  test('lint lists several problems and duplicate keys', () => {
    const issues = lintJson("{'a': 1, \"b\": 02, \"a\": 3,}");
    expect(issues.map((i) => i.message)).toEqual([
      'Strings must use double quotes, not single quotes.',
      'Numbers cannot have leading zeros.',
      'Duplicate key "a". JSON.parse keeps only the last value.',
      'Trailing comma before }. Remove the last comma.',
    ]);
  });
});

test.describe('diffJson and paths', () => {
  test('ignores key order and reports paths', () => {
    const { changes } = diffJson({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 3] }, a: 1, d: true });
    expect(changes).toEqual([
      { kind: 'changed', path: '$.b.c[1]', before: 2, after: 3 },
      { kind: 'added', path: '$.d', after: true },
    ]);
  });

  test('bracket notation for unusual keys', () => {
    expect(toJsonPath(['headers', 'content-type', 0, "it's"])).toBe("$.headers['content-type'][0]['it\\'s']");
  });
});
