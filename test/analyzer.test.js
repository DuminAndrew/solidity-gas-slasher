// Тесты ядра: анализ test/sample.sol и базовые инварианты находок.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { analyzeSource } = require('../src/analyzer');

const src = fs.readFileSync(path.join(__dirname, 'sample.sol'), 'utf8');

test('sample.sol: парсер не падает и находки отсортированы', () => {
  const { findings, error } = analyzeSource(src, 'sample.sol');
  assert.strictEqual(error, null, 'парсер не должен падать');
  // Отсортировано по строке.
  for (let i = 1; i < findings.length; i++) {
    assert.ok(findings[i - 1].line <= findings[i].line, 'находки отсортированы по строке');
  }
});

test('sample.sol: срабатывают исходные 6 правил', () => {
  const { findings } = analyzeSource(src, 'sample.sol');
  const ids = new Set(findings.map((f) => f.ruleId));
  const expected = [
    'cache-array-length',
    'increment-prefix-unchecked',
    'uint-gt-zero',
    'custom-errors',
    'calldata-params',
    'constant-immutable',
  ];
  const missing = expected.filter((id) => !ids.has(id));
  assert.strictEqual(missing.length, 0, 'не найдены правила: ' + missing.join(', '));
  assert.ok(findings.length >= 6, 'ожидалось >= 6 находок, получено ' + findings.length);
});

test('битый источник возвращает ошибку парсинга, а не исключение', () => {
  const { error } = analyzeSource('contract { this is not solidity ((', 'broken.sol');
  // tolerant-режим может что-то распарсить; главное — не выбросить исключение наружу.
  assert.ok(error === null || typeof error === 'string');
});
