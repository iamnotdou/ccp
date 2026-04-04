// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "lib/forge-std/src/interfaces/IERC20.sol";

/// @title Fee Escrow — Holds audit fees until clean certificate expiry
/// @notice Operator deposits fee when engaging auditor. Fee released to auditor
///         after certificate expiry + grace period with no challenge.
///         Clawed back if a challenge succeeds.
contract FeeEscrow {
    IERC20 public immutable feeAsset;
    address public challengeManager;

    struct EscrowRecord {
        address operator;
        address auditor;
        uint256 amount;
        uint48 releaseAfter; // cert expiry + grace
        bool released;
        bool clawedBack;
    }

    mapping(bytes32 => EscrowRecord) public escrows; // certHash => escrow

    event FeeDeposited(bytes32 indexed certHash, address indexed operator, address indexed auditor, uint256 amount);
    event FeeReleased(bytes32 indexed certHash, address indexed auditor, uint256 amount);
    event FeeClawedBack(bytes32 indexed certHash, address indexed operator, uint256 amount);

    error NotAuthorized();
    error EscrowNotFound();
    error AlreadySettled();
    error NotYetReleasable();

    constructor(address _feeAsset) {
        feeAsset = IERC20(_feeAsset);
    }

    function setChallengeManager(address _challengeManager) external {
        require(challengeManager == address(0), "already set");
        challengeManager = _challengeManager;
    }

    function deposit(bytes32 certHash, address auditor, uint256 amount, uint48 releaseAfter) external {
        require(escrows[certHash].amount == 0, "escrow exists");

        feeAsset.transferFrom(msg.sender, address(this), amount);

        escrows[certHash] = EscrowRecord({
            operator: msg.sender,
            auditor: auditor,
            amount: amount,
            releaseAfter: releaseAfter,
            released: false,
            clawedBack: false
        });

        emit FeeDeposited(certHash, msg.sender, auditor, amount);
    }

    function release(bytes32 certHash) external {
        EscrowRecord storage e = escrows[certHash];
        if (e.amount == 0) revert EscrowNotFound();
        if (e.released || e.clawedBack) revert AlreadySettled();
        if (block.timestamp < e.releaseAfter) revert NotYetReleasable();

        e.released = true;
        feeAsset.transfer(e.auditor, e.amount);

        emit FeeReleased(certHash, e.auditor, e.amount);
    }

    function clawback(bytes32 certHash) external {
        if (msg.sender != challengeManager) revert NotAuthorized();

        EscrowRecord storage e = escrows[certHash];
        if (e.amount == 0) revert EscrowNotFound();
        if (e.released || e.clawedBack) revert AlreadySettled();

        e.clawedBack = true;
        feeAsset.transfer(e.operator, e.amount);

        emit FeeClawedBack(certHash, e.operator, e.amount);
    }
}
