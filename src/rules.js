// Каталог газ-правил. Каждое правило: visit(ast, parser, add) → пушит находки.
// Источник идей (НЕ кода): Slither/solhint каталоги. Эвристики на чистом AST.
//
// Как добавить правило:
//   1. Напишите функцию `ruleXxx(ast, parser, add)`, которая обходит AST через
//      `parser.visit(...)` и для каждой находки вызывает `add({ ruleId, title,
//      severity, gasHint, node, suggestion, confidence? })`.
//   2. Добавьте функцию в массив `module.exports` ниже.
//   3. Добавьте .sol-сэмпл и тест в test/ (см. CONTRIBUTING.md).
//
// Поля находки:
//   ruleId      — стабильный идентификатор (kebab-case), попадает в SARIF/JSON.
//   severity    — 'high' | 'medium' | 'low'.
//   gasHint     — короткая ≈оценка экономии газа.
//   node        — AST-узел (для координат строка/колонка).
//   suggestion  — конкретная рекомендация по рефакторингу.
//   confidence  — (опц.) 'heuristic' для эвристик с возможными ложными срабатываниями.

// --- утилиты ---------------------------------------------------------------

// Грубая оценка длины строкового литерала в байтах (UTF-8).
function byteLength(str) {
  return Buffer.byteLength(String(str == null ? '' : str), 'utf8');
}

// Множество имён, в которые присваивается внутри блока (через = или ++/--/op=).
function collectAssignedNames(node, parser) {
  const names = new Set();
  if (!node) return names;
  parser.visit(node, {
    BinaryOperation(b) {
      if (/^(=|\+=|-=|\*=|\/=|%=|\|=|&=|\^=|<<=|>>=)$/.test(b.operator)) {
        let t = b.left;
        // a = ..., a.b = ..., a[i] = ...  → корневой идентификатор
        while (t && (t.type === 'MemberAccess' || t.type === 'IndexAccess')) {
          t = t.expression || t.base;
        }
        if (t && t.type === 'Identifier') names.add(t.name);
      }
    },
    UnaryOperation(u) {
      if (
        (u.operator === '++' || u.operator === '--' || u.operator === 'delete') &&
        u.subExpression &&
        u.subExpression.type === 'Identifier'
      ) {
        names.add(u.subExpression.name);
      }
    },
  });
  return names;
}

// --- существующие правила --------------------------------------------------

function ruleCacheArrayLength(ast, parser, add) {
  parser.visit(ast, {
    ForStatement(node) {
      const cond = node.conditionExpression;
      if (!cond) return;
      let hit = false;
      parser.visit(cond, {
        MemberAccess(m) {
          if (m.memberName === 'length') hit = true;
        },
      });
      if (hit)
        add({
          ruleId: 'cache-array-length',
          title: 'Кэшируйте .length вне цикла',
          severity: 'medium',
          gasHint: '~3–100 газа/итерация (повторный SLOAD/length)',
          node,
          suggestion:
            'Сохраните длину в локальную переменную до цикла: `uint len = arr.length; for (...; i < len; ...)`.',
        });
    },
  });
}

function ruleIncrementInLoop(ast, parser, add) {
  parser.visit(ast, {
    ForStatement(node) {
      const upd = node.loopExpression;
      const u = upd && upd.expression ? upd.expression : upd;
      if (u && u.type === 'UnaryOperation' && u.operator === '++' && !u.isPrefix) {
        add({
          ruleId: 'increment-prefix-unchecked',
          title: 'Используйте ++i и unchecked в циклах',
          severity: 'low',
          gasHint: '~5 газа (++i) + ~30–40 газа (unchecked) на итерацию',
          node: u,
          suggestion: 'Замените `i++` на `++i`; если переполнение невозможно — оберните: `unchecked { ++i; }`.',
        });
      }
    },
  });
}

function ruleCustomErrors(ast, parser, add) {
  parser.visit(ast, {
    FunctionCall(node) {
      const e = node.expression;
      if (
        e &&
        e.type === 'Identifier' &&
        e.name === 'require' &&
        Array.isArray(node.arguments) &&
        node.arguments.length >= 2
      ) {
        const msg = node.arguments[1];
        if (msg && msg.type === 'StringLiteral')
          add({
            ruleId: 'custom-errors',
            title: 'Замените строковый require на custom error',
            severity: 'medium',
            gasHint: 'экономит хранение строки (деплой) + дешевле revert (рантайм)',
            node,
            suggestion:
              'Объявите `error MyError();` и используйте `if (!cond) revert MyError();` вместо `require(cond, "...")`.',
          });
      }
    },
  });
}

