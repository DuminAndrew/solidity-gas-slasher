// Каталог газ-правил. Каждое правило: visit(ast, parser, add) → пушит находки.
// Источник идей (НЕ кода): Slither/solhint каталоги. Эвристики на чистом AST.

function ruleCacheArrayLength(ast, parser, add) {
  parser.visit(ast, {
    ForStatement(node) {
      const cond = node.conditionExpression;
      if (!cond) return;
      let hit = false;
      parser.visit(cond, { MemberAccess(m) { if (m.memberName === 'length') hit = true; } });
      if (hit) add({
        ruleId: 'cache-array-length', title: 'Кэшируйте .length вне цикла', severity: 'medium',
        gasHint: '~3–100 газа/итерация (повторный SLOAD/length)', node,
        suggestion: 'Сохраните длину в локальную переменную до цикла: `uint len = arr.length; for (...; i < len; ...)`.'
      });
    }
  });
}

function ruleIncrementInLoop(ast, parser, add) {
  parser.visit(ast, {
    ForStatement(node) {
      const upd = node.loopExpression;
      const u = upd && upd.expression ? upd.expression : upd;
      if (u && u.type === 'UnaryOperation' && u.operator === '++' && !u.isPrefix) {
        add({
          ruleId: 'increment-prefix-unchecked', title: 'Используйте ++i и unchecked в циклах', severity: 'low',
          gasHint: '~5 газа (++i) + ~30–40 газа (unchecked) на итерацию', node: u,
          suggestion: 'Замените `i++` на `++i`; если переполнение невозможно — оберните: `unchecked { ++i; }`.'
        });
      }
    }
  });
}

function ruleCustomErrors(ast, parser, add) {
  parser.visit(ast, {
    FunctionCall(node) {
      const e = node.expression;
      if (e && e.type === 'Identifier' && e.name === 'require' && Array.isArray(node.arguments) && node.arguments.length >= 2) {
        const msg = node.arguments[1];
        if (msg && msg.type === 'StringLiteral') add({
          ruleId: 'custom-errors', title: 'Замените строковый require на custom error', severity: 'medium',
          gasHint: 'экономит хранение строки (деплой) + дешевле revert (рантайм)', node,
          suggestion: 'Объявите `error MyError();` и используйте `if (!cond) revert MyError();` вместо `require(cond, "...")`.'
        });
      }
    }
  });
}

function ruleCalldataParams(ast, parser, add) {
  parser.visit(ast, {
    FunctionDefinition(node) {
      const vis = node.visibility;
      if (vis !== 'external' && vis !== 'public') return;
      for (const p of (node.parameters || [])) {
        const t = p.typeName;
        const isRef = t && (t.type === 'ArrayTypeName' || (t.type === 'ElementaryTypeName' && /^(string|bytes)$/.test(t.name || '')));
        if (p.storageLocation === 'memory' && isRef) add({
          ruleId: 'calldata-params', title: 'calldata вместо memory для external-параметров', severity: 'medium',
          gasHint: 'избегает копирования calldata→memory', node: p,
          suggestion: `Параметр \`${p.name || '?'}\`: замените \`memory\` на \`calldata\` (если он не модифицируется внутри функции).`
        });
      }
    }
  });
}

function ruleUintGtZero(ast, parser, add) {
  parser.visit(ast, {
    BinaryOperation(node) {
      if (node.operator === '>' && node.right && node.right.type === 'NumberLiteral' && node.right.number === '0') {
        add({
          ruleId: 'uint-gt-zero', title: 'Для uint используйте != 0 вместо > 0', severity: 'low',
          gasHint: '~3 газа', node,
          suggestion: 'Если значение беззнаковое (uint), замените `x > 0` на `x != 0`.'
        });
      }
    }
  });
}

function ruleConstImmutable(ast, parser, add) {
  parser.visit(ast, {
    StateVariableDeclaration(node) {
      for (const v of (node.variables || [])) {
        const isConst = v.isDeclaredConst || v.isImmutable;
        const init = v.expression;
        if (init && !isConst && ['NumberLiteral', 'StringLiteral', 'BooleanLiteral', 'HexLiteral'].includes(init.type)) {
          add({
            ruleId: 'constant-immutable', title: 'Кандидат на constant/immutable', severity: 'low',
            gasHint: 'constant/immutable: чтение ~0 газа vs SLOAD (2100/100)', node: v,
            suggestion: `Переменная \`${v.name}\` с литеральным значением: если она не меняется — пометьте \`constant\` (или \`immutable\`, если задаётся в конструкторе).`
          });
        }
      }
    }
  });
}

module.exports = [
  ruleCacheArrayLength,
  ruleIncrementInLoop,
  ruleCustomErrors,
  ruleCalldataParams,
  ruleUintGtZero,
  ruleConstImmutable,
];
