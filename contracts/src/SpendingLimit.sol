// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ISpendingLimit} from "./interfaces/ISpendingLimit.sol";
import {IERC20} from "lib/forge-std/src/interfaces/IERC20.sol";

/// @title Spending Limit — Agent containment enforcement with Ledger co-signing
/// @notice Enforces max_single_action_loss and max_periodic_loss.
///         Below cosignThreshold: agent signs alone.
///         Above cosignThreshold: Ledger hardware device must co-sign.
///         Only the Ledger-derived address can change parameters (agent-independent).
contract SpendingLimit is ISpendingLimit {
    address public immutable agent;
    address public ledgerCosigner; // Operator's Ledger-derived address
    IERC20 public immutable spendAsset; // USDC

    uint128 public maxSingleAction;
    uint128 public maxPeriodicLoss;
    uint48 public periodDuration;
    uint128 public cosignThreshold;

    uint128 public currentPeriodSpent;
    uint48 public currentPeriodStart;

    error NotAgent();
    error NotLedger();
    error ExceedsSingleActionLimit(uint256 value, uint128 limit);
    error ExceedsPeriodicLimit(uint256 totalWouldBe, uint128 limit);
    error InvalidLedgerSignature();
    error CosignRequired(uint256 value, uint128 threshold);
    error TransferFailed();

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    modifier onlyLedger() {
        if (msg.sender != ledgerCosigner) revert NotLedger();
        _;
    }

    constructor(
        address _agent,
        address _ledgerCosigner,
        address _spendAsset,
        uint128 _maxSingleAction,
        uint128 _maxPeriodicLoss,
        uint48 _periodDuration,
        uint128 _cosignThreshold
    ) {
        agent = _agent;
        ledgerCosigner = _ledgerCosigner;
        spendAsset = IERC20(_spendAsset);
        maxSingleAction = _maxSingleAction;
        maxPeriodicLoss = _maxPeriodicLoss;
        periodDuration = _periodDuration;
        cosignThreshold = _cosignThreshold;
        currentPeriodStart = uint48(block.timestamp);
    }

    /// @notice Execute a transaction below the cosign threshold (agent-only signature)
    function execute(address to, uint256 value, bytes calldata /*data*/ ) external onlyAgent returns (bool) {
        if (value > cosignThreshold) {
            emit TransactionBlocked(agent, value, "COSIGN_REQUIRED");
            revert CosignRequired(value, cosignThreshold);
        }

        _enforceAndSpend(to, value, false);
        return true;
    }

    /// @notice Execute a transaction with Ledger co-signature (for above-threshold amounts)
    function executeWithCosign(address to, uint256 value, bytes calldata, /*data*/ bytes calldata ledgerSignature)
        external
        onlyAgent
        returns (bool)
    {
        // Verify ledger co-signed this specific transaction
        bytes32 txHash = keccak256(abi.encodePacked(to, value, block.chainid, address(this)));
        address recovered = _recoverSigner(txHash, ledgerSignature);
        if (recovered != ledgerCosigner) {
            emit TransactionBlocked(agent, value, "INVALID_LEDGER_SIG");
            revert InvalidLedgerSignature();
        }

        _enforceAndSpend(to, value, true);
        return true;
    }

    // ─── Parameter Changes (Ledger-only = agent-independent) ───

    function updateMaxSingleAction(uint128 _new) external onlyLedger {
        maxSingleAction = _new;
    }

    function updateMaxPeriodicLoss(uint128 _new) external onlyLedger {
        maxPeriodicLoss = _new;
    }

    function updateCosignThreshold(uint128 _new) external onlyLedger {
        cosignThreshold = _new;
    }

    function updateLedgerCosigner(address _new) external onlyLedger {
        ledgerCosigner = _new;
    }

    // ─── View Functions ───

    function getRemainingAllowance() external view returns (uint128) {
        uint128 spent = _getCurrentPeriodSpent();
        if (spent >= maxPeriodicLoss) return 0;
        return maxPeriodicLoss - spent;
    }

    function getSpentInPeriod() external view returns (uint128 spent, uint128 limit, uint48 periodEnd) {
        spent = _getCurrentPeriodSpent();
        limit = maxPeriodicLoss;
        periodEnd = currentPeriodStart + periodDuration;
    }

    // ─── Internal ───

    function _enforceAndSpend(address to, uint256 value, bool cosigned) internal {
        // Check single-action limit (absolute, even with cosign)
        if (value > maxSingleAction) {
            emit TransactionBlocked(agent, value, "EXCEEDS_SINGLE_ACTION");
            revert ExceedsSingleActionLimit(value, maxSingleAction);
        }

        // Reset period if needed
        _maybeResetPeriod();

        // Check periodic limit (absolute, even with cosign)
        uint256 totalWouldBe = uint256(currentPeriodSpent) + value;
        if (totalWouldBe > maxPeriodicLoss) {
            emit TransactionBlocked(agent, value, "EXCEEDS_PERIODIC_LIMIT");
            revert ExceedsPeriodicLimit(totalWouldBe, maxPeriodicLoss);
        }

        // Execute the transfer
        currentPeriodSpent += uint128(value);
        bool success = spendAsset.transfer(to, value);
        if (!success) revert TransferFailed();

        emit TransactionExecuted(agent, to, value, cosigned);
    }

    function _maybeResetPeriod() internal {
        if (block.timestamp >= currentPeriodStart + periodDuration) {
            currentPeriodStart = uint48(block.timestamp);
            currentPeriodSpent = 0;
            emit PeriodReset(currentPeriodStart);
        }
    }

    function _getCurrentPeriodSpent() internal view returns (uint128) {
        if (block.timestamp >= currentPeriodStart + periodDuration) {
            return 0; // Period has reset
        }
        return currentPeriodSpent;
    }

    function _recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        require(signature.length == 65, "invalid sig len");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        return ecrecover(ethSignedHash, v, r, s);
    }
}
