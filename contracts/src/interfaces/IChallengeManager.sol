// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IChallengeManager {
    enum ChallengeType {
        RESERVE_SHORTFALL,
        CONSTRAINT_BYPASS,
        FALSE_INDEPENDENCE,
        INVALID_VERIFICATION,
        SCOPE_NOT_PERFORMED
    }

    enum ChallengeStatus {
        PENDING,
        UPHELD,
        REJECTED,
        INFORMATIONAL
    }

    struct ChallengeRecord {
        bytes32 certHash;
        address challenger;
        ChallengeType challengeType;
        ChallengeStatus status;
        uint256 bond;
        bytes evidence;
        uint48 submittedAt;
        uint48 resolvedAt;
    }

    event ChallengeSubmitted(
        uint256 indexed challengeId, bytes32 indexed certHash, address indexed challenger, ChallengeType challengeType
    );

    event ChallengeResolved(uint256 indexed challengeId, ChallengeStatus status, uint256 slashedAmount);

    function challenge(bytes32 certHash, ChallengeType challengeType, bytes calldata evidence)
        external
        payable
        returns (uint256 challengeId);

    function resolveAuto(uint256 challengeId) external;

    function submitVerdict(uint256 challengeId, bool upheld, bytes[] calldata panelSignatures) external;

    function getChallenge(uint256 challengeId) external view returns (ChallengeRecord memory);

    function getChallengesByCert(bytes32 certHash) external view returns (uint256[] memory);
}
