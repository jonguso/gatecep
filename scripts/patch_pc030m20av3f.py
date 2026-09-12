
from pathlib import Path
import re, sys
ROOT=Path(sys.argv[1]).resolve()
MARK="PC-030M20AV3F RESPONSIVE CALIBRATION"
P={
 "markets":ROOT/"mobile/app/(tabs)/markets.js",
 "watchlist":ROOT/"mobile/app/watchlist.js",
 "intelligence":ROOT/"mobile/app/intelligence-center.js",
 "research":ROOT/"mobile/app/research-valuation.js",
 "hub":ROOT/"mobile/app/fundamental-data-hub.js",
 "filings":ROOT/"mobile/app/verified-filings.js",
}
for n,p in P.items():
    if not p.exists(): raise SystemExit(f"ERROR — missing {n}: {p}")

def rep(s,a,b,label,count=1):
    if b in s:return s
    if a not in s:raise SystemExit(f"ERROR — {label} anchor not found")
    return s.replace(a,b,count)

def add_rn(s,name):
    m=re.search(r'import\s*\{([\s\S]*?)\}\s*from\s*"react-native";',s)
    if not m: raise SystemExit("ERROR — react-native import anchor missing")
    if re.search(rf'\b{re.escape(name)}\b',m.group(0)): return s
    body=m.group(1).rstrip()
    if body and not body.endswith(","): body+=","
    body+="\n  "+name
    return s[:m.start()]+"import {"+body+'\n} from "react-native";'+s[m.end():]

def mark(s):
    if MARK in s:return s
    i=s.find("export default")
    if i<0:raise SystemExit("ERROR — export default anchor missing")
    return s[:i]+"// "+MARK+"\n"+s[i:]

def save(p,b,s):
    s=mark(s)
    if s==b:return False
    bak=Path(str(p)+".pc030m20av3f.bak")
    if not bak.exists():bak.write_text(b,encoding="utf-8")
    p.write_text(s,encoding="utf-8");return True

changed={}

p=P["markets"];b=p.read_text(encoding="utf-8");s=b
s=rep(s,'const { height: windowHeight } = useWindowDimensions();','const { width: windowWidth, height: windowHeight } = useWindowDimensions();',"Markets width")
s=rep(s,'contentContainerStyle={styles.content}','''contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}''',"Markets content")
s=rep(s,'<Text style={styles.title}>Markets</Text>','''<Text style={[
        styles.title,
        windowWidth < 720 && { fontSize: 28, lineHeight: 34 },
        windowWidth < 480 && { fontSize: 25, lineHeight: 31 }
      ]}>Markets</Text>''',"Markets title")
s=rep(s,'<View style={styles.marketStatus}>','<View style={[styles.marketStatus, windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }]}>',"Markets status")
s=rep(s,'style={styles.stockRow}','style={[styles.stockRow, windowWidth < 480 && { flexWrap: "wrap" }]}',"Markets stock row")
s=rep(s,'style={styles.watchlistCard}','style={[styles.watchlistCard, windowWidth < 480 && { flexDirection: "column", alignItems: "stretch", gap: 10 }]}',"Markets watchlist row")
changed["markets"]=save(p,b,s)

p=P["watchlist"];b=p.read_text(encoding="utf-8");s=b
s=add_rn(s,"useWindowDimensions")
s=rep(s,'export default function WatchlistManager() {\n','export default function WatchlistManager() {\n  const { width: windowWidth } = useWindowDimensions();\n',"Watchlist hook")
s=rep(s,'<ScrollView style={styles.screen} contentContainerStyle={styles.content}>','''<ScrollView style={styles.screen} contentContainerStyle={[
      styles.content,
      windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
      windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
      windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
    ]}>''',"Watchlist content")
s=rep(s,'<View style={styles.headerRow}>','<View style={[styles.headerRow, windowWidth < 480 && { flexWrap: "wrap" }]}>',"Watchlist header")
s=rep(s,'<Text style={styles.title}>My Watchlist</Text>','<Text style={[styles.title, windowWidth < 480 && { fontSize: 25 }]}>My Watchlist</Text>',"Watchlist title")
changed["watchlist"]=save(p,b,s)

p=P["intelligence"];b=p.read_text(encoding="utf-8");s=b
s=add_rn(s,"useWindowDimensions")
s=rep(s,'export default function IntelligenceCenter() {\n','export default function IntelligenceCenter() {\n  const { width: windowWidth } = useWindowDimensions();\n',"Intelligence hook")
s=rep(s,'<ScrollView style={styles.screen} contentContainerStyle={styles.content}>','''<ScrollView style={styles.screen} contentContainerStyle={[
      styles.content,
      windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
      windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 128 },
      windowWidth < 480 && { paddingHorizontal: 12 }
    ]}>''',"Intelligence content")
