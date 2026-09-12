from pathlib import Path
import sys
root=Path(sys.argv[1])

store=root/"mobile/src/services/brokers/brokerAccountStore.js"
accounts=root/"mobile/app/broker-accounts.js"
legacy=root/"mobile/app/broker-profile.js"
menu=root/"mobile/app/menu.js"
myprof=root/"mobile/app/my-profile.js"
center=root/"mobile/app/broker-account-center.js"

for p in (store,accounts,legacy,menu,myprof,center):
    if not p.exists():
        raise SystemExit(f"ERROR — required file missing: {p}")

# Canonical migration helper
src=store.read_text(encoding="utf-8"); orig=src
anchor='const DEFAULT_BROKER_KEY = "defaultBrokerProfile";'
helper='''\nconst LEGACY_BROKER_PROFILE_KEY = "brokerProfile";\nconst LEGACY_BROKER_PROFILES_KEY = "brokerProfiles";\n\nfunction cleanText(value) { return String(value ?? "").trim(); }\n\nexport function resolveCanonicalBrokerId(value = "") {\n  const raw = cleanText(value).toUpperCase();\n  if (!raw) return null;\n  if (["AIB","AIB-AXYS","AIB AXYS"].includes(raw)) return "AIB";\n  if (["ABC","ABC CAPITAL"].includes(raw)) return "ABC";\n  if (["NCBA","NCBA INVESTMENT BANK"].includes(raw)) return "NCBA";\n  if (["DYER","DYER & BLAIR","DYER AND BLAIR"].includes(raw)) return "DYER";\n  if (["FAIDA","FAIDA INVESTMENT BANK"].includes(raw)) return "FAIDA";\n  if (["STANDARD INVESTMENT BANK","SIB"].includes(raw)) return "SIB";\n  if (["GATECEP-DEMO","GATECEP DEMO","SIM"].includes(raw)) return "SIM";\n  return raw.replace(/[^A-Z0-9]+/g, "_");\n}\n\nexport async function migrateLegacyBrokerProfileToCanonicalAccounts() {\n  const existing = await loadBrokerAccounts();\n  if (existing.length > 0) return { migrated:false, reason:"CANONICAL_ACCOUNTS_ALREADY_PRESENT", accounts:existing };\n\n  const [legacyRaw, legacyProfilesRaw, defaultRaw] = await Promise.all([\n    userGetItem(LEGACY_BROKER_PROFILE_KEY),\n    userGetItem(LEGACY_BROKER_PROFILES_KEY),\n    userGetItem(DEFAULT_BROKER_KEY)\n  ]);\n\n  let legacy = null;\n  for (const raw of [legacyRaw, defaultRaw]) {\n    if (!raw) continue;\n    try { const parsed=JSON.parse(raw); if (parsed && typeof parsed==="object") { legacy=parsed; break; } } catch {}\n  }\n  if (!legacy && legacyProfilesRaw) {\n    try { const parsed=JSON.parse(legacyProfilesRaw); if (Array.isArray(parsed) && parsed.length) legacy=parsed[0]; } catch {}\n  }\n  if (!legacy) return { migrated:false, reason:"NO_LEGACY_PROFILE", accounts:[] };\n\n  const brokerLabel=cleanText(legacy.broker||legacy.brokerName||legacy.name||legacy.selectedBroker);\n  const brokerId=resolveCanonicalBrokerId(brokerLabel);\n  if (!brokerId) return { migrated:false, reason:"LEGACY_BROKER_ID_UNAVAILABLE", accounts:[] };\n\n  const now=new Date().toISOString();\n  const broker=findBrokerById(brokerId||"SIM");\n  const brokerName=brokerLabel||cleanText(broker?.name)||brokerId;\n  const account={\n    id:brokerId, brokerId, brokerName, broker:brokerName, name:brokerName,\n    shortName:cleanText(broker?.shortName)||brokerId,\n    nickname:cleanText(legacy.nickname)||cleanText(broker?.shortName)||brokerName,\n    accountNumber:cleanText(legacy.accountNumber||legacy.clientNumber),\n    clientNumber:cleanText(legacy.clientNumber||legacy.accountNumber),\n    cdsNumber:cleanText(legacy.cdsNumber), connected:true, linked:true, status:"ACTIVE",\n    connectionMode:legacy.connectionMode||"MIGRATED_LEGACY_PROFILE",\n    apiMode:legacy.apiMode||"PENDING_BROKER_API", defaultBroker:true,\n    feeSchedule:legacy.feeSchedule||null, migrationSource:"LEGACY_BROKER_PROFILE",\n    legacyProfileId:legacy.id||null, createdAt:legacy.createdAt||legacy.updatedAt||now,\n    connectedAt:legacy.connectedAt||legacy.updatedAt||now, updatedAt:now, lastSyncAt:legacy.lastSyncAt||null\n  };\n  const saved=await saveBrokerAccounts([account]);\n  return { migrated:true, reason:"LEGACY_PROFILE_MIGRATED", account, accounts:saved };\n}\n'''
if "migrateLegacyBrokerProfileToCanonicalAccounts" not in src:
    if anchor not in src: raise SystemExit("ERROR — store anchor missing.")
    src=src.replace(anchor,anchor+helper,1)
