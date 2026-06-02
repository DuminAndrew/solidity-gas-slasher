// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Optimized — the gas-tuned counterpart of Wasteful.sol.
/// @notice Compare with Wasteful.sol: 20 findings there collapse to a single
///         heuristic `bool-storage` hint here (a deliberate, legitimate flag).
contract Optimized {
    error NotAdmin();
    error EmptyTotal();

    event Deposit(address indexed account, uint256 amount, bool credited);

    uint256 public constant MAX_ITEMS = 256; // constant, no SLOAD
    address public immutable admin; // immutable, read from code

    bool public paused; // rarely toggled flag; bool-storage hint is advisory here
    uint256 public counter; // no redundant = 0

    constructor() {
        admin = msg.sender;
    }

    function setPaused(bool value) external {
        if (msg.sender != admin) {
            revert NotAdmin();
        }
        paused = value;
    }

    function sumAll(uint256[] calldata items) external pure returns (uint256 total) {
        uint256 len = items.length; // cached length
        for (uint256 i; i < len; ) {
            if (items[i] != 0) {
                total += items[i];
            }
            unchecked {
                ++i; // unchecked, prefix increment
            }
        }

        if (total == 0) {
            revert EmptyTotal(); // custom error, no string
        }
        return total;
    }

    function bump(uint256 x) external pure returns (uint256) {
        return x + 1; // no postfix increment
    }
}
