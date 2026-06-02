// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CalldataParamsDirty {
    function echo(string memory name) external pure returns (string memory) {
        return name;
    }
}
