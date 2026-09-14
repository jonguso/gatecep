export const BROKER_REGISTRY = [
  {
    id: "GATECEP_PRACTICE",
    name: "GateCEP Broker",
    shortName: "GateCEP",
    adapter: "simulation",
    status: "ACTIVE",
    apiMode: "PRACTICE",
    bestFor: "Learning GateCEP before live investing"
  },
  {
    id: "AIB",
    name: "AIB-AXYS",
    shortName: "AIB",
    adapter: "aib",
    status: "PENDING_API",
    apiMode: "MANUAL_CONFIRMATION",
    bestFor: "All-round NSE execution"
  },
  {
    id: "ABC",
    name: "ABC Capital",
    shortName: "ABC",
    adapter: "abc",
    status: "PENDING_API",
    apiMode: "MANUAL_CONFIRMATION",
    bestFor: "Digital onboarding and research"
  },
  {
    id: "NCBA",
    name: "NCBA Investment Bank",
    shortName: "NCBA",
    adapter: "ncba",
    status: "PENDING_API",
    apiMode: "MANUAL_CONFIRMATION",
    bestFor: "Banking integration"
  },
  {
    id: "FAIDA",
    name: "Faida Investment Bank",
    shortName: "Faida",
    adapter: "faida",
    status: "PENDING_API",
    apiMode: "MANUAL_CONFIRMATION",
    bestFor: "Retail investor access"
  },
  {
    id: "GENGHIS",
    name: "Genghis Capital",
    shortName: "Genghis",
    adapter: "genghis",
    status: "PENDING_API",
    apiMode: "MANUAL_CONFIRMATION",
    bestFor: "Digital-first investors"
  }
];

export function findBrokerById(id = "GATECEP_PRACTICE") {
  const raw = String(id || "").trim().toUpperCase();

  const canonicalId = [
    "SIM",
    "GATECEP-DEMO",
    "GATECEP DEMO",
    "GATECEP_PRACTICE",
    "GATECEP PRACTICE",
    "GATECEP BROKER",
    "SIMULATION BROKER"
  ].includes(raw)
    ? "GATECEP_PRACTICE"
    : raw;

  return (
    BROKER_REGISTRY.find(
      (broker) => String(broker.id).toUpperCase() === canonicalId
    ) || BROKER_REGISTRY[0]
  );
}