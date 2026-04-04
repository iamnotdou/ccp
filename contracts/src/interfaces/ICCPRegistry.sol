// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICCPRegistry {
    enum Status {
        ACTIVE,
        REVOKED,
        EXPIRED,
        CHALLENGED
    }

    enum CertificateClass {
        NONE,
        C1,
        C2,
        C3
    }

    struct CertificateRecord {
        address operator;
        address agent;
        CertificateClass certificateClass;
        uint48 issuedAt;
        uint48 expiresAt;
        Status status;
        uint128 containmentBound;
        address reserveVault;
        address spendingLimit;
        string ipfsUri;
        address[] auditors;
    }

    event CertificatePublished(
        bytes32 indexed certHash,
        address indexed agent,
        address indexed operator,
        CertificateClass certificateClass,
        uint128 containmentBound,
        uint48 expiresAt
    );

    event CertificateRevoked(bytes32 indexed certHash, address indexed agent);

    event CertificateRevokedForCause(bytes32 indexed certHash, address indexed agent, address challenger);

    event CertificateChallenged(bytes32 indexed certHash, address indexed challenger);

    // publish uses CCPRegistry.PublishParams struct — see implementation

    function revoke(bytes32 certHash) external;

    function isValid(bytes32 certHash) external view returns (bool);

    function verify(address agent, CertificateClass minClass, uint128 maxAcceptableLoss)
        external
        view
        returns (bool acceptable, bytes32 certHash);

    function getActiveCertificate(address agent) external view returns (bytes32);

    function getCertificate(bytes32 certHash) external view returns (CertificateRecord memory);

    function getCertificateAuditors(bytes32 certHash) external view returns (address[] memory);

    function getAuditorAttestationCount(address auditor) external view returns (uint256);

    // Challenge-manager callable functions
    function setStatusChallenged(bytes32 certHash) external;

    function revokeForCause(bytes32 certHash, address challenger) external;

    function restoreFromChallenge(bytes32 certHash) external;
}
