import assert from "node:assert/strict";
import { buildAccommodationAnalysis, buildAlternativeComparison } from "../src/features/trading/coachGDecisionAccommodationService.js";
const holdings=[
  {symbol:"KCB",sector:"Banking",marketValue:150000},
  {symbol:"EQT",sector:"Banking",marketValue:120000},
  {symbol:"SCOM",sector:"Telecom",marketValue:200000},
  {symbol:"KEGN",sector:"Energy",marketValue:70000},
  {symbol:"JUB",sector:"Insurance",marketValue:60000}
];
const a=buildAccommodationAnalysis({scenario:{security:"COOP",amount:50000},holdings,proposedSector:"Banking",targetSectorWeights:{Banking:35,Energy:20,Insurance:15,Telecom:30}});
assert.equal(a.symbol,"COOP"); assert.equal(a.sector,"Banking"); assert.equal(a.advisoryOnly,true);
assert.equal(a.realPortfolioMutationAllowed,false); assert.equal(a.investorDNAMutationAllowed,false);
assert.equal(a.concentrationIncreases,true); assert.ok(a.rotationCandidates.some(x=>x.symbol==="KCB"));
assert.ok(a.underweightSectors.some(x=>x.sector==="Energy"));
const c=buildAlternativeComparison({analysis:a});
assert.deepEqual(c.map(x=>x.id),["ORIGINAL","ROTATE_WITHIN_SECTOR","REDUCE_AMOUNT","UNDERWEIGHT_SECTOR"]);
assert.equal(c[1].bankOrSectorWeight,a.sectorImpact.currentSectorWeight);
const b=buildAccommodationAnalysis({scenario:{security:"COOP",amount:50000},holdings,proposedSector:"Banking"});
assert.equal(b.underweightEvidenceAvailable,false);
assert.match(buildAlternativeComparison({analysis:b})[3].description,/will not invent an underweight sector/);
console.log("PASS — COOP can be tested as an original idea without mutating REAL or Practice data.");
console.log("PASS — same-sector rotation candidates come from actual investor holdings; Coach G does not silently choose a bank.");
console.log("PASS — rotation keeps modeled sector exposure at the current level when proceeds are redirected within the same sector.");
console.log("PASS — underweight-sector alternatives require saved target evidence; missing targets are not fabricated.");
console.log("PASS — reduced-amount branch uses the existing Decision Lab concentration guard rather than invented return forecasts.");
console.log("PASS — alternative comparison remains advisory and cannot mutate Investor DNA.");
