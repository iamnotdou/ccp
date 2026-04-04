import { type Address } from "viem";

/**
 * ENS Subname Management for Agent Fleets
 *
 * An operator who owns `operator.eth` creates subnames for each agent:
 *   alpha.operator.eth → agent 1 address
 *   beta.operator.eth  → agent 2 address
 *
 * Each subname carries CCP text records (certificate hash, class, bound).
 *
 * In production: uses ENS NameWrapper or operator's resolver contract.
 * For hackathon: documents the flow and provides the data model.
 *
 * ENS subname registration requires an on-chain transaction on Ethereum/Sepolia.
 * This module provides the data structure; the actual registration is done via
 * the ENS app or direct contract interaction during setup.
 */

export interface AgentSubname {
  label: string; // "alpha"
  fullName: string; // "alpha.operator.eth"
  agentAddress: Address;
  textRecords: Record<string, string>;
}

/**
 * Build the subname registration data for an agent fleet.
 * This returns the data needed to register subnames via ENS contracts.
 */
export function buildFleetSubnames(
  operatorName: string,
  agents: Array<{
    label: string;
    address: Address;
    certHash: string;
    certClass: string;
    containmentBound: string;
    chainId: string;
    registryAddress: string;
  }>
): AgentSubname[] {
  return agents.map((agent) => ({
    label: agent.label,
    fullName: `${agent.label}.${operatorName}`,
    agentAddress: agent.address,
    textRecords: {
      "ccp.certificate": agent.certHash,
      "ccp.class": agent.certClass,
      "ccp.bound": agent.containmentBound,
      "ccp.chain": agent.chainId,
      "ccp.registry": agent.registryAddress,
      "ccp.role": "agent",
    },
  }));
}

/**
 * Build auditor ENS text records.
 */
export function buildAuditorTextRecords(params: {
  specialization: string;
  attestationCount: number;
  challengeCount: number;
  activeStake: string;
  stakingAddress: string;
}): Record<string, string> {
  return {
    "ccp.role": "auditor",
    "ccp.specialization": params.specialization,
    "ccp.attestation_count": params.attestationCount.toString(),
    "ccp.challenge_count": params.challengeCount.toString(),
    "ccp.active_stake": params.activeStake,
    "ccp.staking_address": params.stakingAddress,
  };
}
