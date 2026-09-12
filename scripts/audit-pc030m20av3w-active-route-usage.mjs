import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MOBILE = path.join(ROOT, "mobile");
const APP = path.join(MOBILE, "app");
const SRC = path.join(MOBILE, "src");

const targets = [
  "execution-audit",
  "execution-bridge",
  "execution-wizard",
  "import-portfolio",
  "link-broker-account",
  "manual-portfolio-entry",
  "order-handoff",
  "orders-review",
  "orders",
  "reconciliation-center",
  "reconciliation-conversation",
  "review-portfolio-import",
  "trade-basket",
  "trade",
  "transaction-import",
  "storage-debug",
  "version-center"
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out=[];
  for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else if (/\.(js|jsx|ts|tsx)$/.test(ent.name)) out.push(full);
  }
  return out;
}

const allFiles=[...walk(APP),...walk(SRC)];
const contents=new Map(allFiles.map(f=>[f,fs.readFileSync(f,"utf8")]));

function routeFile(route) {
  for (const ext of [".js",".jsx",".ts",".tsx"]) {
    const p=path.join(APP,route+ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function relative(f){ return path.relative(MOBILE,f).replaceAll("\\","/"); }

function isReference(src, route) {
  const escaped=route.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const pats=[
    new RegExp(`["'\`]\\/${escaped}(?:["'\`?]|\\b)`),
    new RegExp(`pathname\\s*:\\s*["'\`]\\/${escaped}["'\`]`),
    new RegExp(`route\\s*:\\s*["'\`]\\/${escaped}["'\`]`),
    new RegExp(`href\\s*=\\s*["'\`]\\/${escaped}["'\`]`)
  ];
  return pats.some(r=>r.test(src));
}

const rows=[];
for (const route of targets) {
  const rf=routeFile(route);
  if (!rf) {
    rows.push({route,file:null,status:"MISSING_FILE",refs:[],responsive:false});
    continue;
  }
  const refs=[];
  for (const [f,src] of contents.entries()) {
    if (f===rf) continue;
    if (isReference(src,route)) refs.push(relative(f));
  }
  const own=contents.get(rf);
  const responsive=/PC-030M20AV3[A-Z0-9]+ RESPONSIVE CALIBRATION/.test(own) ||
                   (/maxWidth\s*:\s*960/.test(own) && /paddingBottom\s*:\s*128/.test(own));
  rows.push({
    route,
    file:relative(rf),
    status:refs.length ? "ACTIVE_REFERENCED" : "UNREFERENCED_LEGACY_CANDIDATE",
    refs:[...new Set(refs)].sort(),
    responsive
  });
}

const report=[];
report.push("PC-030M20AV3W — Active Route Usage & Legacy Candidate Audit");
report.push("");
report.push("This is discovery-only. No application source files are modified.");
report.push("");
for (const r of rows) {
  report.push(`${r.status} — /${r.route}`);
  report.push(`  file: ${r.file ?? "missing"}`);
  report.push(`  responsive: ${r.responsive ? "YES" : "NO"}`);
  if (r.refs.length) {
    report.push(`  referenced from (${r.refs.length}):`);
    for (const x of r.refs) report.push(`    - ${x}`);
  } else {
    report.push("  referenced from: none found by static route scan");
  }
}
report.push("");
report.push("Interpretation:");
report.push("- ACTIVE_REFERENCED: keep in responsive/UAT scope.");
report.push("- UNREFERENCED_LEGACY_CANDIDATE: do not patch automatically; review before retention/removal.");
report.push("- Static scan cannot prove a route is unused if it is reached dynamically or externally.");
report.push("- No files are deleted by this audit.");

const txt=report.join("\n");
fs.writeFileSync(path.join(MOBILE,".pc030m20av3w-active-route-usage-audit.txt"),txt);
fs.writeFileSync(path.join(MOBILE,".pc030m20av3w-active-route-usage-audit.json"),JSON.stringify({
  generatedAt:new Date().toISOString(),
  discoveryOnly:true,
  rows
},null,2));

console.log(txt);
console.log("");
console.log("PASS — AV3W discovery completed. No application files changed.");
console.log("Artifacts:");
console.log("  mobile/.pc030m20av3w-active-route-usage-audit.txt");
console.log("  mobile/.pc030m20av3w-active-route-usage-audit.json");
