// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ICCPRegistry} from "./interfaces/ICCPRegistry.sol";
import {IAuditorStaking} from "./interfaces/IAuditorStaking.sol";

/// @title CCP Registry — Certificate storage, lookup, and verification
/// @notice Core registry for the Containment Certificate Protocol.
///         Stores certificate metadata on-chain, maps agents to certificates,
///         and exposes verification functions for counterparties.
contract CCPRegistry is ICCPRegistry {
    IAuditorStaking public immutable auditorStaking;
    address public challengeManager;

    mapping(bytes32 => CertificateRecord) private _certificates;
    mapping(address => bytes32) private _activeCertificates;
    mapping(address => uint256) private _auditorAttestationCount;

    uint16 public constant C2_MIN_STAKE_BPS = 300; // 3%
    uint16 public constant C3_MIN_STAKE_BPS = 500; // 5%

    struct PublishParams {
        bytes32 certHash;
        address agent;
        CertificateClass certificateClass;
        uint48 expiresAt;
        uint128 containmentBound;
        address reserveVault;
        address spendingLimit;
        string ipfsUri;
    }

    error CertificateAlreadyExists(bytes32 certHash);
    error CertificateNotFound(bytes32 certHash);
    error InvalidOperatorSignature();
    error InvalidAttestorSignature();
    error AuditorNotStaked(address auditor, uint256 required, uint256 actual);
    error NotOperator();
    error NotChallengeManager();
    error CertificateNotActive(bytes32 certHash);
    error InvalidExpiry();

    modifier onlyChallengeManager() {
        if (msg.sender != challengeManager) revert NotChallengeManager();
        _;
    }

    constructor(address _auditorStaking) {
        auditorStaking = IAuditorStaking(_auditorStaking);
    }

    function setChallengeManager(address _challengeManager) external {
        require(challengeManager == address(0), "CCP: challenge manager already set");
        challengeManager = _challengeManager;
    }

    function publish(
        PublishParams calldata params,
        bytes calldata operatorSignature,
        bytes[] calldata attestorSignatures
    ) external {
        if (_certificates[params.certHash].issuedAt != 0) revert CertificateAlreadyExists(params.certHash);
        if (params.expiresAt <= block.timestamp) revert InvalidExpiry();

        // Verify operator signature
        if (_recoverSigner(params.certHash, operatorSignature) != msg.sender) {
            revert InvalidOperatorSignature();
        }

        // If agent already has an active certificate, revoke it
        bytes32 existingCert = _activeCertificates[params.agent];
        if (existingCert != bytes32(0) && _isActiveInternal(existingCert)) {
            _certificates[existingCert].status = Status.REVOKED;
            emit CertificateRevoked(existingCert, params.agent);
        }

        // Verify attestor signatures and check stakes
        address[] memory auditors = _verifyAttestors(params, attestorSignatures);

        // Store certificate
        CertificateRecord storage cert = _certificates[params.certHash];
        cert.operator = msg.sender;
        cert.agent = params.agent;
        cert.certificateClass = params.certificateClass;
        cert.issuedAt = uint48(block.timestamp);
        cert.expiresAt = params.expiresAt;
        cert.status = Status.ACTIVE;
        cert.containmentBound = params.containmentBound;
        cert.reserveVault = params.reserveVault;
        cert.spendingLimit = params.spendingLimit;
        cert.ipfsUri = params.ipfsUri;
        cert.auditors = auditors;

        _activeCertificates[params.agent] = params.certHash;

        emit CertificatePublished(
            params.certHash,
            params.agent,
            msg.sender,
            params.certificateClass,
            params.containmentBound,
            params.expiresAt
        );
    }

    function revoke(bytes32 certHash) external {
        CertificateRecord storage cert = _certificates[certHash];
        if (cert.issuedAt == 0) revert CertificateNotFound(certHash);
        if (cert.operator != msg.sender) revert NotOperator();
        if (cert.status != Status.ACTIVE) revert CertificateNotActive(certHash);

        cert.status = Status.REVOKED;

        if (_activeCertificates[cert.agent] == certHash) {
            _activeCertificates[cert.agent] = bytes32(0);
        }

        emit CertificateRevoked(certHash, cert.agent);
    }

    function setStatusChallenged(bytes32 certHash) external onlyChallengeManager {
        CertificateRecord storage cert = _certificates[certHash];
        if (cert.issuedAt == 0) revert CertificateNotFound(certHash);
        cert.status = Status.CHALLENGED;
        emit CertificateChallenged(certHash, msg.sender);
    }

    function revokeForCause(bytes32 certHash, address challenger) external onlyChallengeManager {
        CertificateRecord storage cert = _certificates[certHash];
        if (cert.issuedAt == 0) revert CertificateNotFound(certHash);

        cert.status = Status.REVOKED;

        if (_activeCertificates[cert.agent] == certHash) {
            _activeCertificates[cert.agent] = bytes32(0);
        }

        emit CertificateRevokedForCause(certHash, cert.agent, challenger);
    }

    function restoreFromChallenge(bytes32 certHash) external onlyChallengeManager {
        CertificateRecord storage cert = _certificates[certHash];
        if (cert.issuedAt == 0) revert CertificateNotFound(certHash);
        if (cert.status != Status.CHALLENGED) revert CertificateNotActive(certHash);
        cert.status = Status.ACTIVE;
    }

    // ─── View Functions ───

    function isValid(bytes32 certHash) external view returns (bool) {
        return _isActiveInternal(certHash);
    }

    function verify(address agent, CertificateClass minClass, uint128 maxAcceptableLoss)
        external
        view
        returns (bool acceptable, bytes32 certHash)
    {
        certHash = _activeCertificates[agent];
        if (certHash == bytes32(0)) return (false, bytes32(0));
        if (!_isActiveInternal(certHash)) return (false, certHash);

        CertificateRecord storage cert = _certificates[certHash];
        if (uint8(cert.certificateClass) < uint8(minClass)) return (false, certHash);
        if (cert.containmentBound > maxAcceptableLoss) return (false, certHash);

        return (true, certHash);
    }

    function getActiveCertificate(address agent) external view returns (bytes32) {
        return _activeCertificates[agent];
    }

    function getCertificate(bytes32 certHash) external view returns (CertificateRecord memory) {
        return _certificates[certHash];
    }

    function getCertificateAuditors(bytes32 certHash) external view returns (address[] memory) {
        return _certificates[certHash].auditors;
    }

    function getAuditorAttestationCount(address auditor) external view returns (uint256) {
        return _auditorAttestationCount[auditor];
    }

    // ─── Internal ───

    function _verifyAttestors(PublishParams calldata params, bytes[] calldata attestorSignatures)
        internal
        returns (address[] memory auditors)
    {
        auditors = new address[](attestorSignatures.length);
        uint256 requiredStake = _calculateMinStake(params.certificateClass, params.containmentBound);

        for (uint256 i = 0; i < attestorSignatures.length; i++) {
            address auditor = _recoverSigner(params.certHash, attestorSignatures[i]);
            if (auditor == address(0)) revert InvalidAttestorSignature();

            uint256 actualStake = auditorStaking.getStake(auditor, params.certHash);
            if (actualStake < requiredStake) {
                revert AuditorNotStaked(auditor, requiredStake, actualStake);
            }

            auditors[i] = auditor;
            _auditorAttestationCount[auditor]++;
        }
    }

    function _isActiveInternal(bytes32 certHash) internal view returns (bool) {
        CertificateRecord storage cert = _certificates[certHash];
        if (cert.issuedAt == 0) return false;
        if (cert.status != Status.ACTIVE) return false;
        if (block.timestamp > cert.expiresAt) return false;
        return true;
    }

    function _recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        require(signature.length == 65, "CCP: invalid signature length");
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

    function _calculateMinStake(CertificateClass certClass, uint128 containmentBound)
        internal
        pure
        returns (uint256)
    {
        if (certClass == CertificateClass.C1) return 0; // C1 is self-attested
        uint16 bps = certClass == CertificateClass.C3 ? C3_MIN_STAKE_BPS : C2_MIN_STAKE_BPS;
        uint256 calculated = (uint256(containmentBound) * bps) / 10_000;
        uint256 cap = certClass == CertificateClass.C3 ? 250_000e6 : 100_000e6;
        return calculated < cap ? calculated : cap;
    }
}