function ruleCalldataParams(ast, parser, add) {
  parser.visit(ast, {
    FunctionDefinition(node) {
      const vis = node.visibility;
      if (vis !== 'external' && vis !== 'public') return;
      for (const p of node.parameters || []) {
        const t = p.typeName;
        const isRef =
          t &&
          (t.type === 'ArrayTypeName' || (t.type === 'ElementaryTypeName' && /^(string|bytes)$/.test(t.name || '')));
        if (p.storageLocation === 'memory' && isRef)
          add({
            ruleId: 'calldata-params',
            title: 'calldata вместо memory для external-параметров',
            severity: 'medium',
            gasHint: 'избегает копирования calldata→memory',
            node: p,
            suggestion: `Параметр \`${p.name || '?'}\`: замените \`memory\` на \`calldata\` (если он не модифицируется внутри функции).`,
          });
      }
    },
  });
}

function ruleUintGtZero(ast, parser, add) {
  parser.visit(ast, {
    BinaryOperation(node) {
      if (node.operator === '>' && node.right && node.right.type === 'NumberLiteral' && node.right.number === '0') {
        add({
          ruleId: 'uint-gt-zero',
          title: 'Для uint используйте != 0 вместо > 0',
          severity: 'low',
          gasHint: '~3 газа',
          node,
          suggestion: 'Если значение беззнаковое (uint), замените `x > 0` на `x != 0`.',
        });
      }
    },
  });
}

function ruleConstImmutable(ast, parser, add) {
  parser.visit(ast, {
    StateVariableDeclaration(node) {
      for (const v of node.variables || []) {
        const isConst = v.isDeclaredConst || v.isImmutable;
        const init = v.expression;
        if (
          init &&
          !isConst &&
          ['NumberLiteral', 'StringLiteral', 'BooleanLiteral', 'HexLiteral'].includes(init.type)
        ) {
          add({
            ruleId: 'constant-immutable',
            title: 'Кандидат на constant/immutable',
            severity: 'low',
            gasHint: 'constant/immutable: чтение ~0 газа vs SLOAD (2100/100)',
            node: v,
            suggestion: `Переменная \`${v.name}\` с литеральным значением: если она не меняется — пометьте \`constant\` (или \`immutable\`, если задаётся в конструкторе).`,
          });
        }
      }
    },
  });
}

// --- новые правила ---------------------------------------------------------

// unchecked-loop-math: инкремент/декремент счётчика (++i/i--) в обновлении или теле
// for-цикла, не обёрнутый в unchecked. Канонический safe-кейс: счётчик не переполняется.
// Аккумуляторы (+=) НЕ трогаем — там переполнение реально и unchecked небезопасен.
function ruleUncheckedLoopMath(ast, parser, add) {
  // true, если узел (или один из его прямых потомков) — UncheckedStatement.
  const isUncheckedWrapped = (stmt) => {
    if (!stmt) return false;
    if (stmt.type === 'UncheckedStatement') return true;
    if (stmt.type === 'Block' && Array.isArray(stmt.statements)) {
      return stmt.statements.some((s) => s && s.type === 'UncheckedStatement');
    }
    return false;
  };

  parser.visit(ast, {
    ForStatement(node) {
      // 1. Обновление вида i++/++i вне unchecked — основной кейс.
      const upd = node.loopExpression;
      const u = upd && upd.expression ? upd.expression : upd;
      const updIsIncDec = u && u.type === 'UnaryOperation' && (u.operator === '++' || u.operator === '--');

      // 2. ++/-- инкременты внутри тела, но НЕ в блоке unchecked.
      let bodyIncOutsideUnchecked = false;
      const body = node.body;
      if (body && !isUncheckedWrapped(body)) {
        (function walk(n) {
          if (!n || typeof n !== 'object') return;
          if (n.type === 'UncheckedStatement') return; // не заходим внутрь unchecked
          if (n.type === 'UnaryOperation' && (n.operator === '++' || n.operator === '--')) {
            bodyIncOutsideUnchecked = true;
          }
          for (const k of Object.keys(n)) {
            if (k === 'loc' || k === 'range' || k === 'parent') continue;
            const v = n[k];
            if (Array.isArray(v)) v.forEach(walk);
            else if (v && typeof v === 'object' && typeof v.type === 'string') walk(v);
          }
        })(body);
      }

      if (updIsIncDec || bodyIncOutsideUnchecked)
        add({
          ruleId: 'unchecked-loop-math',
          title: 'Оберните инкремент счётчика в unchecked',
          severity: 'low',
          gasHint: '~30–40 газа/итерация (пропуск overflow-проверок 0.8.x)',
          node: updIsIncDec ? u : node,
          confidence: 'heuristic',
          suggestion:
            'Счётчик цикла не переполняется на практике — оберните его инкремент: `unchecked { ++i; }` (аккумуляторы не трогайте без анализа границ).',
        });
    },
  });
}

