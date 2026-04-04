// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IAuditorStaking} from "./interfaces/IAuditorStaking.sol";
import {IERC20} from "lib/forge-std/src/interfaces/IERC20.sol";

/// @title Auditor Staking — Skin-in-the-game for CCP auditors
/// @notice Auditors lock capital per attestation. Slashed if attestation proven false.
///         Track record (attestation count, challenges) is publicly queryable.
contract AuditorStaking is IAuditorStaking {
    IERC20 public immutable stakeAsset; // USDC
    address public registry;
    address public challengeManager;

    // auditor => certHash => staked amount
    mapping(address => mapping(bytes32 => uint256)) private _stakes;
    // auditor => total staked across all certs
    mapping(address => uint256) private _totalStaked;
    // auditor => record
    mapping(address => AuditorRecord) private _records;
    // certHash => lock expiry (cert expiry + grace period)
    mapping(bytes32 => uint48) private _lockExpiry;

    uint48 public constant C2_GRACE_PERIOD = 14 days;
    uint48 public constant C3_GRACE_PERIOD = 30 days;

    error NotAuthorized();
    error StakeAlreadyExists();
    error StakeNotFound();
    error StakeStillLocked(uint48 lockExpiry);
    error InsufficientStake();

    modifier onlyChallengeManager() {
        if (msg.sender != challengeManager) revert NotAuthorized();
        _;
    }

    constructor(address _stakeAsset) {
        stakeAsset = IERC20(_stakeAsset);
    }

    function setRegistry(address _registry) external {
        require(registry == address(0), "already set");
        registry = _registry;
    }

    function setChallengeManager(address _challengeManager) external {
        require(challengeManager == address(0), "already set");
        challengeManager = _challengeManager;
    }

    function stake(bytes32 certHash, uint256 amount) external {
        if (_stakes[msg.sender][certHash] != 0) revert StakeAlreadyExists();
        if (amount == 0) revert InsufficientStake();

        stakeAsset.transferFrom(msg.sender, address(this), amount);

        _stakes[msg.sender][certHash] = amount;
        _totalStaked[msg.sender] += amount;
        _records[msg.sender].totalAttestations++;
        _records[msg.sender].activeStake += amount;

        emit Staked(msg.sender, certHash, amount);
    }

    function setLockExpiry(bytes32 certHash, uint48 certExpiresAt, uint48 gracePeriod) external {
        require(msg.sender == registry, "only registry");
        _lockExpiry[certHash] = certExpiresAt + gracePeriod;
    }

    function release(bytes32 certHash) external {
        uint256 amount = _stakes[msg.sender][certHash];
        if (amount == 0) revert StakeNotFound();

        uint48 lockExp = _lockExpiry[certHash];
        if (lockExp > 0 && block.timestamp < lockExp) {
            revert StakeStillLocked(lockExp);
        }

        _stakes[msg.sender][certHash] = 0;
        _totalStaked[msg.sender] -= amount;
        _records[msg.sender].activeStake -= amount;

        stakeAsset.transfer(msg.sender, amount);

        emit Released(msg.sender, certHash, amount);
    }

    function slash(address auditor, bytes32 certHash, address challenger) external onlyChallengeManager {
        uint256 amount = _stakes[auditor][certHash];
        if (amount == 0) revert StakeNotFound();

        _stakes[auditor][certHash] = 0;
        _totalStaked[auditor] -= amount;
        _records[auditor].activeStake -= amount;
        _records[auditor].successfulChallenges++;

        // Distribute: 30% challenger, 50% verifier pool (sent to challenge manager), 20% burned
        uint256 challengerReward = (amount * 30) / 100;
        uint256 verifierPool = (amount * 50) / 100;
        uint256 burnAmount = amount - challengerReward - verifierPool;

        stakeAsset.transfer(challenger, challengerReward);
        stakeAsset.transfer(challengeManager, verifierPool);
        // Burn by sending to dead address
        stakeAsset.transfer(address(0xdead), burnAmount);

        emit Slashed(auditor, certHash, amount, challenger);
    }

    // ─── View Functions ───

    function getStake(address auditor, bytes32 certHash) external view returns (uint256) {
        return _stakes[auditor][certHash];
    }

    function getTotalStaked(address auditor) external view returns (uint256) {
        return _totalStaked[auditor];
    }

    function getAuditorRecord(address auditor) external view returns (AuditorRecord memory) {
        return _records[auditor];
    }

    function getLockExpiry(bytes32 certHash) external view returns (uint48) {
        return _lockExpiry[certHash];
    }
}
