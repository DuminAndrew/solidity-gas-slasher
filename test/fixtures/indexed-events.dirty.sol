// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract IndexedEventsDirty {
    event Transfer(address from, address to, uint256 amount);

    function emitIt(address to) external {
        emit Transfer(msg.sender, to, 1);
    }
}