if src!=orig:
    store.with_suffix(store.suffix+".pc030m20av2f4.bak").write_text(orig,encoding="utf-8")
    store.write_text(src,encoding="utf-8")
    print("UPDATED — canonical store supports non-destructive legacy migration.")

# Broker Accounts canonical load/persist
src=accounts.read_text(encoding="utf-8"); orig=src
imp='import { userGetItem, userSetItem } from "../src/auth/userStorage";'
canon='import { loadBrokerAccounts, saveBrokerAccounts, migrateLegacyBrokerProfileToCanonicalAccounts } from "../src/services/brokers/brokerAccountStore";'
if "migrateLegacyBrokerProfileToCanonicalAccounts" not in src:
    if imp not in src: raise SystemExit("ERROR — broker-accounts import anchor missing.")
    src=src.replace(imp,imp+"\n"+canon,1)
old='''  async function load() {\n    const raw = await userGetItem(BROKER_ACCOUNTS_KEY);\n    const parsed = raw ? JSON.parse(raw) : [];\n\n    setAccounts(Array.isArray(parsed) ? parsed : []);\n  }'''
new='''  async function load() {\n    let canonical = await loadBrokerAccounts();\n    if (!canonical.length) {\n      const migration = await migrateLegacyBrokerProfileToCanonicalAccounts();\n      canonical = migration?.accounts || [];\n    }\n    setAccounts(Array.isArray(canonical) ? canonical : []);\n  }'''
if old in src: src=src.replace(old,new,1)
elif "migrateLegacyBrokerProfileToCanonicalAccounts()" not in src: raise SystemExit("ERROR — broker-accounts load anchor missing.")
src=src.replace('    await userSetItem(BROKER_ACCOUNTS_KEY, JSON.stringify(next));','    await saveBrokerAccounts(next);',1)
if src!=orig:
    accounts.with_suffix(accounts.suffix+".pc030m20av2f4.bak").write_text(orig,encoding="utf-8")
    accounts.write_text(src,encoding="utf-8")
    print("UPDATED — Broker Accounts now loads/persists through canonical store.")

# Legacy save converges to canonical
src=legacy.read_text(encoding="utf-8"); orig=src
anchor='import { BROKERS, getDefaultBroker } from "../src/constants/brokers";'
extra='import { upsertBrokerAccount, resolveCanonicalBrokerId } from "../src/services/brokers/brokerAccountStore";'
if "resolveCanonicalBrokerId" not in src:
    if anchor not in src: raise SystemExit("ERROR — broker-profile import anchor missing.")
    src=src.replace(anchor,anchor+"\n"+extra,1)
cloud='''await userSetItem(\n  "cloudBrokerProfile",\n  JSON.stringify(cloudBroker)\n);'''
conv='''await userSetItem(\n  "cloudBrokerProfile",\n  JSON.stringify(cloudBroker)\n);\n\n      await upsertBrokerAccount({\n        brokerId: resolveCanonicalBrokerId(baseProfile.broker),\n        brokerName: baseProfile.brokerName,\n        clientNumber: baseProfile.clientNumber,\n        nickname: baseProfile.nickname,\n        defaultBroker: true, status: "ACTIVE",\n        connectionMode: "MANUAL_PROFILE", apiMode: "PENDING_BROKER_API"\n      });'''
if "await upsertBrokerAccount({" not in src:
    if cloud not in src: raise SystemExit("ERROR — broker-profile convergence anchor missing.")
    src=src.replace(cloud,conv,1)
src=src.replace(
'''      <Text style={styles.subtitle}>\n        This does not connect to your broker yet. It helps Gatecep match your\n        uploaded valuation or statement to the correct broker profile.\n      </Text>''',
'''      <Text style={styles.subtitle}>\n        Compatibility profile for statement matching. Linked broker accounts,\n        fee evidence and execution readiness are managed in Broker Accounts.\n      </Text>''',1)
if src!=orig:
    legacy.with_suffix(legacy.suffix+".pc030m20av2f4.bak").write_text(orig,encoding="utf-8")
    legacy.write_text(src,encoding="utf-8")
    print("UPDATED — legacy Broker Profile saves converge into canonical accounts.")

# Investor-facing navigation
src=menu.read_text(encoding="utf-8"); orig=src
src=src.replace('{ title: "Broker Profile", detail: "Review the connected broker account profile", route: "/broker-profile" }','{ title: "Broker Accounts", detail: "Manage linked brokers, fee evidence and execution readiness", route: "/broker-accounts" }')
if src!=orig:
    menu.with_suffix(menu.suffix+".pc030m20av2f4.bak").write_text(orig,encoding="utf-8"); menu.write_text(src,encoding="utf-8")

src=myprof.read_text(encoding="utf-8"); orig=src
src=src.replace('router.push("/broker-profile")','router.push("/broker-accounts")')
if src!=orig:
    myprof.with_suffix(myprof.suffix+".pc030m20av2f4.bak").write_text(orig,encoding="utf-8"); myprof.write_text(src,encoding="utf-8")

src=center.read_text(encoding="utf-8"); orig=src
src=src.replace('router.push("/broker-profile")','router.push("/broker-accounts")').replace('Open Broker Profile','Open Broker Accounts')
if src!=orig:
    center.with_suffix(center.suffix+".pc030m20av2f4.bak").write_text(orig,encoding="utf-8"); center.write_text(src,encoding="utf-8")

print("UPDATED — investor-facing broker navigation converged on /broker-accounts.")
