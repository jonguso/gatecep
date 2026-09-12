import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();
const MOBILE=path.join(ROOT,"mobile");
const APP=path.join(MOBILE,"app");
const SRC=path.join(MOBILE,"src");

function walk(dir){
  if(!fs.existsSync(dir)) return [];
  const out=[];
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...walk(full));
    else if(/\.(js|jsx|ts|tsx)$/.test(ent.name)) out.push(full);
  }
  return out;
}
function rel(f){return path.relative(MOBILE,f).replaceAll("\\","/");}
function routeNameFromFile(f){
  if(!f.startsWith(APP)) return null;
  let r=path.relative(APP,f).replaceAll("\\","/");
  r=r.replace(/\.(js|jsx|ts|tsx)$/,"");
  if(r.endsWith("/index")) r=r.slice(0,-6);
  if(r==="index") return "/";
  return "/"+r;
}
function extractRoutes(src){
  const routes=new Set();
  const rx=/["'`](\/(?:\([^"'`]+\)\/)?[A-Za-z0-9_\-\[\]\/]+)(?:\?[^"'`]*)?["'`]/g;
  let m;
  while((m=rx.exec(src))) routes.add(m[1]);
  return [...routes];
}

const appFiles=walk(APP);
const srcFiles=walk(SRC);
const all=[...appFiles,...srcFiles];
const text=new Map(all.map(f=>[f,fs.readFileSync(f,"utf8")]));

const routeToFile=new Map();
for(const f of appFiles){
  const r=routeNameFromFile(f);
  if(r) routeToFile.set(r,f);
}

const edges=new Map();
for(const f of all){
  const found=extractRoutes(text.get(f)).filter(r=>routeToFile.has(r));
  edges.set(f,[...new Set(found)]);
}

// Canonical reachable entry surfaces. These are currently visible/navigation roots,
// not residual candidates. Keeping these explicit makes the audit conservative.
const rootFiles=[
  "app/menu.js",
  "app/(tabs)/dashboard.js",
  "app/(tabs)/coach.js",
  "app/(tabs)/markets.js",
  "app/(tabs)/trading.js",
  "app/(tabs)/funds.js",
  "app/(tabs)/calendar.js",
  "app/(tabs)/news.js",
  "app/investor-home.js",
  "app/my-profile.js",
  "app/portfolio-sync-center.js",
  "app/broker-marketplace.js",
  "app/brokers.js",
  "app/broker-upload.js",
  "app/basket-execution.js",
  "app/coach-insights.js",
  "app/live-dashboard.js",
  "app/order-book.js",
].map(x=>path.join(MOBILE,x)).filter(fs.existsSync);

const componentRoots=[
  "src/components/coach/FloatingCoachG.js",
  "src/features/wealth-journey/components/CoachGReconciliationCard.js",
].map(x=>path.join(MOBILE,x)).filter(fs.existsSync);

const roots=[...rootFiles,...componentRoots];

const reachableRoutes=new Set();
const reachableFiles=new Set(roots);
const queue=[...roots];
while(queue.length){
  const f=queue.shift();
  for(const route of edges.get(f)||[]){
    reachableRoutes.add(route);
    const rf=routeToFile.get(route);
    if(rf && !reachableFiles.has(rf)){
      reachableFiles.add(rf);
      queue.push(rf);
    }
  }
}

const candidates=[
  "/execution-audit","/execution-bridge","/execution-wizard",
  "/import-portfolio","/link-broker-account","/manual-portfolio-entry",
  "/order-handoff","/orders-review","/orders","/reconciliation-center",
  "/reconciliation-conversation","/review-portfolio-import","/trade-basket",
  "/trade","/transaction-import","/storage-debug","/version-center"
];

const rows=[];
for(const route of candidates){
  const f=routeToFile.get(route);
  if(!f){
    rows.push({route,status:"MISSING_FILE",file:null,incoming:[],reachableFromCanonicalRoots:false});
    continue;
  }
  const incoming=[];
  for(const [src,rs] of edges.entries()){
    if(src!==f && rs.includes(route)) incoming.push(rel(src));
  }
  const reachable=reachableRoutes.has(route);
  let status;
  if(reachable) status="CANONICALLY_REACHABLE";
  else if(incoming.length) status="LEGACY_CHAIN_CANDIDATE";
  else status="ORPHAN_LEGACY_CANDIDATE";
  rows.push({
    route,status,file:rel(f),
    reachableFromCanonicalRoots:reachable,
    incoming:[...new Set(incoming)].sort()
  });
}

const lines=[];
lines.push("PC-030M20AV3W1 — Canonical Reachability & Legacy-Chain Audit");
lines.push("");
lines.push("Discovery-only. No application source files are modified.");
lines.push("");
lines.push("Canonical roots:");
for(const f of roots) lines.push(`  - ${rel(f)}`);
lines.push("");
for(const r of rows){
  lines.push(`${r.status} — ${r.route}`);
  lines.push(`  file: ${r.file ?? "missing"}`);
  lines.push(`  reachable from canonical roots: ${r.reachableFromCanonicalRoots ? "YES":"NO"}`);
  if(r.incoming.length){
    lines.push(`  incoming references (${r.incoming.length}):`);
    for(const x of r.incoming) lines.push(`    - ${x}`);
  }else{
    lines.push("  incoming references: none");
  }
}
lines.push("");
lines.push("Interpretation:");
lines.push("- CANONICALLY_REACHABLE: keep in responsive/UAT scope.");
lines.push("- LEGACY_CHAIN_CANDIDATE: referenced only inside a chain not reachable from canonical roots; review before more patching.");
lines.push("- ORPHAN_LEGACY_CANDIDATE: no incoming route references found; review before retention/removal.");
lines.push("- This is static analysis; deep links/external navigation can still make a route reachable.");
lines.push("- No route is deleted or modified by AV3W1.");

const txt=lines.join("\n");
fs.writeFileSync(path.join(MOBILE,".pc030m20av3w1-canonical-reachability-audit.txt"),txt);
fs.writeFileSync(path.join(MOBILE,".pc030m20av3w1-canonical-reachability-audit.json"),JSON.stringify({
  generatedAt:new Date().toISOString(),
  discoveryOnly:true,
  roots:roots.map(rel),
  rows
},null,2));
console.log(txt);
console.log("");
console.log("PASS — AV3W1 discovery completed. No application files changed.");
console.log("Artifacts:");
console.log("  mobile/.pc030m20av3w1-canonical-reachability-audit.txt");
console.log("  mobile/.pc030m20av3w1-canonical-reachability-audit.json");
