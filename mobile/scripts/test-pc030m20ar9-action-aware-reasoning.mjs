import { buildAccommodationAnalysis, buildAlternativeComparison } from "../src/features/trading/coachGDecisionAccommodationService.js";
import { buildAccommodationDialogue, buildAlternativeDialogue } from "../src/features/trading/coachGDecisionDialogueService.js";
const holdings=[
 {symbol:"SCOM",sector:"Telecom",currentValue:180000,quantity:4000},
 {symbol:"KCB",sector:"Banking",currentValue:220000},
 {symbol:"EQT",sector:"Banking",currentValue:180000},
 {symbol:"JUB",sector:"Insurance",currentValue:120000}
];
const buy=buildAccommodationAnalysis({scenario:{security:"SCOM",action:"BUY",amount:50000},holdings,proposedSector:"Telecom"});
if(!(buy.sectorImpact.projectedSectorWeight>buy.sectorImpact.currentSectorWeight)) throw new Error("BUY must increase modeled Telecom exposure in this fixture");
const buyTalk=buildAccommodationDialogue(buy);
if(!/adding more Telecom exposure/i.test(buyTalk.question)) throw new Error("BUY path should retain accommodation language");
const sell=buildAccommodationAnalysis({scenario:{security:"SCOM",action:"SELL",amount:50000},holdings,proposedSector:"Telecom"});
if(!sell.isSell) throw new Error("SELL must use action-aware reduction path");
if(!(sell.sectorImpact.projectedSectorWeight<sell.sectorImpact.currentSectorWeight)) throw new Error("SELL must reduce modeled Telecom exposure");
const sellTalk=buildAccommodationDialogue(sell);
const sellText=`${sellTalk.text} ${sellTalk.question}`;
if(/adding more|accommodate SCOM/i.test(sellText)) throw new Error("SELL must never emit BUY/add-more accommodation language");
if(!/released cash/i.test(sellText)) throw new Error("SELL follow-up must ask about released cash");
const sellOptions=buildAlternativeComparison({analysis:sell});
if(!sellOptions.some(x=>x.id==="KEEP_LIQUIDITY")) throw new Error("SELL must offer liquidity option");
if(sellOptions.some(x=>x.id==="ROTATE_WITHIN_SECTOR")) throw new Error("SELL must not reuse BUY same-sector accommodation option");
const altTalk=buildAlternativeDialogue(sell);
if(!/released cash/i.test(`${altTalk.text} ${altTalk.question}`)) throw new Error("SELL alternative dialogue must remain action-aware");
if(sell.realPortfolioMutationAllowed!==false || sell.practicePortfolioMutationAllowed!==false || sell.investorDNAMutationAllowed!==false) throw new Error("SELL reasoning must remain advisory/read-only");
console.log("PASS — BUY and SELL use distinct Coach G reasoning paths.");
console.log("PASS — SELL reduces modeled sector exposure and cannot say 'adding more exposure'.");
console.log("PASS — SELL asks what released cash should accomplish instead of offering BUY accommodation language.");
console.log("PASS — SELL alternatives are liquidity/goal/reinvestment choices, not silent same-sector sales.");
console.log("PASS — detailed SELL cost/WAP/P&L remains outside this preliminary fit model and therefore stays FIFO-evidence gated downstream.");
