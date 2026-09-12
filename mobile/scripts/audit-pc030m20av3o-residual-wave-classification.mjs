import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();

const TARGETS = [
  "app/alerts.js",
  "app/analysis-ready.js",
  "app/behavior-analytics.js",
  "app/corporate-actions.js",
  "app/dividend-center.js",
  "app/dna-update-review.js",
  "app/execution-audit.js",
  "app/execution-bridge.js",
  "app/execution-wizard.js",
  "app/existing-portal.js",
  "app/goal-details-edit.js",
  "app/goal-recovery-options.js",
  "app/import-portfolio.js",
  "app/index.js",
  "app/investor-alert-review.js",
  "app/investor-home.js",
  "app/investor-profile-edit.js",
  "app/investor-timeline.js",
  "app/link-broker-account.js",
  "app/live-dashboard.js",
  "app/manual-portfolio-entry.js",
  "app/monthly-review.js",
  "app/my-profile.js",
  "app/order-handoff.js",
  "app/orders-review.js",
  "app/orders.js",
  "app/portfolio-activity.js",
  "app/portfolio-simulator.js",
  "app/progress.js",
  "app/queue-manager.js",
  "app/recommendation-history.js",
  "app/reconciliation-center.js",
  "app/reconciliation-conversation.js",
  "app/review-portfolio-import.js",
  "app/security/[symbol].js",
  "app/storage-debug.js",
  "app/trade-basket.js",
  "app/trade.js",
  "app/transaction-import.js",
  "app/version-center.js",
];

const mutating = /\b(save|update|delete|remove|add|create|execute|submit|confirm|commit|import|reconcile|sync|trade|order|withdraw|deposit|approve|reject|clear|reset|persist|write|set[A-Z]\w*)\w*\s*\(/g;
const routeCall = /router\.(?:push|replace|back)\s*\([^)]*\)/g;
const importLine = /^import .*$/gm;
const componentUse = /\b(ScrollView|FlatList|SectionList|MobileScreen|StickyActionBar|SafeAreaView)\b/g;
const contentStyle = /content\s*:\s*\{[\s\S]{0,500}?\}/g;
const buttonWords = /\b(Buy|Sell|Trade|Import|Confirm|Approve|Submit|Execute|Connect|Disconnect|Delete|Save|Update|Reconcile|Upload|Retry)\b/gi;

function uniq(xs){ return [...new Set(xs)]; }

function classify(rel, src){
  const r=rel.toLowerCase();

  if (/storage-debug|version-center/.test(r)) return "DEV_ADMIN_UTILITY";
  if (/trade|order|execution|import|reconciliation|link-broker|manual-portfolio-entry/.test(r))
    return "CONSEQUENTIAL_WORKFLOW";
  if (/profile-edit|goal-details-edit|goal-recovery-options/.test(r))
    return "EDIT_OR_PLANNING";
  if (/alerts|analysis-ready|behavior-analytics|corporate-actions|dividend-center|investor-timeline|monthly-review|recommendation-history|portfolio-activity|progress|security\/|live-dashboard|investor-home/.test(r))
    return "READ_MOSTLY_INVESTOR";
  return "GENERAL_INVESTOR";
}

