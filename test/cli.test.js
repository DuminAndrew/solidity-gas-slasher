// Тесты CLI: запуск через дочерний процесс на test/fixtures.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CLI = path.join(__dirname, '..', 'src', 'cli.js');
const FIXTURES = path.join(__dirname, 'fixtures');

function run(args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

test('stylish: сканирует папку и печатает находки', () => {
  const r = run([FIXTURES, '-f', 'stylish']);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /Найдено газ-замечаний/);
});

test('json: валидный JSON на stdout', () => {
  const r = run([FIXTURES, '-f', 'json']);
  assert.strictEqual(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.strictEqual(parsed.tool, 'solidity-gas-slasher');
  assert.ok(parsed.findings_count > 0);
});

test('--fail-on medium: ненулевой код выхода при наличии medium+', () => {
  const r = run([FIXTURES, '-f', 'json', '--fail-on', 'medium']);
  assert.strictEqual(r.status, 2, 'ожидался exit code 2 (gate сработал)');
});

test('чистый контракт с --fail-on high не валит сборку', () => {
  const r = run([path.join(FIXTURES, 'clean.sol'), '-f', 'json', '--fail-on', 'high']);
  assert.strictEqual(r.status, 0);
  const parsed = JSON.parse(r.stdout);
  assert.strictEqual(parsed.findings_count, 0);
});

test('--help печатает usage и выходит с 0', () => {
  const r = run(['--help']);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /gas-slasher/);
});

test('несуществующий путь → код выхода 1', () => {
  const r = run(['definitely-not-here.sol']);
  assert.strictEqual(r.status, 1);
});
