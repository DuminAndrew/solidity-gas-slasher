// Тесты репортеров: stylish / json / sarif / markdown на синтетических находках.
const test = require('node:test');
const assert = require('node:assert');
const reporters = require('../src/reporters');

const REPORTS = [
  {
    file: 'a.sol',
    error: null,
    findings: [
      {
        ruleId: 'uint-gt-zero',
        title: 'T1',
        severity: 'low',
        gasHint: '~3 gas',
        message: 'm1',
        line: 5,
        column: 4,
        file: 'a.sol',
      },
      {
        ruleId: 'custom-errors',
        title: 'T2',
        severity: 'medium',
        gasHint: 'g2',
        message: 'm2',
        line: 9,
        column: 8,
        file: 'a.sol',
      },
    ],
  },
  { file: 'b.sol', error: null, findings: [] },
];

test('json: валидный JSON с верным числом находок', () => {
  const out = JSON.parse(reporters.json(REPORTS));
  assert.strictEqual(out.tool, 'solidity-gas-slasher');
  assert.strictEqual(out.findings_count, 2);
  assert.strictEqual(out.findings.length, 2);
});

test('sarif: валидная схема 2.1.0 с правилами и результатами', () => {
  const out = JSON.parse(reporters.sarif(REPORTS));
  assert.strictEqual(out.version, '2.1.0');
  const run = out.runs[0];
  assert.strictEqual(run.results.length, 2);
  // Уникальные правила в driver.rules.
  const ruleIds = run.tool.driver.rules.map((r) => r.id).sort();
  assert.deepStrictEqual(ruleIds, ['custom-errors', 'uint-gt-zero']);
  // SARIF-уровни корректны.
  const levels = run.results.map((r) => r.level).sort();
  assert.deepStrictEqual(levels, ['note', 'warning']);
  // Координаты 1-based и >= 1.
  for (const r of run.results) {
    const region = r.locations[0].physicalLocation.region;
    assert.ok(region.startLine >= 1 && region.startColumn >= 1);
  }
});

test('markdown: таблица с обеими находками', () => {
  const md = reporters.markdown(REPORTS);
  assert.match(md, /uint-gt-zero/);
  assert.match(md, /custom-errors/);
  assert.match(md, /\| Файл:строка \|/);
});

test('stylish: счётчик находок и обработка пустого отчёта', () => {
  const text = reporters.stylish(REPORTS);
  assert.match(text, /uint-gt-zero/);
  assert.match(text, /2/); // total = 2
  const empty = reporters.stylish([{ file: 'x.sol', error: null, findings: [] }]);
  assert.match(empty, /0/);
});

test('markdown: пустой отчёт сообщает об отсутствии находок', () => {
  const md = reporters.markdown([{ file: 'x.sol', error: null, findings: [] }]);
  assert.match(md, /не найдено/i);
});
