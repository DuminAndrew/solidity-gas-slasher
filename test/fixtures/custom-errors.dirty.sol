// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CustomErrorsDirty {
    function check(uint256 x) external pure {
        require(x != 0, "x is zero");
    }
}
