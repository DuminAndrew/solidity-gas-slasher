// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Sample {
    uint256 public maxUsers = 100;          // кандидат на constant
    uint256[] public balances;

    function sumAll(uint256[] memory items) external view returns (uint256 total) {
        // .length в условии + i++ + > 0
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i] > 0) {
                total += items[i];
            }
        }
        require(total > 0, "total must be positive"); // строковый require
        return total;
    }

    function setName(string memory name) public pure returns (string memory) {
        return name; // memory вместо calldata для external/public
    }
}
