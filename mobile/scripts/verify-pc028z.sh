#!/usr/bin/env bash
set -e

cd ~/gatecep/mobile

echo "===== PC-028Z ENGINE ====="
grep -n   "buildInvestorDNAReviewFields\|updateDNAReviewFieldProposal\|confirmDNAReviewField\|buildConfirmedInvestorDNAUpdateInstruction"   src/features/wealth-journey/investorDNAReviewConfirmationEngine.js

echo
echo "===== PC-028Z STORE ====="
grep -n   "loadInvestorDNAUpdateConfirmations\|saveInvestorDNAUpdateConfirmation"   src/features/wealth-journey/investorDNAUpdateConfirmationStore.js

echo
echo "===== PC-028Z SERVICE ====="
grep -n   "loadCurrentInvestorDNAReview\|proposeInvestorDNAReviewField\|confirmInvestorDNAReviewField\|submitInvestorDNAReviewConfirmation"   src/features/wealth-journey/investorDNAReviewConfirmationService.js

echo
echo "===== PC-028Z SCREEN ====="
grep -n   "InvestorDNAReviewScreen\|Confirm Investor DNA Review\|EXPLICIT REVIEW REQUIRED"   app/dna-update-review.js

echo
echo "===== RECONCILIATION SCREEN LINK ====="
grep -n   "dna-update-review\|Review Investor DNA Changes"   app/reconciliation-conversation.js

echo
echo "===== SAFEGUARDS ====="
grep -n   "automaticDNAChange\|fieldLevelConfirmation\|practiceEvidenceUsed\|tradesPlaced"   src/features/wealth-journey/investorDNAReviewConfirmationEngine.js

echo
echo "===== SYNTAX ====="
node --check src/features/wealth-journey/investorDNAReviewConfirmationEngine.js
node --check src/features/wealth-journey/investorDNAUpdateConfirmationStore.js
node --check src/features/wealth-journey/investorDNAReviewConfirmationService.js
node --check app/dna-update-review.js
node --check app/reconciliation-conversation.js

echo
echo "PC-028Z verification complete."
