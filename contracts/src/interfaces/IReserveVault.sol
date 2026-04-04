// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IReserveVault {
    event ReserveDeposited(address indexed operator, uint256 amount, uint48 lockUntil);
    event ReserveReleased(address indexed operator, uint256 amount);

    function deposit(uint256 amount) external;

    function getReserveBalance() external view returns (uint256);

    function isAdequate(uint128 containmentBound, uint16 requiredRatioBps) external view returns (bool);

    function release() external;

    function isLocked() external view returns (bool);
}