// storage-in-loop: чтение state-переменной (по имени) внутри тела цикла → кэшировать.
function ruleStorageInLoop(ast, parser, add) {
  // Сначала собираем имена state-переменных по контракту.
  parser.visit(ast, {
    ContractDefinition(contract) {
      const stateNames = new Set();
      for (const sub of contract.subNodes || []) {
        if (sub.type === 'StateVariableDeclaration') {
          for (const v of sub.variables || []) {
            if (v.name && !v.isDeclaredConst && !v.isImmutable) stateNames.add(v.name);
          }
        }
      }
      if (!stateNames.size) return;

      const visitLoop = (loop) => {
        const body = loop.body;
        if (!body) return;
        const reported = new Set();
        parser.visit(body, {
          Identifier(id) {
            if (stateNames.has(id.name) && !reported.has(id.name)) {
              reported.add(id.name);
              add({
                ruleId: 'storage-in-loop',
                title: 'Кэшируйте storage-переменную вне цикла',
                severity: 'medium',
                gasHint: '~100 газа/итерация (повторный «тёплый» SLOAD)',
                node: id,
                confidence: 'heuristic',
                suggestion: `Переменная состояния \`${id.name}\` читается в цикле: загрузите её в локальную (\`stack/memory\`) до цикла, если она не меняется внутри.`,
              });
            }
          },
        });
      };

      parser.visit(contract, {
        ForStatement: visitLoop,
        WhileStatement: visitLoop,
        DoWhileStatement: visitLoop,
      });
    },
  });
}

// default-value-init: явная инициализация дефолтным значением (uint x = 0; bool b = false).
function ruleDefaultValueInit(ast, parser, add) {
  const isDefaultLiteral = (typeName, init) => {
    if (!init) return false;
    const tn = typeName && typeName.type === 'ElementaryTypeName' ? typeName.name : null;
    if (init.type === 'NumberLiteral' && init.number === '0' && !init.subdenomination) {
      // uint/int/bytesN/address(0 не литерал) — числовой 0
      if (!tn || /^(u?int\d*|byte|bytes\d*)$/.test(tn)) return '0';
    }
    if (init.type === 'BooleanLiteral' && init.value === false) {
      if (!tn || tn === 'bool') return 'false';
    }
    return false;
  };

  parser.visit(ast, {
    VariableDeclarationStatement(node) {
      const vars = node.variables || [];
      if (vars.length !== 1) return; // не трогаем деструктуризацию кортежей
      const v = vars[0];
      const def = v && isDefaultLiteral(v.typeName, node.initialValue);
      if (def)
        add({
          ruleId: 'default-value-init',
          title: 'Лишняя инициализация дефолтным значением',
          severity: 'low',
          gasHint: '~3–8 газа (лишний MSTORE/присваивание)',
          node: v,
          suggestion: `Переменные инициализируются нулём/false по умолчанию: уберите \`= ${def}\` (\`${v.name || '?'}\`).`,
        });
    },
    StateVariableDeclaration(node) {
      for (const v of node.variables || []) {
        if (v.isDeclaredConst || v.isImmutable) continue;
        const def = isDefaultLiteral(v.typeName, v.expression);
        if (def)
          add({
            ruleId: 'default-value-init',
            title: 'Лишняя инициализация дефолтным значением',
            severity: 'low',
            gasHint: 'лишний код инициализации при деплое',
            node: v,
            suggestion: `Состояние \`${v.name}\` уже нулевое по умолчанию: уберите \`= ${def}\`.`,
          });
      }
    },
  });
}

