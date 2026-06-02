// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract StorageInLoopDirty {
    uint256 internal factor;

    function scale(uint256 len) external view returns (uint256 acc) {
        uint256 cachedLen = len;
        for (uint256 i = 0; i < cachedLen; ++i) {
            acc += factor;
        }
    }
}
