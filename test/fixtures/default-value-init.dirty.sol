// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DefaultValueInitDirty {
    function run() external pure returns (uint256) {
        uint256 counter = 0;
        return counter;
    }
}
