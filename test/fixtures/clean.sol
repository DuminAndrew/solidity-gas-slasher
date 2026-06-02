// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Clean — a contract that should produce ZERO gas-slasher findings.
/// @notice Every known anti-pattern is deliberately avoided here.
contract Clean {
    error NotOwner();
    error EmptyInput();

    event Moved(address indexed from, address indexed to, uint256 value);

    uint256 public constant MAX = 100;
    address public immutable owner;

    constructor(address initialOwner) {
        owner = initialOwner;
    }

    function sum(uint256[] calldata items) external pure returns (uint256 total) {
        uint256 len = items.length;
        for (uint256 i; i < len; ) {
            if (items[i] != 0) {
                total += items[i];
            }
            unchecked {
                ++i;
            }
        }
    }

    function guard(bool ok) external view {
        if (!ok) {
            revert NotOwner();
        }
        if (msg.sender != owner) {
            revert NotOwner();
        }
    }

    function move(address to, uint256 value) external {
        if (to == address(0)) {
            revert EmptyInput();
        }
        emit Moved(msg.sender, to, value);
    }
}
