// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PostfixVsPrefixDirty {
    function step(uint256 x) external pure returns (uint256) {
        x++;
        return x;
    }
}
