// Форматы отчёта: stylish (консоль) / json / sarif / markdown.
const SEV_ICON = { high: '🔴', medium: '🟠', low: '🟡' };

function flat(reports) { return reports.flatMap(r => r.findings); }

function stylish(reports) {
  const lines = [];
  let total = 0;
  for (const r of reports) {
    if (r.error) { lines.push(`\n${r.file}\n  ⚠ ${r.error}`); continue; }
    if (!r.findings.length) continue;
    lines.push(`\n${r.file}`);
    for (const f of r.findings) {
      total++;
      lines.push(`  ${f.line}:${f.column}  ${SEV_ICON[f.severity] || '·'} ${f.severity.padEnd(6)} ${f.ruleId}  — ${f.title}`);
      lines.push(`        ↳ ${f.message}  [${f.gasHint}]`);
    }
  }
  lines.push(`\n${total ? '⚡' : '✅'} Найдено газ-замечаний: ${total}`);
  return lines.join('\n');
}

function json(reports) {
  const findings = flat(reports);
  return JSON.stringify({ tool: 'solidity-gas-slasher', version: '0.1.0', files: reports.length, findings_count: findings.length, findings }, null, 2);
}

function markdown(reports) {
  const f = flat(reports);
  const L = ['# Solidity Gas-Slasher — отчёт', '', `**Файлов:** ${reports.length} · **Замечаний:** ${f.length}`, ''];
  if (!f.length) { L.push('✅ Газ-неэффективностей не найдено.'); return L.join('\n'); }
  L.push('| Файл:строка | Серьёзность | Правило | Рекомендация | Экономия |', '|---|---|---|---|---|');
  for (const x of f) L.push(`| \`${x.file}:${x.line}\` | ${x.severity} | ${x.ruleId} | ${x.message} | ${x.gasHint} |`);
  L.push('', '> Оценки экономии газа — ориентировочные; проверяйте профилировщиком (eth-gas-reporter/forge snapshot).');
  return L.join('\n');
}

function sarif(reports) {
  const rules = new Map();
  const results = [];
  const level = { high: 'error', medium: 'warning', low: 'note' };
  for (const r of reports) {
    for (const x of r.findings) {
      if (!rules.has(x.ruleId)) rules.set(x.ruleId, { id: x.ruleId, name: x.title, shortDescription: { text: x.title } });
      results.push({
        ruleId: x.ruleId, level: level[x.severity] || 'warning',
        message: { text: `${x.title}: ${x.message} [${x.gasHint}]` },
        locations: [{ physicalLocation: { artifactLocation: { uri: x.file }, region: { startLine: Math.max(1, x.line), startColumn: Math.max(1, x.column + 1) } } }],
      });
    }
  }
  return JSON.stringify({
    version: '2.1.0', $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{ tool: { driver: { name: 'solidity-gas-slasher', version: '0.1.0', rules: [...rules.values()] } }, results }],
  }, null, 2);
}

module.exports = { stylish, json, markdown, sarif };
