// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {CCPRegistry} from "../src/CCPRegistry.sol";
import {AuditorStaking} from "../src/AuditorStaking.sol";
import {ReserveVault} from "../src/ReserveVault.sol";
import {SpendingLimit} from "../src/SpendingLimit.sol";
import {FeeEscrow} from "../src/FeeEscrow.sol";
import {ChallengeManager} from "../src/ChallengeManager.sol";

contract DeployMockUSDC is Script {
    function run() external {
        vm.startBroadcast();
        // Deploy a simple ERC20 mock for USDC on testnet
        MockUSDC usdc = new MockUSDC();
        vm.stopBroadcast();
        console.log("MockUSDC:", address(usdc));
    }
}

contract DeployAll is Script {
    function run() external {
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        address agent = vm.envAddress("AGENT_ADDRESS");
        address ledger = vm.envAddress("LEDGER_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast();

        // 1. Deploy AuditorStaking
        AuditorStaking auditorStaking = new AuditorStaking(usdc);
        console.log("AuditorStaking:", address(auditorStaking));

        // 2. Deploy CCPRegistry
        CCPRegistry registry = new CCPRegistry(address(auditorStaking));
        console.log("CCPRegistry:", address(registry));

        // 3. Deploy FeeEscrow
        FeeEscrow feeEscrow = new FeeEscrow(usdc);
        console.log("FeeEscrow:", address(feeEscrow));

        // 4. Deploy ChallengeManager
        ChallengeManager challengeManager =
            new ChallengeManager(address(registry), address(auditorStaking), usdc, address(feeEscrow));
        console.log("ChallengeManager:", address(challengeManager));

        // 5. Wire contracts together
        auditorStaking.setRegistry(address(registry));
        auditorStaking.setChallengeManager(address(challengeManager));
        registry.setChallengeManager(address(challengeManager));
        feeEscrow.setChallengeManager(address(challengeManager));

        // 6. Deploy ReserveVault (operator-owned)
        ReserveVault reserveVault = new ReserveVault(usdc, operator);
        console.log("ReserveVault:", address(reserveVault));

        // 7. Deploy SpendingLimit (agent containment with Ledger co-sign)
        SpendingLimit spendingLimit = new SpendingLimit(
            agent,
            ledger,
            usdc,
            10_000e6, // maxSingleAction: $10k
            50_000e6, // maxPeriodicLoss: $50k
            1 days, // periodDuration
            5_000e6 // cosignThreshold: $5k (above this, Ledger must co-sign)
        );
        console.log("SpendingLimit:", address(spendingLimit));

        vm.stopBroadcast();
    }
}

// Minimal ERC20 mock for testnet deployment
contract MockUSDC {
    string public constant name = "USD Coin (Test)";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient");
        require(allowance[from][msg.sender] >= amount, "allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
