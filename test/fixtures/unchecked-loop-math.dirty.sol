// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UncheckedLoopMathDirty {
    function run(uint256 len) external pure returns (uint256 acc) {
        for (uint256 i = 0; i < len; ++i) {
            acc += i;
        }
    }
}
