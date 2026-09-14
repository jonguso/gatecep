import * as simulationBrokerAdapter from "./simulationBrokerAdapter";
import * as aibAdapter from "./aibAdapter";
import * as abcAdapter from "./abcAdapter";
import * as ncbaAdapter from "./ncbaAdapter";
import * as faidaAdapter from "./faidaAdapter";
import * as genghisAdapter from "./genghisAdapter";
import { findBrokerById } from "./brokerRegistry";

const ADAPTERS = {
  simulation: simulationBrokerAdapter,
  aib: aibAdapter,
  abc: abcAdapter,
  ncba: ncbaAdapter,
  faida: faidaAdapter,
  genghis: genghisAdapter
};

export function getBrokerAdapter(brokerId = "GATECEP_PRACTICE") {
  const broker = findBrokerById(brokerId);
  return ADAPTERS[broker.adapter] || simulationBrokerAdapter;
}

export async function placeBrokerOrder(order = {}) {
  const adapter = getBrokerAdapter(order.brokerId || "GATECEP_PRACTICE");
  return await adapter.placeOrder(order);
}

export async function cancelBrokerOrder(order = {}) {
  const adapter = getBrokerAdapter(order.brokerId || "GATECEP_PRACTICE");
  return await adapter.cancelOrder(order);
}

export async function getBrokerOrderStatus(order = {}) {
  const adapter = getBrokerAdapter(order.brokerId || "GATECEP_PRACTICE");
  return await adapter.getOrderStatus(order);
}

export async function getBrokerPortfolio(brokerId = "GATECEP_PRACTICE") {
  const adapter = getBrokerAdapter(brokerId);
  return await adapter.getPortfolio();
}

export async function getBrokerCashBalance(brokerId = "GATECEP_PRACTICE") {
  const adapter = getBrokerAdapter(brokerId);
  return await adapter.getCashBalance();
}