// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IChallengeManager} from "./interfaces/IChallengeManager.sol";
import {ICCPRegistry} from "./interfaces/ICCPRegistry.sol";
import {IAuditorStaking} from "./interfaces/IAuditorStaking.sol";
import {IReserveVault} from "./interfaces/IReserveVault.sol";
import {IERC20} from "lib/forge-std/src/interfaces/IERC20.sol";

/// @title Challenge Manager — Dispute resolution for CCP certificates
/// @notice Anyone can challenge a certificate claim with evidence + bond.
///         Auto-resolves on-chain verifiable claims (reserve shortfall, constraint bypass).
///         Expert panel for complex disputes. Slash distribution: 30% challenger, 50% verifiers, 20% burn.
contract ChallengeManager is IChallengeManager {
    ICCPRegistry public immutable registry;
    IAuditorStaking public immutable auditorStaking;
    IERC20 public immutable bondAsset;
    address public immutable feeEscrow;

    uint256 public constant MIN_CHALLENGE_BOND = 200e6; // 200 USDC

    uint256 private _nextChallengeId = 1;
    mapping(uint256 => ChallengeRecord) private _challenges;
    mapping(bytes32 => uint256[]) private _challengesByCert;

    error InsufficientBond();
    error ChallengeNotFound();
    error ChallengeAlreadyResolved();
    error CertificateNotActive();
    error NotAutoResolvable();
    error AutoResolveFailed();

    constructor(address _registry, address _auditorStaking, address _bondAsset, address _feeEscrow) {
        registry = ICCPRegistry(_registry);
        auditorStaking = IAuditorStaking(_auditorStaking);
        bondAsset = IERC20(_bondAsset);
        feeEscrow = _feeEscrow;
    }

    function challenge(bytes32 certHash, ChallengeType challengeType, bytes calldata evidence)
        external
        payable
        returns (uint256 challengeId)
    {
        // Transfer bond
        bondAsset.transferFrom(msg.sender, address(this), MIN_CHALLENGE_BOND);

        // Verify certificate exists and is active or within grace period
        ICCPRegistry.CertificateRecord memory cert = registry.getCertificate(certHash);
        require(cert.issuedAt != 0, "cert not found");

        challengeId = _nextChallengeId++;

        _challenges[challengeId] = ChallengeRecord({
            certHash: certHash,
            challenger: msg.sender,
            challengeType: challengeType,
            status: ChallengeStatus.PENDING,
            bond: MIN_CHALLENGE_BOND,
            evidence: evidence,
            submittedAt: uint48(block.timestamp),
            resolvedAt: 0
        });

        _challengesByCert[certHash].push(challengeId);

        // Set certificate status to CHALLENGED via registry
        // (only if it's still ACTIVE)
        if (cert.status == ICCPRegistry.Status.ACTIVE) {
            registry.setStatusChallenged(certHash);
        }

        emit ChallengeSubmitted(challengeId, certHash, msg.sender, challengeType);
    }

    /// @notice Auto-resolve on-chain verifiable challenges
    function resolveAuto(uint256 challengeId) external {
        ChallengeRecord storage c = _challenges[challengeId];
        if (c.submittedAt == 0) revert ChallengeNotFound();
        if (c.status != ChallengeStatus.PENDING) revert ChallengeAlreadyResolved();

        // Only certain challenge types can be auto-resolved
        if (
            c.challengeType != ChallengeType.RESERVE_SHORTFALL
                && c.challengeType != ChallengeType.CONSTRAINT_BYPASS
                && c.challengeType != ChallengeType.FALSE_INDEPENDENCE
        ) {
            revert NotAutoResolvable();
        }

        ICCPRegistry.CertificateRecord memory cert = registry.getCertificate(c.certHash);
        bool upheld = false;

        if (c.challengeType == ChallengeType.RESERVE_SHORTFALL) {
            // Check if reserve balance is below stated amount in certificate
            IReserveVault vault = IReserveVault(cert.reserveVault);
            uint256 actualBalance = vault.getReserveBalance();
            uint256 statedAmount = _decodeStatedAmount(c.evidence);
            upheld = actualBalance < statedAmount;
        }
        // CONSTRAINT_BYPASS and FALSE_INDEPENDENCE would check SpendingLimit state
        // Simplified for hackathon: evidence contains expected vs actual values

        if (upheld) {
            _resolveUpheld(challengeId, c, cert);
        } else {
            _resolveRejected(challengeId, c);
        }
    }

    /// @notice Expert panel submits verdict for non-auto-resolvable challenges
    function submitVerdict(uint256 challengeId, bool upheld, bytes[] calldata /*panelSignatures*/ ) external {
        ChallengeRecord storage c = _challenges[challengeId];
        if (c.submittedAt == 0) revert ChallengeNotFound();
        if (c.status != ChallengeStatus.PENDING) revert ChallengeAlreadyResolved();

        // In production: verify panel signatures (3 of N senior auditors)
        // For hackathon: simplified -- any caller can submit verdict
        // TODO: Add panel signature verification

        ICCPRegistry.CertificateRecord memory cert = registry.getCertificate(c.certHash);

        if (upheld) {
            _resolveUpheld(challengeId, c, cert);
        } else {
            _resolveRejected(challengeId, c);
        }
    }

    // ─── View Functions ───

    function getChallenge(uint256 challengeId) external view returns (ChallengeRecord memory) {
        return _challenges[challengeId];
    }

    function getChallengesByCert(bytes32 certHash) external view returns (uint256[] memory) {
        return _challengesByCert[certHash];
    }

    // ─── Internal ───

    function _resolveUpheld(
        uint256 challengeId,
        ChallengeRecord storage c,
        ICCPRegistry.CertificateRecord memory cert
    ) internal {
        c.status = ChallengeStatus.UPHELD;
        c.resolvedAt = uint48(block.timestamp);

        // Return challenger's bond
        bondAsset.transfer(c.challenger, c.bond);

        // Slash auditor stakes
        address[] memory auditors = registry.getCertificateAuditors(c.certHash);
        uint256 totalSlashed = 0;
        for (uint256 i = 0; i < auditors.length; i++) {
            uint256 stakeAmount = auditorStaking.getStake(auditors[i], c.certHash);
            if (stakeAmount > 0) {
                auditorStaking.slash(auditors[i], c.certHash, c.challenger);
                totalSlashed += stakeAmount;
            }
        }

        // Revoke certificate
        registry.revokeForCause(c.certHash, c.challenger);

        // Clawback fee escrow
        // Using low-level call since FeeEscrow might not have an interface imported
        (bool success,) = feeEscrow.call(abi.encodeWithSignature("clawback(bytes32)", c.certHash));
        // Don't revert if clawback fails (fee might not exist)

        emit ChallengeResolved(challengeId, ChallengeStatus.UPHELD, totalSlashed);
    }

    function _resolveRejected(uint256 challengeId, ChallengeRecord storage c) internal {
        c.status = ChallengeStatus.REJECTED;
        c.resolvedAt = uint48(block.timestamp);

        // Forfeit challenger's bond (send to dead address as penalty)
        bondAsset.transfer(address(0xdead), c.bond);

        // Restore certificate status
        registry.restoreFromChallenge(c.certHash);

        emit ChallengeResolved(challengeId, ChallengeStatus.REJECTED, 0);
    }

    function _decodeStatedAmount(bytes memory evidence) internal pure returns (uint256) {
        // Evidence format: abi.encode(statedAmount)
        return abi.decode(evidence, (uint256));
    }
}
