# Security Policy

## Supported Versions

solidity-gas-slasher is in active development. Security fixes are applied to the
latest released version on the `main` branch.

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it **privately** — do not
open a public issue.

- Email **duminandrew@gmail.com** with a clear description and reproduction steps.
- Alternatively, use GitHub's [private security advisories](https://github.com/DuminAndrew/solidity-gas-slasher/security/advisories/new).

Please include:

- The affected component (e.g. parser, a specific rule, a reporter, the CLI).
- Steps to reproduce or a proof-of-concept contract.
- The potential impact as you see it.

You can expect an initial acknowledgement within **5 business days**. Once a fix
is available, a coordinated disclosure timeline will be agreed upon.

## Scope and design notes

solidity-gas-slasher performs **local, static** analysis of Solidity source. It
parses contracts into an AST and applies gas-optimization rules. It never
deploys, executes, or sends contracts anywhere, and it makes no network calls.

Be mindful that scan inputs (`.sol` files) may be untrusted. The tool only reads
and parses them as text; it does not compile or run the analyzed code. Findings
are **advisory** — always review and test optimizations against your own gas
benchmarks before applying them to production contracts.