// long-require-string: строка-причина в require/revert длиннее 32 байт.
function ruleLongRequireString(ast, parser, add) {
  parser.visit(ast, {
    FunctionCall(node) {
      const e = node.expression;
      const name = e && e.type === 'Identifier' ? e.name : null;
      if (name !== 'require' && name !== 'revert') return;
      for (const arg of node.arguments || []) {
        if (arg && arg.type === 'StringLiteral' && byteLength(arg.value) > 32) {
          add({
            ruleId: 'long-require-string',
            title: 'Слишком длинная строка ошибки (>32 байт)',
            severity: 'low',
            gasHint: 'каждые 32 байта строки — лишний кодовый слот при деплое',
            node: arg,
            suggestion: `Строка причины длиннее 32 байт (${byteLength(arg.value)} б): сократите до ≤32 байт или используйте custom error.`,
          });
        }
      }
    },
  });
}

// public-constant-array: public constant/immutable массив или строка — генерирует геттер.
function rulePublicConstantArray(ast, parser, add) {
  parser.visit(ast, {
    StateVariableDeclaration(node) {
      for (const v of node.variables || []) {
        const t = v.typeName;
        const isArrayLike =
          t &&
          (t.type === 'ArrayTypeName' || (t.type === 'ElementaryTypeName' && /^(string|bytes)$/.test(t.name || '')));
        if (isArrayLike && v.visibility === 'public' && (v.isDeclaredConst || v.isImmutable)) {
          add({
            ruleId: 'public-constant-array',
            title: 'public constant массив/строка → private + геттер',
            severity: 'low',
            gasHint: 'авто-геттер на массив раздувает байткод деплоя',
            node: v,
            confidence: 'heuristic',
            suggestion: `\`${v.name}\`: сделайте \`private\`/\`internal\` и при необходимости напишите узкий геттер — авто-геттер public-массива дорог в деплое.`,
          });
        }
      }
    },
  });
}

// bool-storage: bool как state-переменная (подсказка: uint256 1/2 дешевле в части паттернов).
function ruleBoolStorage(ast, parser, add) {
  parser.visit(ast, {
    StateVariableDeclaration(node) {
      for (const v of node.variables || []) {
        const t = v.typeName;
        if (t && t.type === 'ElementaryTypeName' && t.name === 'bool' && !v.isDeclaredConst && !v.isImmutable) {
          add({
            ruleId: 'bool-storage',
            title: 'bool в storage: рассмотрите uint256(1/2)',
            severity: 'low',
            gasHint: 'избегает Gwarmaccess/перезаписи слота для bool в части паттернов',
            node: v,
            confidence: 'heuristic',
            suggestion: `\`${v.name}\`: частые переключения bool в storage иногда дешевле как \`uint256\` (1/2) — паттерн ReentrancyGuard. Проверьте профайлером.`,
          });
        }
      }
    },
  });
}

// postfix-vs-prefix: i++/i-- как самостоятельный ExpressionStatement вне циклов → ++i дешевле.
function rulePostfixVsPrefix(ast, parser, add) {
  // Собираем узлы loopExpression всех for, чтобы их исключить (их ловит increment-prefix-unchecked).
  const loopUpdates = new Set();
  parser.visit(ast, {
    ForStatement(node) {
      const upd = node.loopExpression;
      const u = upd && upd.expression ? upd.expression : upd;
      if (u) loopUpdates.add(u);
    },
  });

  parser.visit(ast, {
    ExpressionStatement(node) {
      const u = node.expression;
      if (
        u &&
        u.type === 'UnaryOperation' &&
        (u.operator === '++' || u.operator === '--') &&
        !u.isPrefix &&
        !loopUpdates.has(u)
      ) {
        add({
          ruleId: 'postfix-vs-prefix',
          title: 'Используйте ++i/--i вместо i++/i-- (statement)',
          severity: 'low',
          gasHint: '~5 газа (нет лишней копии старого значения)',
          node: u,
          suggestion: 'Если результат выражения не используется, замените `x++`/`x--` на префиксную форму `++x`/`--x`.',
        });
      }
    },
  });
}

