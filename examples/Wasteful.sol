// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Wasteful — a deliberately gas-inefficient contract for the demo.
/// @notice Run `node src/cli.js examples -f stylish` to see Gas-Slasher light it up.
contract Wasteful {
    // constant-immutable: literal-initialized, never changes.
    uint256 public maxItems = 256;

    // immutable-candidate: assigned only in the constructor.
    address public admin;

    // bool-storage: frequently toggled boolean in storage.
    bool public paused;

    // default-value-init (state): redundant `= 0`.
    uint256 public counter = 0;

    // public-constant-array: auto-getter on a constant string bloats deploy.
    string public constant LABEL = "wasteful-token";

    // indexed-events: no indexed params → expensive off-chain filtering.
    event Deposit(address account, uint256 amount, bool credited);

    constructor() {
        admin = msg.sender;
    }

    function setPaused(bool value) external {
        // revert-string-vs-error: bare revert with a string.
        if (msg.sender != admin) {
            revert("only admin");
        }
        paused = value;
    }

    // calldata-params: `memory` reference param on an external function.
    function sumAll(uint256[] memory items) external view returns (uint256 total) {
        // default-value-init: `i = 0` is redundant.
        // cache-array-length: `.length` read every iteration.
        // increment-prefix-unchecked + unchecked-loop-math: `i++` without unchecked.
        for (uint256 i = 0; i < items.length; i++) {
            // uint-gt-zero: `> 0` instead of `!= 0`.
            if (items[i] > 0) {
                // storage-in-loop: reads `maxItems` (state) every iteration.
                if (total < maxItems) {
                    total += items[i];
                }
            }
        }

        // custom-errors + long-require-string: string reason longer than 32 bytes.
        require(total > 0, "the computed total must be strictly greater than zero to proceed");
        return total;
    }

    function bump(uint256 x) external pure returns (uint256) {
        // postfix-vs-prefix: standalone `x++` could be `++x`.
        x++;
        return x;
    }
}
