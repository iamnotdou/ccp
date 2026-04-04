// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IAuditorStaking {
    struct AuditorRecord {
        uint256 totalAttestations;
        uint256 successfulChallenges;
        uint256 activeStake;
    }

    event Staked(address indexed auditor, bytes32 indexed certHash, uint256 amount);
    event Released(address indexed auditor, bytes32 indexed certHash, uint256 amount);
    event Slashed(address indexed auditor, bytes32 indexed certHash, uint256 amount, address challenger);

    function stake(bytes32 certHash, uint256 amount) external;

    function getStake(address auditor, bytes32 certHash) external view returns (uint256);

    function getTotalStaked(address auditor) external view returns (uint256);

    function release(bytes32 certHash) external;

    function slash(address auditor, bytes32 certHash, address challenger) external;

    function getAuditorRecord(address auditor) external view returns (AuditorRecord memory);
}
