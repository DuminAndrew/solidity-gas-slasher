// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract UintGtZeroDirty {
    function positive(uint256 x) external pure returns (bool) {
        return x > 0;
    }
}
