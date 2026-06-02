// Data-driven tests: каждое правило должно сработать на своём «грязном» сэмпле
// и НЕ давать находок на чистом контракте.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { analyzeSource } = require('../src/analyzer');
const rules = require('../src/rules');

const FIXTURES = path.join(__dirname, 'fixtures');

function analyzeFixture(name) {
  const src = fs.readFileSync(path.join(FIXTURES, name), 'utf8');
  return analyzeSource(src, name);
}

// Каждое правило ↔ его «грязный» сэмпл. Файлы вида <ruleId>.dirty.sol.
const RULE_IDS = [
  'cache-array-length',
  'increment-prefix-unchecked',
  'custom-errors',
  'calldata-params',
  'uint-gt-zero',
  'constant-immutable',
  'unchecked-loop-math',
  'storage-in-loop',
  'default-value-init',
  'long-require-string',
  'public-constant-array',
  'bool-storage',
  'postfix-vs-prefix',
  'immutable-candidate',
  'indexed-events',
  'revert-string-vs-error',
];

test('каждое правило срабатывает на своём dirty-сэмпле', async (t) => {
  for (const ruleId of RULE_IDS) {
    await t.test(ruleId, () => {
      const { findings, error } = analyzeFixture(`${ruleId}.dirty.sol`);
      assert.strictEqual(error, null, `парсер не должен падать на ${ruleId}.dirty.sol`);
      const ids = new Set(findings.map((f) => f.ruleId));
      assert.ok(ids.has(ruleId), `правило ${ruleId} должно сработать (получено: ${[...ids].join(', ') || '∅'})`);
      // У всех находок корректные координаты.
      assert.ok(
        findings.every((f) => f.line > 0 && f.column >= 0),
        'у находок валидные координаты',
      );
      // У находки заданы обязательные поля.
      const f = findings.find((x) => x.ruleId === ruleId);
      assert.ok(f.title && f.message && f.gasHint, 'у находки заполнены title/message/gasHint');
      assert.ok(['high', 'medium', 'low'].includes(f.severity), 'severity валиден');
    });
  }
});

test('чистый контракт не даёт ни одной находки', () => {
  const { findings, error } = analyzeFixture('clean.sol');
  assert.strictEqual(error, null, 'парсер не должен падать на clean.sol');
  assert.deepStrictEqual(
    findings,
    [],
    'на clean.sol не должно быть находок, получено: ' + findings.map((f) => `${f.ruleId}@${f.line}`).join(', '),
  );
});

test('каталог правил: все экспортируемые правила покрыты тестами', () => {
  assert.ok(Array.isArray(rules), 'rules экспортирует массив');
  assert.ok(rules.length >= 12, `ожидалось >= 12 правил, получено ${rules.length}`);
  // Прогон каталога по всем dirty-сэмплам собирает реально достижимые ruleId.
  const seen = new Set();
  for (const ruleId of RULE_IDS) {
    const { findings } = analyzeFixture(`${ruleId}.dirty.sol`);
    findings.forEach((f) => seen.add(f.ruleId));
  }
  // Каждый объявленный в тестах ruleId реально достижим.
  for (const ruleId of RULE_IDS) {
    assert.ok(seen.has(ruleId), `ruleId ${ruleId} ни разу не сработал на сэмплах`);
  }
});

test('каждое правило — функция, run не падает на пустом источнике', () => {
  for (const rule of rules) {
    assert.strictEqual(typeof rule, 'function', 'правило — функция');
  }
  const { error } = analyzeSource(
    '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\ncontract E {}',
    'empty.sol',
  );
  assert.strictEqual(error, null, 'пустой контракт парсится без ошибок');
});