function risk(src, category){
  let score=0;
  const reasons=[];
  if (category==="CONSEQUENTIAL_WORKFLOW"){ score+=4; reasons.push("consequential workflow filename"); }
  if (/\bexecute\w*\s*\(/.test(src)){ score+=3; reasons.push("execute* call"); }
  if (/\b(save|update|delete|remove|add|create|submit|confirm|approve|reject|import|sync|reconcile)\w*\s*\(/.test(src)){
    score+=2; reasons.push("mutation-like call");
  }
  if (/AsyncStorage\.(setItem|removeItem|clear)/.test(src)){ score+=2; reasons.push("storage mutation"); }
  if (/REAL|canonical|broker|portfolio|cash|ledger|holding|order|trade/i.test(src)){ score+=1; reasons.push("financial/portfolio boundary terms"); }
  return {score, level: score>=6?"HIGH":score>=3?"MEDIUM":"LOW", reasons};
}

function styleFacts(src){
  const oneLine=/content\s*:\s*\{[^\n}]*\}/.exec(src)?.[0] || null;
  const multi=/content\s*:\s*\{[\s\S]{0,700}?\}/.exec(src)?.[0] || null;
  const candidate=oneLine || multi || "";
  return {
    hasContentStyle: !!candidate,
    contentPreview: candidate.replace(/\s+/g," ").slice(0,260),
    hasPaddingBottom: /paddingBottom\s*:/.test(candidate),
    hasPaddingTop70: /paddingTop\s*:\s*70/.test(candidate),
    hasPadding22: /padding\s*:\s*22/.test(candidate),
    hasStylesheet: /StyleSheet\.create/.test(src),
  };
}

const report=[];
const json=[];

for (const rel of TARGETS) {
  const abs=path.join(ROOT,rel);
  if (!fs.existsSync(abs)) {
    report.push(`MISSING :: ${rel}`);
    json.push({rel,missing:true});
    continue;
  }

  const src=fs.readFileSync(abs,"utf8");
  const category=classify(rel,src);
  const r=risk(src,category);
  const styles=styleFacts(src);
  const routes=uniq(src.match(routeCall)||[]).slice(0,12);
  const imports=uniq(src.match(importLine)||[]).filter(x=>/services|features|store|engine|ledger|broker|portfolio|trade|reconcil|goal|coach/i.test(x)).slice(0,12);
  const components=uniq(src.match(componentUse)||[]);
  const mutations=uniq(src.match(mutating)||[]).slice(0,16);
  const buttonText=uniq((src.match(buttonWords)||[]).map(x=>x.toUpperCase())).slice(0,14);

  const rec = {
    rel, category, risk:r, styles, routes, imports, components, mutations, buttonText,
    lineCount:src.split(/\r?\n/).length,
  };
  json.push(rec);

  report.push(`=== ${rel} ===`);
  report.push(`CATEGORY: ${category}`);
  report.push(`RISK: ${r.level} (${r.score})${r.reasons.length?` — ${r.reasons.join("; ")}`:""}`);
  report.push(`LINES: ${rec.lineCount}`);
  report.push(`COMPONENTS: ${components.join(", ") || "none detected"}`);
  report.push(`CONTENT STYLE: ${styles.contentPreview || "none detected"}`);
  report.push(`ROUTES: ${routes.join(" | ") || "none detected"}`);
  report.push(`MUTATION-LIKE CALLS: ${mutations.join(" | ") || "none detected"}`);
  report.push(`BOUNDARY IMPORTS: ${imports.join(" | ") || "none detected"}`);
  report.push(`ACTION WORDS: ${buttonText.join(", ") || "none detected"}`);
  report.push("");
}

const groups = {};
for (const x of json.filter(x=>!x.missing)) {
  groups[x.category] ||= [];
  groups[x.category].push(x.rel);
}

const summary=[];
summary.push("PC-030M20AV3O — Residual Screen Discovery & Wave Classification");
summary.push("");
for (const [k,v] of Object.entries(groups)) {
  summary.push(`${k}: ${v.length}`);
  for (const f of v) summary.push(`  - ${f}`);
}
summary.push("");
summary.push("Risk counts:");
for (const lvl of ["LOW","MEDIUM","HIGH"]) {
  const xs=json.filter(x=>x.risk?.level===lvl);
  summary.push(`${lvl}: ${xs.length}`);
  for (const x of xs) summary.push(`  - ${x.rel}`);
}
summary.push("");
summary.push("Recommendation:");
summary.push("- Patch READ_MOSTLY_INVESTOR low/medium-risk screens first.");
summary.push("- Keep CONSEQUENTIAL_WORKFLOW screens in separate contract-verified waves.");
summary.push("- Keep DEV_ADMIN_UTILITY screens separate from investor UAT.");
summary.push("- Do not patch auth/onboarding/setup in this residual series.");

const full=summary.join("\n")+"\n\n"+report.join("\n");
console.log(full);
fs.writeFileSync(".pc030m20av3o-residual-discovery.txt",full+"\n","utf8");
fs.writeFileSync(".pc030m20av3o-residual-discovery.json",JSON.stringify({groups, screens:json},null,2)+"\n","utf8");
