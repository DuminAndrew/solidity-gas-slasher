# Solidity Gas-Slasher ⛽🔪

> Static analyzer for **Solidity** that finds **gas inefficiencies** and suggests concrete refactors — AST-based (no `solc` compilation needed), runs as a CLI, outputs **SARIF / JSON / Markdown** for CI.

![status](https://img.shields.io/badge/status-MVP-orange) ![node](https://img.shields.io/badge/node-18%2B-339933) ![license](https://img.shields.io/badge/license-MIT-green) ![parser](https://img.shields.io/badge/parser-%40solidity--parser-purple) ![output](https://img.shields.io/badge/output-SARIF%20%7C%20JSON%20%7C%20MD-lightgrey)

## ✨ Features
- ⚡ Detects common **gas anti-patterns** with savings hints (see table).
- 🌳 Parses Solidity via `@solidity-parser/parser` (ANTLR, tolerant) — **no solc, no node_modules of your contract** required.
- 🚦 **CI-friendly**: SARIF for GitHub code scanning, `--fail-on` for gating.
- 🧩 Modular ESLint-style rules — easy to extend; core reusable by a future VS Code extension / LSP.

## 🔍 Rules (MVP)
| Rule | Severity | Saving (≈) |
|---|---|---|
| `cache-array-length` — cache `.length` outside loops | medium | 3–100 gas/iter |
| `increment-prefix-unchecked` — `++i` + `unchecked` in loops | low | ~35–45 gas/iter |
| `custom-errors` — replace string `require` with custom errors | medium | deploy + runtime |
| `calldata-params` — `calldata` over `memory` for external params | medium | avoids copy |
| `uint-gt-zero` — `!= 0` instead of `> 0` for uint | low | ~3 gas |
| `constant-immutable` — literal state vars → `constant`/`immutable` | low | SLOAD → ~0 |

## 🚀 Install & use
```bash
git clone https://github.com/DuminAndrew/solidity-gas-slasher
cd solidity-gas-slasher
npm install
npx gas-slasher contracts/            # scan a folder (stylish output)
npx gas-slasher MyToken.sol -f md -o report.md
npx gas-slasher . -f sarif -o gas.sarif --fail-on medium   # CI gate
npm test
```

## 🏗️ Architecture
```
src/
  rules.js       # gas rules (AST visitors)
  analyzer.js    # parse (@solidity-parser) + run rules → findings
  reporters.js   # stylish / json / sarif / markdown
  cli.js         # argument parsing, file discovery, exit codes
test/            # sample.sol + assertions
```
Roadmap: TypeScript rewrite + **VS Code extension** (inline diagnostics + quick-fixes), optional deep mode via `solc` AST (storage packing, true immutability), autofix engine, more rules.

## ⚖️ Attribution
Rule **ideas** are inspired by Slither (Trail of Bits) and solhint catalogs. **No Slither code is used** (Slither is AGPL-3.0); only public optimization concepts. This tool ships under MIT.

## 💚 Support / Crypto donations
Replace placeholders with your **real verified addresses + QR images** before publishing.

| Coin | Network | Address (placeholder) |
|---|---|---|
| BTC | Bitcoin | `bc1qXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |
| ETH | Ethereum / EVM | `0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |
| USDT | TRON (TRC20) | `TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |

### 🔐 Donation safety
Verify the address only on the official release page; match the network (TRC20 ≠ ERC20); donations are voluntary (no SLA, not investment); maintainers never DM for donations.

## 📄 License
MIT © DuminAndrew
