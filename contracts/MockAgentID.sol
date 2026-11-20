// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Test-only stand-in for the Agent ID contract. NOT deployed to mainnet.
contract MockAgentID {
    mapping(address => uint256) internal _balances;

    function mint(address to) external {
        _balances[to] += 1;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return _balances[owner];
    }
}