// immutable-candidate: state-переменная (не const/immutable) присваивается ТОЛЬКО в конструкторе.
function ruleImmutableCandidate(ast, parser, add) {
  parser.visit(ast, {
    ContractDefinition(contract) {
      const decls = new Map(); // name → variable node
      for (const sub of contract.subNodes || []) {
        if (sub.type === 'StateVariableDeclaration') {
          for (const v of sub.variables || []) {
            const t = v.typeName;
            const valueType =
              t && t.type === 'ElementaryTypeName' && /^(u?int\d*|address|bool|bytes\d+)$/.test(t.name || '');
            if (v.name && valueType && !v.isDeclaredConst && !v.isImmutable) decls.set(v.name, v);
          }
        }
      }
      if (!decls.size) return;

      const ctorAssigned = new Set();
      const otherAssigned = new Set();
      for (const sub of contract.subNodes || []) {
        if (sub.type !== 'FunctionDefinition' || !sub.body) continue;
        const assigned = collectAssignedNames(sub.body, parser);
        const target = sub.isConstructor ? ctorAssigned : otherAssigned;
        for (const n of assigned) target.add(n);
      }

      for (const [name, v] of decls) {
        if (ctorAssigned.has(name) && !otherAssigned.has(name)) {
          add({
            ruleId: 'immutable-candidate',
            title: 'Кандидат на immutable (пишется только в конструкторе)',
            severity: 'medium',
            gasHint: 'immutable: чтение из кода (~3 газа) vs SLOAD (2100/100)',
            node: v,
            confidence: 'heuristic',
            suggestion: `\`${name}\` присваивается только в конструкторе — пометьте \`immutable\`, чтобы убрать SLOAD при чтении.`,
          });
        }
      }
    },
  });
}

// indexed-events: событие с ≤3 параметрами без единого indexed → подсказка по индексации.
function ruleIndexedEvents(ast, parser, add) {
  parser.visit(ast, {
    EventDefinition(node) {
      const params = node.parameters || [];
      if (!params.length) return;
      const indexed = params.filter((p) => p.isIndexed).length;
      const indexable = params.filter((p) => {
        const t = p.typeName;
        // value-типы и address хорошо индексируются; string/bytes/array индексировать обычно не стоит
        return t && t.type === 'ElementaryTypeName' && /^(u?int\d*|address|bool|bytes\d+)$/.test(t.name || '');
      }).length;
      if (indexed === 0 && indexable > 0) {
        add({
          ruleId: 'indexed-events',
          title: 'Добавьте indexed к параметрам события',
          severity: 'low',
          gasHint: 'indexed-топики дешевле для фильтрации логов off-chain',
          node,
          confidence: 'heuristic',
          suggestion: `Событие \`${node.name}\` не имеет indexed-параметров: пометьте ключевые value-поля (адреса/id) как \`indexed\` (до 3).`,
        });
      }
    },
  });
}

// revert-string-vs-error: голый revert("строка") без аргумента-условия → custom error.
function ruleRevertStringVsError(ast, parser, add) {
  parser.visit(ast, {
    FunctionCall(node) {
      const e = node.expression;
      if (
        e &&
        e.type === 'Identifier' &&
        e.name === 'revert' &&
        Array.isArray(node.arguments) &&
        node.arguments.length === 1 &&
        node.arguments[0] &&
        node.arguments[0].type === 'StringLiteral'
      ) {
        add({
          ruleId: 'revert-string-vs-error',
          title: 'revert("строка") → custom error',
          severity: 'medium',
          gasHint: 'экономит хранение строки (деплой) + дешевле revert (рантайм)',
          node,
          suggestion: 'Объявите `error MyError();` и используйте `revert MyError();` вместо `revert("...")`.',
        });
      }
    },
  });
}

module.exports = [
  ruleCacheArrayLength,
  ruleIncrementInLoop,
  ruleCustomErrors,
  ruleCalldataParams,
  ruleUintGtZero,
  ruleConstImmutable,
  ruleUncheckedLoopMath,
  ruleStorageInLoop,
  ruleDefaultValueInit,
  ruleLongRequireString,
  rulePublicConstantArray,
  ruleBoolStorage,
  rulePostfixVsPrefix,
  ruleImmutableCandidate,
  ruleIndexedEvents,
  ruleRevertStringVsError,
];
