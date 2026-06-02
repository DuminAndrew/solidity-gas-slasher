#!/usr/bin/env node
// CLI: gas-slasher <file.sol|dir> [-f stylish|json|sarif|md] [--fail-on low|medium|high] [-o file]
const fs = require('fs');
const path = require('path');
const { analyzeSource } = require('./analyzer');
const reporters = require('./reporters');

const SKIP = new Set(['node_modules', '.git', 'out', 'artifacts', 'cache', 'lib', 'build']);

function collectSol(target) {
  const out = [];
  const st = fs.statSync(target);
  if (st.isFile()) {
    if (target.endsWith('.sol')) out.push(target);
    return out;
  }
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP.has(e.name)) walk(path.join(d, e.name));
      } else if (e.name.endsWith('.sol')) out.push(path.join(d, e.name));
    }
  })(target);
  return out;
}

function main(argv) {
  const args = argv.slice(2);
  const o = { format: 'stylish', failOn: null, output: null, target: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-f' || a === '--format') o.format = args[++i];
    else if (a === '--fail-on') o.failOn = args[++i];
    else if (a === '-o' || a === '--output') o.output = args[++i];
    else if (a === '-h' || a === '--help') {
      console.log('gas-slasher <file.sol|dir> [-f stylish|json|sarif|md] [--fail-on low|medium|high] [-o file]');
      return 0;
    } else o.target = a;
  }
  if (!o.target) {
    console.error('Укажите .sol файл или папку. --help — справка.');
    return 1;
  }
  let files;
  try {
    files = collectSol(o.target);
  } catch (e) {
    console.error('Путь не найден: ' + o.target);
    return 1;
  }
  if (!files.length) {
    console.error('.sol файлы не найдены: ' + o.target);
    return 1;
  }

  const reports = files.map((f) =>
    analyzeSource(fs.readFileSync(f, 'utf8'), path.relative(process.cwd(), f).split(path.sep).join('/')),
  );
  const reporter = reporters[o.format === 'md' ? 'markdown' : o.format] || reporters.stylish;
  const out = reporter(reports);
  if (o.output) {
    fs.writeFileSync(o.output, out, 'utf8');
    console.log('Отчёт сохранён: ' + o.output);
  } else {
    try {
      process.stdout.write(out + '\n');
    } catch (e) {
      console.log(out);
    }
  }

  if (o.failOn) {
    const order = { low: 1, medium: 2, high: 3 };
    const max = Math.max(0, ...reports.flatMap((r) => r.findings).map((f) => order[f.severity] || 0));
    if (max >= (order[o.failOn] || 99)) return 2;
  }
  return 0;
}

process.exit(main(process.argv));
