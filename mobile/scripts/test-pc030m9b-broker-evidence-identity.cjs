const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const babel = require("@babel/core");

const path = "src/features/broker-sync/brokerEvidenceIdentityService.js";
const source = fs.readFileSync(path, "utf8");
const compiled = babel.transformSync(source, {
  filename: path,
  babelrc: false,
  configFile: false,
  plugins: [require.resolve("@babel/plugin-transform-modules-commonjs")]
}).code;
const moduleBox = { exports: {} };
vm.runInNewContext(compiled, {
  module: moduleBox,
  exports: moduleBox.exports,
  require(request) {
    if (request === "../../auth/userStorage") return { userGetItem: async () => null };
    if (request.includes("@babel/runtime")) return require(request);
    throw new Error(`Unexpected dependency: ${request}`);
  }
});
const service = moduleBox.exports;

assert.equal(service.extractBrokerFileIdentifier("portfolio-valuation-equity-52470471(5).csv"), "52470471");
assert.equal(service.extractBrokerFileIdentifier("statement-equity-52470471.csv"), "52470471");
assert.equal(service.buildBrokerAccountKey({ brokerId: "aib", tradingAccount: "ACC-1" }), "AIB|ACC-1");
assert.equal(service.buildBrokerAccountKey({ brokerId: "aib", clientAccount: "137971" }), "AIB|137971");

const accepted = service.validateBrokerEvidenceIdentity({
  fileName: "portfolio-valuation-equity-52470471(5).csv",
  userCds: "52470471",
  brokerId: "AIB",
  tradingAccount: "TRADING-001"
});
assert.equal(accepted.ok, true);
assert.equal(accepted.identityStatus, "VERIFIED");

const otherInvestor = service.validateBrokerEvidenceIdentity({
  fileName: "portfolio-valuation-equity-52730627.csv",
  userCds: "52470471",
  brokerId: "AIB",
  tradingAccount: "TRADING-001"
});
assert.equal(otherInvestor.ok, false);
assert.ok(otherInvestor.errors.some((message) => message.includes("different CDS")));

const wrongAccount = service.validateBrokerEvidenceIdentity({
  fileName: "statement-equity-52470471.csv",
  userCds: "52470471",
  brokerId: "AIB",
  clientAccount: "137971",
  internalIdentity: { tradingAccount: "52470471", clientCode: "999999" }
});
assert.equal(wrongAccount.ok, false);

const matchingStatement = service.validateBrokerEvidenceIdentity({
  fileName: "statement-equity-52470471.csv",
  userCds: "52470471",
  brokerId: "AIB",
  clientAccount: "137971",
  internalIdentity: { tradingAccount: "52470471", clientCode: "137971" }
});
assert.equal(matchingStatement.ok, true);

const statement = service.extractStatementIdentity([
  { Description: "Maintenance fee Acc. 123456 Client: 137971" }
]);
assert.equal(statement.tradingAccount, "123456");
assert.equal(statement.clientCode, "137971");

const order = service.extractOrderHistoryIdentity([{
  "Member Code": "B12",
  "Trading Account": "123456",
  "Client Code": "137971",
  "Client Name": "Investor One"
}]);
assert.equal(order.brokerId, "B12");
assert.equal(order.tradingAccount, "123456");

console.log("PASS — filename suffix identifies the user CDS and duplicate download suffixes are ignored.");
console.log("PASS — different CDS files are rejected as another investor.");
console.log("PASS — broker plus client account creates the account-specific evidence key.");
console.log("PASS — statement CDS and client account are validated against the correct identities.");
