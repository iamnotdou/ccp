// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import {CCPRegistry} from "../src/CCPRegistry.sol";
import {ICCPRegistry} from "../src/interfaces/ICCPRegistry.sol";
import {AuditorStaking} from "../src/AuditorStaking.sol";
import {IAuditorStaking} from "../src/interfaces/IAuditorStaking.sol";
import {ReserveVault} from "../src/ReserveVault.sol";
import {SpendingLimit} from "../src/SpendingLimit.sol";
import {FeeEscrow} from "../src/FeeEscrow.sol";
import {ChallengeManager} from "../src/ChallengeManager.sol";
import {IChallengeManager} from "../src/interfaces/IChallengeManager.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";

contract FullFlowTest is Test {
    // Contracts
    CCPRegistry registry;
    AuditorStaking auditorStaking;
    ReserveVault reserveVault;
    SpendingLimit spendingLimit;
    FeeEscrow feeEscrow;
    ChallengeManager challengeManager;
    ERC20Mock usdc;

    // Actors
    uint256 operatorPk = 0xA1;
    uint256 auditorPk = 0xB1;
    uint256 agentPk = 0xC1;
    uint256 ledgerPk = 0xD1;
    uint256 challengerPk = 0xE1;
    uint256 counterpartyPk = 0xF1;

    address operator;
    address auditor;
    address agentAddr;
    address ledger;
    address challenger;
    address counterparty;

    // Certificate params
    bytes32 certHash;
    uint128 constant CONTAINMENT_BOUND = 50_000e6; // $50k USDC
    uint128 constant MAX_SINGLE_ACTION = 10_000e6; // $10k
    uint128 constant MAX_PERIODIC_LOSS = 50_000e6; // $50k
    uint48 constant PERIOD_DURATION = 1 days;
    uint128 constant COSIGN_THRESHOLD = 5_000e6; // $5k
    uint256 constant RESERVE_AMOUNT = 150_000e6; // $150k (3x)
    uint256 constant AUDITOR_STAKE = 1_500e6; // 3% of $50k

    function setUp() public {
        operator = vm.addr(operatorPk);
        auditor = vm.addr(auditorPk);
        agentAddr = vm.addr(agentPk);
        ledger = vm.addr(ledgerPk);
        challenger = vm.addr(challengerPk);
        counterparty = vm.addr(counterpartyPk);

        // Deploy mock USDC
        usdc = new ERC20Mock("USD Coin", "USDC", 6);

        // Deploy protocol contracts
        auditorStaking = new AuditorStaking(address(usdc));
        registry = new CCPRegistry(address(auditorStaking));
        feeEscrow = new FeeEscrow(address(usdc));
        challengeManager = new ChallengeManager(
            address(registry), address(auditorStaking), address(usdc), address(feeEscrow)
        );

        // Wire contracts together
        auditorStaking.setRegistry(address(registry));
        auditorStaking.setChallengeManager(address(challengeManager));
        registry.setChallengeManager(address(challengeManager));
        feeEscrow.setChallengeManager(address(challengeManager));

        // Deploy containment contracts for the agent
        reserveVault = new ReserveVault(address(usdc), operator);
        spendingLimit = new SpendingLimit(
            agentAddr, ledger, address(usdc), MAX_SINGLE_ACTION, MAX_PERIODIC_LOSS, PERIOD_DURATION, COSIGN_THRESHOLD
        );

        // Compute certificate hash
        certHash = keccak256(abi.encodePacked(agentAddr, operator, block.timestamp, "ccp-v0.2"));

        // Fund actors
        usdc.mint(operator, 500_000e6);
        usdc.mint(auditor, 100_000e6);
        usdc.mint(challenger, 10_000e6);
        usdc.mint(agentAddr, 100_000e6); // Agent has funds to spend
    }

    // ─── Happy Path: Full Certificate Lifecycle ───

    function test_fullLifecycle() public {
        // Step 1: Operator deposits reserve
        vm.startPrank(operator);
        usdc.approve(address(reserveVault), RESERVE_AMOUNT);
        reserveVault.deposit(RESERVE_AMOUNT);
        reserveVault.lock(uint48(block.timestamp + 60 days + 14 days)); // cert validity + grace
        vm.stopPrank();

        assertEq(reserveVault.getReserveBalance(), RESERVE_AMOUNT);
        assertTrue(reserveVault.isLocked());
        assertTrue(reserveVault.isAdequate(CONTAINMENT_BOUND, 30000)); // 3x ratio

        // Step 2: Auditor stakes
        vm.startPrank(auditor);
        usdc.approve(address(auditorStaking), AUDITOR_STAKE);
        auditorStaking.stake(certHash, AUDITOR_STAKE);
        vm.stopPrank();

        assertEq(auditorStaking.getStake(auditor, certHash), AUDITOR_STAKE);

        // Step 3: Operator publishes certificate (with auditor attestation)
        bytes memory operatorSig = _sign(operatorPk, certHash);
        bytes memory auditorSig = _sign(auditorPk, certHash);
        bytes[] memory attestorSigs = new bytes[](1);
        attestorSigs[0] = auditorSig;

        CCPRegistry.PublishParams memory params = CCPRegistry.PublishParams({
            certHash: certHash,
            agent: agentAddr,
            certificateClass: ICCPRegistry.CertificateClass.C2,
            expiresAt: uint48(block.timestamp + 60 days),
            containmentBound: CONTAINMENT_BOUND,
            reserveVault: address(reserveVault),
            spendingLimit: address(spendingLimit),
            ipfsUri: "ipfs://QmTestCertificate"
        });

        vm.prank(operator);
        registry.publish(params, operatorSig, attestorSigs);

        // Verify certificate is active
        assertTrue(registry.isValid(certHash));
        assertEq(registry.getActiveCertificate(agentAddr), certHash);
        assertEq(registry.getAuditorAttestationCount(auditor), 1);

        // Step 4: Counterparty verifies certificate
        (bool acceptable, bytes32 foundCert) =
            registry.verify(agentAddr, ICCPRegistry.CertificateClass.C1, 100_000e6);
        assertTrue(acceptable);
        assertEq(foundCert, certHash);

        // Step 5: Agent executes small payment (below cosign threshold)
        vm.startPrank(agentAddr);
        usdc.transfer(address(spendingLimit), 10_000e6); // Fund the spending limit contract
        spendingLimit.execute(counterparty, 500e6, ""); // $500 payment
        vm.stopPrank();

        (uint128 spent, uint128 limit,) = spendingLimit.getSpentInPeriod();
        assertEq(spent, 500e6);
        assertEq(limit, MAX_PERIODIC_LOSS);

        // Step 6: Agent executes large payment (needs Ledger co-sign)
        bytes memory ledgerSig = _signTx(ledgerPk, counterparty, 7_000e6);

        vm.prank(agentAddr);
        spendingLimit.executeWithCosign(counterparty, 7_000e6, "", ledgerSig);

        (spent,,) = spendingLimit.getSpentInPeriod();
        assertEq(spent, 7_500e6); // 500 + 7000

        // Step 7: Agent tries to exceed periodic limit (BLOCKED)
        ledgerSig = _signTx(ledgerPk, counterparty, 45_000e6);

        vm.prank(agentAddr);
        vm.expectRevert(); // ExceedsPeriodicLimit
        spendingLimit.executeWithCosign(counterparty, 45_000e6, "", ledgerSig);
    }

    // ─── Challenge: Reserve Shortfall ───

    function test_challengeReserveShortfall() public {
        // Setup: publish certificate
        _publishTestCertificate();

        // Simulate reserve shortfall: operator somehow got funds out
        // (In reality this shouldn't happen with proper lock, but we test the challenge path)
        // We'll create a vault where statedAmount > actual balance
        // For test: we set statedAmount high but don't deposit enough

        // Submit challenge
        vm.startPrank(challenger);
        usdc.approve(address(challengeManager), 200e6);
        uint256 challengeId =
            challengeManager.challenge(certHash, IChallengeManager.ChallengeType.RESERVE_SHORTFALL, abi.encode(200_000e6) // claim stated amount is 200k but vault has 150k
        );
        vm.stopPrank();

        // Certificate should be CHALLENGED
        ICCPRegistry.CertificateRecord memory cert = registry.getCertificate(certHash);
        assertEq(uint8(cert.status), uint8(ICCPRegistry.Status.CHALLENGED));

        // Auto-resolve: vault has 150k < stated 200k → upheld
        challengeManager.resolveAuto(challengeId);

        // Verify results
        IChallengeManager.ChallengeRecord memory c = challengeManager.getChallenge(challengeId);
        assertEq(uint8(c.status), uint8(IChallengeManager.ChallengeStatus.UPHELD));

        // Certificate should be revoked
        assertFalse(registry.isValid(certHash));

        // Auditor stake should be slashed
        assertEq(auditorStaking.getStake(auditor, certHash), 0);

        // Auditor record should show 1 successful challenge
        IAuditorStaking.AuditorRecord memory record = auditorStaking.getAuditorRecord(auditor);
        assertEq(record.successfulChallenges, 1);
    }

    // ─── Challenge: Rejected (frivolous) ───

    function test_challengeRejected() public {
        _publishTestCertificate();

        // Submit frivolous challenge: claim reserve is 100k but vault actually has 150k
        vm.startPrank(challenger);
        usdc.approve(address(challengeManager), 200e6);
        uint256 challengeId = challengeManager.challenge(
            certHash,
            IChallengeManager.ChallengeType.RESERVE_SHORTFALL,
            abi.encode(100_000e6) // claim stated is 100k, vault has 150k → not a shortfall
        );
        vm.stopPrank();

        // Auto-resolve: vault has 150k >= stated 100k → rejected
        challengeManager.resolveAuto(challengeId);

        IChallengeManager.ChallengeRecord memory c = challengeManager.getChallenge(challengeId);
        assertEq(uint8(c.status), uint8(IChallengeManager.ChallengeStatus.REJECTED));

        // Certificate should be restored to ACTIVE
        assertTrue(registry.isValid(certHash));

        // Challenger bond forfeited
        // Auditor stake intact
        assertEq(auditorStaking.getStake(auditor, certHash), AUDITOR_STAKE);
    }

    // ─── SpendingLimit: Cosign Required ───

    function test_cosignRequired() public {
        vm.startPrank(agentAddr);
        usdc.transfer(address(spendingLimit), 50_000e6);

        // Try to spend above cosign threshold without Ledger
        vm.expectRevert();
        spendingLimit.execute(counterparty, 6_000e6, ""); // 6k > 5k threshold
        vm.stopPrank();
    }

    // ─── SpendingLimit: Only Ledger can change params ───

    function test_onlyLedgerCanChangeParams() public {
        // Agent cannot change limits
        vm.prank(agentAddr);
        vm.expectRevert();
        spendingLimit.updateMaxSingleAction(999_999e6);

        // Operator cannot change limits
        vm.prank(operator);
        vm.expectRevert();
        spendingLimit.updateMaxSingleAction(999_999e6);

        // Ledger CAN change limits
        vm.prank(ledger);
        spendingLimit.updateMaxSingleAction(20_000e6);
        assertEq(spendingLimit.maxSingleAction(), 20_000e6);
    }

    // ─── Registry: Verify rejects insufficient class ───

    function test_verifyRejectsInsufficientClass() public {
        _publishTestCertificate();

        // Request C3 but cert is C2
        (bool acceptable,) = registry.verify(agentAddr, ICCPRegistry.CertificateClass.C3, 100_000e6);
        assertFalse(acceptable);
    }

    // ─── Registry: Expired certificate ───

    function test_expiredCertificate() public {
        _publishTestCertificate();
        assertTrue(registry.isValid(certHash));

        // Warp past expiry
        vm.warp(block.timestamp + 61 days);
        assertFalse(registry.isValid(certHash));
    }

    // ─── SpendingLimit: Period reset ───

    function test_periodReset() public {
        vm.startPrank(agentAddr);
        usdc.transfer(address(spendingLimit), 100_000e6);

        // Spend 40k in period 1
        spendingLimit.execute(counterparty, 4_000e6, "");
        (uint128 spent,,) = spendingLimit.getSpentInPeriod();
        assertEq(spent, 4_000e6);

        // Warp to next period
        vm.warp(block.timestamp + 1 days + 1);

        // Spent should reset
        assertEq(spendingLimit.getRemainingAllowance(), MAX_PERIODIC_LOSS);
        vm.stopPrank();
    }

    // ─── Fee Escrow: Release after clean expiry ───

    function test_feeEscrowRelease() public {
        _publishTestCertificate();

        // Operator deposits fee
        uint256 fee = 40_000e6;
        vm.startPrank(operator);
        usdc.approve(address(feeEscrow), fee);
        feeEscrow.deposit(certHash, auditor, fee, uint48(block.timestamp + 60 days + 14 days));
        vm.stopPrank();

        // Can't release yet
        vm.expectRevert();
        feeEscrow.release(certHash);

        // Warp past release time
        vm.warp(block.timestamp + 75 days);
        feeEscrow.release(certHash);

        // Auditor received fee
        assertGt(usdc.balanceOf(auditor), 0);
    }

    // ─── Helpers ───

    function _publishTestCertificate() internal {
        // Operator deposits reserve
        vm.startPrank(operator);
        usdc.approve(address(reserveVault), RESERVE_AMOUNT);
        reserveVault.deposit(RESERVE_AMOUNT);
        reserveVault.lock(uint48(block.timestamp + 60 days + 14 days));
        vm.stopPrank();

        // Auditor stakes
        vm.startPrank(auditor);
        usdc.approve(address(auditorStaking), AUDITOR_STAKE);
        auditorStaking.stake(certHash, AUDITOR_STAKE);
        vm.stopPrank();

        // Publish
        bytes memory operatorSig = _sign(operatorPk, certHash);
        bytes[] memory attestorSigs = new bytes[](1);
        attestorSigs[0] = _sign(auditorPk, certHash);

        CCPRegistry.PublishParams memory params = CCPRegistry.PublishParams({
            certHash: certHash,
            agent: agentAddr,
            certificateClass: ICCPRegistry.CertificateClass.C2,
            expiresAt: uint48(block.timestamp + 60 days),
            containmentBound: CONTAINMENT_BOUND,
            reserveVault: address(reserveVault),
            spendingLimit: address(spendingLimit),
            ipfsUri: "ipfs://QmTestCertificate"
        });

        vm.prank(operator);
        registry.publish(params, operatorSig, attestorSigs);
    }

    function _sign(uint256 pk, bytes32 hash) internal pure returns (bytes memory) {
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    function _signTx(uint256 pk, address to, uint256 value) internal view returns (bytes memory) {
        bytes32 txHash = keccak256(abi.encodePacked(to, value, block.chainid, address(spendingLimit)));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", txHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }
}
