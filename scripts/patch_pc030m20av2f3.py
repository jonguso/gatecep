from pathlib import Path
import sys
root=Path(sys.argv[1])
p=root/"mobile/app/broker-accounts.js"
if not p.exists(): raise SystemExit(f"ERROR — required file missing: {p}")
src=p.read_text(encoding="utf-8")
orig=src

# import helper
anchor='import { userGetItem, userSetItem } from "../src/auth/userStorage";'
if "brokerFeeScheduleManagementService" not in src:
    if anchor not in src: raise SystemExit("ERROR — import anchor missing.")
    src=src.replace(anchor,anchor+'\nimport { buildBrokerFeeSchedule, describeBrokerFeeSchedule } from "../src/services/brokers/brokerFeeScheduleManagementService";',1)

# extend form state
old='  const [form, setForm] = useState({\n    accountNumber: "",\n    cdsNumber: "",\n    nickname: ""\n  });'
new='  const [form, setForm] = useState({\n    accountNumber: "",\n    cdsNumber: "",\n    nickname: "",\n    commissionRatePct: "",\n    otherChargesRatePct: "",\n    minimumCommission: "",\n    fixedCharges: "",\n    feeCurrency: "KES",\n    feeSource: "",\n    feeVerifiedAt: "",\n    feeVerificationConfirmed: false\n  });'
if old in src: src=src.replace(old,new,1)
elif "feeVerificationConfirmed" not in src: raise SystemExit("ERROR — form-state anchor missing.")

# load existing fee schedule
old='    setForm({\n      accountNumber: existing?.accountNumber || "",\n      cdsNumber: existing?.cdsNumber || "",\n      nickname: existing?.nickname || broker.shortName || broker.name\n    });'
new='    setForm({\n      accountNumber: existing?.accountNumber || "",\n      cdsNumber: existing?.cdsNumber || "",\n      nickname: existing?.nickname || broker.shortName || broker.name,\n      commissionRatePct: existing?.feeSchedule?.commissionRatePct != null ? String(existing.feeSchedule.commissionRatePct) : "",\n      otherChargesRatePct: existing?.feeSchedule?.otherChargesRatePct != null ? String(existing.feeSchedule.otherChargesRatePct) : "",\n      minimumCommission: existing?.feeSchedule?.minimumCommission != null ? String(existing.feeSchedule.minimumCommission) : "",\n      fixedCharges: existing?.feeSchedule?.fixedCharges != null ? String(existing.feeSchedule.fixedCharges) : "",\n      feeCurrency: existing?.feeSchedule?.currency || "KES",\n      feeSource: existing?.feeSchedule?.source || "",\n      feeVerifiedAt: existing?.feeSchedule?.verifiedAt || "",\n      feeVerificationConfirmed: existing?.feeSchedule?.verified === true\n    });'
if old in src: src=src.replace(old,new,1)
elif "commissionRatePct: existing?.feeSchedule" not in src: raise SystemExit("ERROR — startConnect anchor missing.")

# build managed fee schedule
anchor='    const existing = accounts.find((item) => item.id === editingBroker.id);\n    const now = new Date().toISOString();\n\n    const nextAccount = {'
repl='    const existing = accounts.find((item) => item.id === editingBroker.id);\n    const now = new Date().toISOString();\n\n    const hasAnyFeeInput = Boolean(\n      String(form.commissionRatePct || "").trim() ||\n      String(form.otherChargesRatePct || "").trim() ||\n      String(form.minimumCommission || "").trim() ||\n      String(form.fixedCharges || "").trim() ||\n      String(form.feeSource || "").trim() ||\n      String(form.feeVerifiedAt || "").trim()\n    );\n\n    const feeSchedule = hasAnyFeeInput\n      ? buildBrokerFeeSchedule({\n          commissionRatePct: form.commissionRatePct,\n          otherChargesRatePct: form.otherChargesRatePct,\n          minimumCommission: form.minimumCommission,\n          fixedCharges: form.fixedCharges,\n          currency: form.feeCurrency || "KES",\n          source: form.feeSource,\n          verifiedAt: form.feeVerifiedAt,\n          verificationConfirmed: form.feeVerificationConfirmed === true\n        })\n      : (existing?.feeSchedule || null);\n\n    const nextAccount = {'
if "const hasAnyFeeInput = Boolean(" not in src:
    if anchor not in src: raise SystemExit("ERROR — save fee anchor missing.")
    src=src.replace(anchor,repl,1)

# replace existing-preserve field with managed schedule
if "      feeSchedule: existing?.feeSchedule || null" in src:
    src=src.replace("      feeSchedule: existing?.feeSchedule || null","      feeSchedule",1)

# reset extended form
old='    setForm({\n      accountNumber: "",\n      cdsNumber: "",\n      nickname: ""\n    });'
new='    setForm({\n      accountNumber: "",\n      cdsNumber: "",\n      nickname: "",\n      commissionRatePct: "",\n      otherChargesRatePct: "",\n      minimumCommission: "",\n      fixedCharges: "",\n      feeCurrency: "KES",\n      feeSource: "",\n      feeVerifiedAt: "",\n      feeVerificationConfirmed: false\n    });'
if old in src: src=src.replace(old,new,1)

