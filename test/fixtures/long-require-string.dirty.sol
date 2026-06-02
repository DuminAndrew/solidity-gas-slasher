// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LongRequireStringDirty {
    function check(bool ok) external pure {
        require(ok, "this error reason string is definitely longer than thirty two bytes");
    }
}
