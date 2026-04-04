// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IReserveVault} from "./interfaces/IReserveVault.sol";
import {IERC20} from "lib/forge-std/src/interfaces/IERC20.sol";

/// @title Reserve Vault — Locked reserve backing for CCP certificates
/// @notice Holds USDC locked during certificate validity. Publicly queryable.
///         Cannot be withdrawn while the certificate is active.
contract ReserveVault is IReserveVault {
    IERC20 public immutable reserveAsset;
    address public immutable operator;
    uint48 public lockUntil;
    uint256 public statedAmount; // Amount the certificate claims is in reserve

    error NotOperator();
    error StillLocked();
    error AlreadyLocked();

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(address _reserveAsset, address _operator) {
        reserveAsset = IERC20(_reserveAsset);
        operator = _operator;
    }

    function deposit(uint256 amount) external onlyOperator {
        reserveAsset.transferFrom(msg.sender, address(this), amount);
        statedAmount += amount;
        emit ReserveDeposited(msg.sender, amount, lockUntil);
    }

    function lock(uint48 _lockUntil) external onlyOperator {
        if (lockUntil > block.timestamp) revert AlreadyLocked();
        lockUntil = _lockUntil;
    }

    function release() external onlyOperator {
        if (block.timestamp < lockUntil) revert StillLocked();

        uint256 balance = reserveAsset.balanceOf(address(this));
        statedAmount = 0;
        lockUntil = 0;

        reserveAsset.transfer(operator, balance);

        emit ReserveReleased(operator, balance);
    }

    function getReserveBalance() external view returns (uint256) {
        return reserveAsset.balanceOf(address(this));
    }

    function getStatedAmount() external view returns (uint256) {
        return statedAmount;
    }

    function isAdequate(uint128 containmentBound, uint16 requiredRatioBps) external view returns (bool) {
        uint256 balance = reserveAsset.balanceOf(address(this));
        uint256 required = (uint256(containmentBound) * requiredRatioBps) / 10_000;
        return balance >= required;
    }

    function isLocked() external view returns (bool) {
        return block.timestamp < lockUntil;
    }
}