# add fee form UI before save button
anchor='          <Pressable style={styles.primary} onPress={saveBrokerConnection}>\n            <Text style={styles.primaryText}>Save Broker Profile</Text>\n          </Pressable>'
ui='          <View style={styles.feePanel}>\n            <Text style={styles.feeTitle}>Broker Fee Schedule</Text>\n            <Text style={styles.small}>Optional. GateCEP only uses these charges when you confirm they were checked against broker-published evidence.</Text>\n\n            <Text style={styles.label}>Commission Rate (%)</Text>\n            <TextInput value={form.commissionRatePct} onChangeText={(value) => setForm({ ...form, commissionRatePct: value })} keyboardType="decimal-pad" placeholder="e.g. 1.30" placeholderTextColor="#64748b" style={styles.input} />\n\n            <Text style={styles.label}>Other Charges Rate (%)</Text>\n            <TextInput value={form.otherChargesRatePct} onChangeText={(value) => setForm({ ...form, otherChargesRatePct: value })} keyboardType="decimal-pad" placeholder="e.g. 0.34" placeholderTextColor="#64748b" style={styles.input} />\n\n            <Text style={styles.label}>Minimum Commission (KES)</Text>\n            <TextInput value={form.minimumCommission} onChangeText={(value) => setForm({ ...form, minimumCommission: value })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#64748b" style={styles.input} />\n\n            <Text style={styles.label}>Fixed Charges (KES)</Text>\n            <TextInput value={form.fixedCharges} onChangeText={(value) => setForm({ ...form, fixedCharges: value })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#64748b" style={styles.input} />\n\n            <Text style={styles.label}>Evidence Source</Text>\n            <TextInput value={form.feeSource} onChangeText={(value) => setForm({ ...form, feeSource: value })} placeholder="Broker-published tariff / statement reference" placeholderTextColor="#64748b" style={styles.input} />\n\n            <Text style={styles.label}>Verified Date</Text>\n            <TextInput value={form.feeVerifiedAt} onChangeText={(value) => setForm({ ...form, feeVerifiedAt: value })} placeholder="YYYY-MM-DD" placeholderTextColor="#64748b" style={styles.input} />\n\n            <Pressable style={[styles.verifyRow, form.feeVerificationConfirmed && styles.verifyRowActive]} onPress={() => setForm({ ...form, feeVerificationConfirmed: !form.feeVerificationConfirmed })}>\n              <Text style={styles.verifyMark}>{form.feeVerificationConfirmed ? "✓" : "○"}</Text>\n              <Text style={styles.verifyText}>I verified these fee values against the evidence source above.</Text>\n            </Pressable>\n\n            {form.feeVerificationConfirmed && (!String(form.feeSource || "").trim() || !String(form.feeVerifiedAt || "").trim()) ? (\n              <Text style={styles.feeWarning}>Evidence source and verified date are required before GateCEP can mark this fee schedule verified.</Text>\n            ) : null}\n          </View>\n\n          <Pressable style={styles.primary} onPress={saveBrokerConnection}>\n            <Text style={styles.primaryText}>Save Broker Profile</Text>\n          </Pressable>'
if "Broker Fee Schedule" not in src:
    if anchor not in src: raise SystemExit("ERROR — fee UI anchor missing.")
    src=src.replace(anchor,ui,1)

# show fee evidence status
anchor='              <Text style={styles.detail}>\n                API Mode: {account.apiMode || "PENDING_BROKER_API"}\n              </Text>'
repl='              <Text style={styles.detail}>\n                API Mode: {account.apiMode || "PENDING_BROKER_API"}\n              </Text>\n\n              <Text style={styles.detail}>Fee Evidence: {describeBrokerFeeSchedule(account.feeSchedule).label}</Text>\n              {account?.feeSchedule?.verified === true ? (\n                <Text style={styles.detail}>Verified: {account.feeSchedule.verifiedAt || "N/A"} - {account.feeSchedule.source || "N/A"}</Text>\n              ) : null}'
if "Fee Evidence:" not in src:
    if anchor not in src: raise SystemExit("ERROR — fee status anchor missing.")
    src=src.replace(anchor,repl,1)

# add styles before primaryText
anchor='  primaryText: { color: "white", fontWeight: "900" },'
styles='  feePanel: { marginTop: 18, backgroundColor: "#020617", borderColor: "#334155", borderWidth: 1, borderRadius: 16, padding: 14 },\n  feeTitle: { color: "#67e8f9", fontWeight: "900", fontSize: 16 },\n  verifyRow: { marginTop: 16, flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: "#0f172a", borderColor: "#334155", borderWidth: 1, borderRadius: 14, padding: 12 },\n  verifyRowActive: { borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,.10)" },\n  verifyMark: { color: "#67e8f9", fontSize: 18, fontWeight: "900" },\n  verifyText: { color: "#cbd5e1", flex: 1, lineHeight: 18 },\n  feeWarning: { color: "#fde68a", marginTop: 10, lineHeight: 18, fontSize: 12 },\n  primaryText: { color: "white", fontWeight: "900" },'
if "feePanel:" not in src:
    if anchor not in src: raise SystemExit("ERROR — fee styles anchor missing.")
    src=src.replace(anchor,styles,1)

if src!=orig:
    p.with_suffix(p.suffix+".pc030m20av2f3.bak").write_text(orig,encoding="utf-8")
    p.write_text(src,encoding="utf-8")
    print("UPDATED — Broker Accounts can manage evidence-backed fee schedules.")
    print("UPDATED — verified status requires explicit confirmation + source + date.")
    print("UPDATED — connected broker cards show fee evidence status.")
else:
    print("NO CHANGE — AV2F3 already present.")