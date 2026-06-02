// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ImmutableCandidateDirty {
    address internal owner;

    constructor() {
        owner = msg.sender;
    }

    function get() external view returns (address) {
        return owner;
    }
}
