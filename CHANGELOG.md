# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-06-02

### Added

- Initial release of **solidity-gas-slasher** — a local, static analyzer that
  finds gas-optimization opportunities in Solidity source via AST inspection
  (`@solidity-parser/parser`).
- **16 gas rules**, including: `cache-array-length`, `storage-in-loop`,
  `unchecked-loop-math`, `increment-prefix-unchecked`, `postfix-vs-prefix`,
  `constant-immutable`, `immutable-candidate`, `custom-errors`,
  `revert-string-vs-error`, `long-require-string`, `calldata-params`,
  `uint-gt-zero`, `default-value-init`, `public-constant-array`, `bool-storage`,
  and `indexed-events`.
- Four **reporters**: `stylish` (human-readable), `json` (automation),
  `sarif` (GitHub code scanning), and `markdown` (PR-friendly summaries).
- **CLI** with format selection and a CI-friendly non-zero exit when findings
  are present, so the tool can gate pull requests.
- Test suite (`node --test`) covering every rule against dirty/clean fixtures,
  the analyzer, the reporters, and a guarantee that every exported rule is
  tested.
- **ESLint** configuration and a CI workflow with a Node 18/20/22 matrix.
- `examples/` with `Wasteful.sol` (triggers findings) and `Optimized.sol`
  (clean) for demos and documentation.

[Unreleased]: https://github.com/DuminAndrew/solidity-gas-slasher/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/DuminAndrew/solidity-gas-slasher/releases/tag/v0.1.0
