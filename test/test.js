// Простые тесты ядра (без фреймворков): анализ sample.sol и проверка находок.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { analyzeSource } = require('../src/analyzer');

const src = fs.readFileSync(path.join(__dirname, 'sample.sol'), 'utf8');
const { findings, error } = analyzeSource(src, 'sample.sol');

assert.strictEqual(error, null, 'парсер не должен падать');
const ids = new Set(findings.map((f) => f.ruleId));

const expected = ['cache-array-length', 'increment-prefix-unchecked', 'uint-gt-zero', 'custom-errors', 'calldata-params', 'constant-immutable'];
const missing = expected.filter((id) => !ids.has(id));

assert.strictEqual(missing.length, 0, 'не найдены правила: ' + missing.join(', '));
assert.ok(findings.length >= 6, 'ожидалось >= 6 находок, получено ' + findings.length);
assert.ok(findings.every((f) => f.line > 0), 'у всех находок есть строка');

console.log('OK: ' + findings.length + ' находок, правила: ' + [...ids].sort().join(', '));
