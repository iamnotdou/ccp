// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISpendingLimit {
    event TransactionExecuted(address indexed agent, address indexed to, uint256 value, bool ledgerCosigned);
    event TransactionBlocked(address indexed agent, uint256 value, string reason);
    event PeriodReset(uint48 newPeriodStart);

    function execute(address to, uint256 value, bytes calldata data) external returns (bool);

    function executeWithCosign(address to, uint256 value, bytes calldata data, bytes calldata ledgerSignature)
        external
        returns (bool);

    function getRemainingAllowance() external view returns (uint128);

    function getSpentInPeriod() external view returns (uint128 spent, uint128 limit, uint48 periodEnd);
}
