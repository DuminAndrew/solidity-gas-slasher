// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IncrementPrefixDirty {
    function loop(uint256 n) external pure returns (uint256 acc) {
        uint256 len = n;
        for (uint256 i = 0; i < len; i++) {
            acc += i;
        }
    }
}
