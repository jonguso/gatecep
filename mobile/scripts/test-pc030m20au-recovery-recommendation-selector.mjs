import assert from "node:assert/strict";
import {
  buildRecoveryRecommendationChoices,
  buildRecoveryChoiceConversationSeed,
  RECOVERY_RECOMMENDATION_SELECTOR_INTEGRITY
} from "../src/features/trading/recoveryRecommendationSelectorService.js";

const wealthJourney = {
  experience: { journey: { goalAdvice: [{
    progress:{goal:{name:"Family Security"}},
    recovery:{
      recommendedScenarioId:"RECOVERY_ALLOCATION",
      scenarios:[
        {
          id:"RECOVERY_CONTRIBUTION",
          strategy:"INCREASE_CONTRIBUTION",
          title:"Increase monthly contributions",
          description:"Raise the monthly contribution.",
          tradeoff:"Less short-term cash flexibility.",
          feasibility:"MEDIUM",
          coachGQuestion:"Would a higher monthly contribution feel realistic?"
        },
        {
          id:"RECOVERY_ALLOCATION",
          strategy:"IMPROVE_ALLOCATION",
          title:"Improve allocation",
          description:"Reduce concentration and improve allocation.",
          tradeoff:"May require changing current holdings.",
          feasibility:"HIGH",
          coachGQuestion:"Would you like to compare which concentration change has the least impact on your goals?"
        }
      ]
    }
  }]}}
};

const result=buildRecoveryRecommendationChoices({wealthJourney,goalName:"Family Security"});
assert.equal(result.available,true);
assert.equal(result.choices.length,2);
assert.equal(result.choices.filter(x=>x.recommended).length,1);
assert.equal(result.choices.find(x=>x.recommended).id,"RECOVERY_ALLOCATION");
console.log("PASS — selector exposes only actual Wealth Journey recovery scenarios.");

const seed=buildRecoveryChoiceConversationSeed({
  choice:result.choices.find(x=>x.recommended),
  goalName:result.goalName,
  remainingGoalGap:52237.23
});
assert.equal(seed.available,true);
assert.equal(seed.scenario.source,"COACH_G_RECOVERY");
assert.equal(seed.scenario.action,"EXPLORE");
assert.equal(seed.scenario.recommendationContext.strategy,"IMPROVE_ALLOCATION");
assert.match(seed.openingText,/52,237.23/);
assert.match(seed.openingQuestion,/\?$/);
console.log("PASS — selected recovery option becomes conversation context, not a fabricated trade.");

const empty=buildRecoveryRecommendationChoices({
  wealthJourney:{experience:{journey:{goalAdvice:[{
    progress:{goal:{name:"Family Security"}},
    recovery:{scenarios:[]}
  }]}}},
  goalName:"Family Security"
});
assert.equal(empty.available,false);
assert.equal(empty.choices.length,0);
console.log("PASS — no scenarios means no invented recommendation cards.");

assert.equal(RECOVERY_RECOMMENDATION_SELECTOR_INTEGRITY.inventsRecoveryPaths,false);
assert.equal(RECOVERY_RECOMMENDATION_SELECTOR_INTEGRITY.mutatesRealPortfolio,false);
assert.equal(RECOVERY_RECOMMENDATION_SELECTOR_INTEGRITY.mutatesGoals,false);
console.log("PASS — recommendation selector remains evidence-backed and advisory-only.");
