// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RevertStringVsErrorDirty {
    function check(bool ok) external pure {
        if (!ok) {
            revert("bad");
        }
    }
}
