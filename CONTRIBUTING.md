# Contributing to Solidity Gas-Slasher

Thanks for your interest in improving Gas-Slasher! This project thrives on new gas rules, so the
guide below focuses on **adding a rule** — but bug fixes, docs, and reporter improvements are just as
welcome.

## Ground rules

- **Be kind.** See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
- **Keep it dependency-light.** The only runtime dependency is
  [`@solidity-parser/parser`](https://github.com/solidity-parser/parser). Don't add others without a
  strong reason.
- **No `solc`.** Rules run on the plain AST, in tolerant mode. If a check genuinely needs type
  resolution, mark it `confidence: 'heuristic'` and document the limitation.
- **Green before you push.** `npm run lint`, `npm run format:check`, and `npm test` must all pass.

## Dev setup

```bash
git clone https://github.com/DuminAndrew/solidity-gas-slasher
cd solidity-gas-slasher
npm install

npm run lint          # ESLint (flat config)
npm run format        # Prettier --write
npm test              # node --test (unit + CLI tests)
node src/cli.js examples -f stylish   # see it run
```

## Adding a new rule (step by step)

Every rule is a single function in [`src/rules.js`](src/rules.js) that walks the AST and pushes
findings. There is no plugin loader to learn — just a function and an array entry.

### 1. Write the rule function

```js
// myRuleName: one-line description of the gas anti-pattern.
function ruleMyRuleName(ast, parser, add) {
  parser.visit(ast, {
    // Visit the node type you care about (see the AST node list below).
    ForStatement(node) {
      if (/* your detection condition */ false) return;
      add({
        ruleId: 'my-rule-name', // stable kebab-case id; shows up in SARIF/JSON
        title: 'Short human title',
        severity: 'low', // 'high' | 'medium' | 'low' → drives SARIF level & --fail-on
        gasHint: '~N gas / iteration', // rough savings estimate
        node, // AST node used for line/column
        suggestion: 'Concrete refactor the developer should apply.',
        confidence: 'heuristic', // OPTIONAL: include only when false positives are possible
      });
    },
  });
}
```

Finding fields:

| Field | Required | Purpose |
|-------|:--------:|---------|
| `ruleId` | ✅ | Stable identifier (kebab-case). Never rename — it's part of the public output. |
| `title` | ✅ | Short, human-readable summary. |
| `severity` | ✅ | `high` / `medium` / `low`. |
| `gasHint` | ✅ | Approximate saving (per-iteration / deploy-time / runtime). |
| `node` | ✅ | AST node — supplies the line/column in the report. |
| `suggestion` | ✅ | The exact refactor to apply. |
| `confidence` | ⬜ | Set to `'heuristic'` when the rule can produce false positives. |

### 2. Register it

Add the function to the exported array at the bottom of `src/rules.js`:

```js
module.exports = [
  // ...existing rules...
  ruleMyRuleName,
];
```

Rules are isolated: if one throws, the analyzer swallows the error so the rest still run. Still, write
defensively (guard against missing/`null` properties).

### 3. Add fixtures + a test

1. Create a **dirty** fixture that triggers your rule:
   `test/fixtures/my-rule-name.dirty.sol`.
2. Add your `ruleId` to the `RULE_IDS` array in [`test/rules.test.js`](test/rules.test.js). The
   data-driven test then asserts your rule fires on its dirty fixture.
3. Make sure your pattern is **absent** from `test/fixtures/clean.sol` (or add the optimized form
   there) so the "clean contract → zero findings" test keeps passing.

```bash
npm test   # your rule should show up under "каждое правило срабатывает на своём dirty-сэмпле"
```

### 4. Update the docs

Add a row to the **Rules** table in [`README.md`](README.md) and an entry in
[`CHANGELOG.md`](CHANGELOG.md) under *Unreleased*.

## Useful AST node types

Visited via `parser.visit(ast, { NodeType(node) { ... } })`:

`ForStatement`, `WhileStatement`, `DoWhileStatement`, `FunctionDefinition`, `FunctionCall`,
`BinaryOperation`, `UnaryOperation`, `StateVariableDeclaration`, `VariableDeclarationStatement`,
`EventDefinition`, `MemberAccess`, `IndexAccess`, `Identifier`, `ContractDefinition`,
`UncheckedStatement`, `RevertStatement`.

Full type definitions live in
`node_modules/@solidity-parser/parser/dist/src/ast-types.d.ts`.

## Commit & PR

- Keep commits focused; reference an issue when there is one.
- Fill in the pull-request template.
- CI (Node 18/20/22 · lint · format · test) must be green.

Happy slashing! ⛽🔪