s=rep(s,'<View style={styles.topBar}>','<View style={[styles.topBar, windowWidth < 420 && { flexWrap: "wrap", gap: 10 }]}>',"Intelligence topbar")
s=rep(s,'<View style={styles.summaryGrid}>','<View style={[styles.summaryGrid, windowWidth < 480 && { flexWrap: "wrap" }]}>',"Intelligence summary grid",2)
changed["intelligence"]=save(p,b,s)

p=P["research"];b=p.read_text(encoding="utf-8");s=b
s=add_rn(s,"useWindowDimensions")
s=rep(s,'export default function ResearchValuationScreen() {\n','export default function ResearchValuationScreen() {\n  const { width: windowWidth } = useWindowDimensions();\n',"Research hook")
s=rep(s,'''contentContainerStyle={
        styles.content
      }''','''contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}''',"Research content")
s=rep(s,'''style={
          styles.title
        }''','''style={[
          styles.title,
          windowWidth < 720 && { fontSize: 28, lineHeight: 34 },
          windowWidth < 480 && { fontSize: 25, lineHeight: 31 }
        ]}''',"Research title")
s=rep(s,'''<View
        style={
          styles.hero
        }
      >''','''<View
        style={[
          styles.hero,
          windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }
        ]}
      >''',"Research hero")
changed["research"]=save(p,b,s)

p=P["hub"];b=p.read_text(encoding="utf-8");s=b
s=add_rn(s,"useWindowDimensions")
s=rep(s,'export default function FundamentalDataHubScreen() {\n','export default function FundamentalDataHubScreen() {\n  const { width: windowWidth } = useWindowDimensions();\n',"Hub hook")
s=rep(s,'''contentContainerStyle={
        styles.content
      }''','''contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}''',"Hub content")
s=rep(s,'''style={
          styles.title
        }''','''style={[
          styles.title,
          windowWidth < 720 && { fontSize: 28, lineHeight: 34 },
          windowWidth < 480 && { fontSize: 25, lineHeight: 31 }
        ]}''',"Hub title")
s=rep(s,'''<View
        style={
          styles.hero
        }
      >''','''<View
        style={[
          styles.hero,
          windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }
        ]}
      >''',"Hub hero")
s=rep(s,'''style={
                      styles.routeCard
                    }''','''style={[
                      styles.routeCard,
                      windowWidth < 600 && { width: "100%", minWidth: 0 }
                    ]}''',"Hub route card")
changed["hub"]=save(p,b,s)

p=P["filings"];b=p.read_text(encoding="utf-8");s=b
s=add_rn(s,"useWindowDimensions")
s=rep(s,'export default function VerifiedFilingsScreen() {\n','export default function VerifiedFilingsScreen() {\n  const { width: windowWidth } = useWindowDimensions();\n',"Filings hook")
s=rep(s,'''contentContainerStyle={
        styles.content
      }''','''contentContainerStyle={[
        styles.content,
        windowWidth >= 720 && { width: "100%", maxWidth: 960, alignSelf: "center" },
        windowWidth < 720 && { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 128 },
        windowWidth < 480 && { paddingHorizontal: 12, paddingTop: 24 }
      ]}''',"Filings content")
s=rep(s,'''style={
          styles.title
        }''','''style={[
          styles.title,
          windowWidth < 720 && { fontSize: 28, lineHeight: 34 },
          windowWidth < 480 && { fontSize: 25, lineHeight: 31 }
        ]}''',"Filings title")
s=rep(s,'''<View
        style={
          styles.hero
        }
      >''','''<View
        style={[
          styles.hero,
          windowWidth < 520 && { flexDirection: "column", alignItems: "stretch" }
        ]}
      >''',"Filings hero")
changed["filings"]=save(p,b,s)

print("PC-030M20AV3F — Markets & Research Responsive Calibration")
for n in ["markets","watchlist","intelligence","research","hub","filings"]:
    print(("UPDATED" if changed[n] else "NO CHANGE")+" — "+n)
print("PRESERVED — verified NSE market-data source and no-hard-coded-price fallback.")
print("PRESERVED — Research & Valuation remains advisory-only and does not invent missing financial data.")
print("PRESERVED — Fundamental Data Hub remains the permanent registry-driven workflow entry point.")
print("PRESERVED — Verified Filing approval, rejection, revision, audit and promotion safeguards.")
