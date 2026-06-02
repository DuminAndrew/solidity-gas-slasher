// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CacheArrayLengthDirty {
    uint256[] internal items;

    function sum() external view returns (uint256 total) {
        for (uint256 i = 0; i < items.length; ++i) {
            total += items[i];
        }
    }
}
