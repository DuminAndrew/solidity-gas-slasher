// Анализ Solidity: парсинг через @solidity-parser/parser + прогон газ-правил.
const parser = require('@solidity-parser/parser');
const rules = require('./rules');

function analyzeSource(source, file) {
  let ast;
  try {
    ast = parser.parse(source, { loc: true, tolerant: true });
  } catch (e) {
    return { file, findings: [], error: 'parse error: ' + (e && e.message || e) };
  }
  const findings = [];
  const add = (f) => {
    const loc = (f.node && f.node.loc && f.node.loc.start) || { line: 0, column: 0 };
    findings.push({
      ruleId: f.ruleId, title: f.title, severity: f.severity, gasHint: f.gasHint,
      message: f.suggestion, line: loc.line, column: loc.column, file,
    });
  };
  for (const rule of rules) {
    try { rule(ast, parser, add); } catch (e) { /* устойчивость: одно правило не валит остальные */ }
  }
  findings.sort((a, b) => a.line - b.line || a.ruleId.localeCompare(b.ruleId));
  return { file, findings, error: null };
}

module.exports = { analyzeSource };
