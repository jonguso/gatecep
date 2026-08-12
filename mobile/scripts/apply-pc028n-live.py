#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys

ROOT = Path.home() / "gatecep" / "mobile"
DASHBOARD = ROOT / "app" / "(tabs)" / "dashboard.js"
HUB = ROOT / "app" / "portfolio-hub.js"

def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Anchor not found for {label}. File was not modified.")
    return text.replace(old, new, 1)

def backup(path):
    backup_path = path.with_suffix(path.suffix + ".pc028n.bak")
    shutil.copy2(path, backup_path)
    return backup_path

def patch_dashboard():
    text = DASHBOARD.read_text(encoding="utf-8")
    original = text

    text = replace_once(
        text,
        '''  ActivityIndicator,
  Alert,
  Pressable,''',
        '''  ActivityIndicator,
  Alert,
  Modal,
  Pressable,''',
        "dashboard Modal import"
    )

    text = replace_once(
        text,
        '''import {
  loadUnifiedPortfolio
} from "../../src/portfolio/unifiedPortfolioApi";''',
        '''import {
  loadUnifiedPortfolio,
  loadPortfolioAccounts
} from "../../src/portfolio/unifiedPortfolioApi";''',
        "dashboard portfolio API imports"
    )

    text = replace_once(
        text,
        '''const [investorContext, setInvestorContext] = useState(null);''',
        '''const [investorContext, setInvestorContext] = useState(null);

const [portfolioAccounts, setPortfolioAccounts] = useState([]);
const [selectedPortfolioAccount, setSelectedPortfolioAccount] = useState({
  broker: "ALL",
  label: "All Accounts",
  type: "ALL"
});
const [portfolioAccountModalOpen, setPortfolioAccountModalOpen] = useState(false);''',
        "dashboard source state"
    )

    text = replace_once(
        text,
        ''' const [
  unifiedResult,
  marketResult,
  coachResult,
  brokerResult,
  investorContextResult,
  journalResult
] = await Promise.all([''',
        ''' const [
  unifiedResult,
  accountResult,
  marketResult,
  coachResult,
  brokerResult,
  investorContextResult,
  journalResult
] = await Promise.all([''',
        "dashboard Promise.all destructuring"
    )

    text = replace_once(
        text,
        '''  loadUnifiedPortfolio({ broker: "ALL" }).catch((error) => {
    console.log(
      "Unified portfolio load error:",
      error.message
    );
    return null;
  }),

  getMarketIntelligenceHome()''',
        '''  loadUnifiedPortfolio({
    broker:
      selectedPortfolioAccount?.type === "PRACTICE"
        ? "ALL"
        : selectedPortfolioAccount?.broker || "ALL"
  }).catch((error) => {
    console.log(
      "Unified portfolio load error:",
      error.message
    );
    return null;
  }),

  loadPortfolioAccounts().catch((error) => {
    console.log(
      "Portfolio account load error:",
      error.message
    );

    return {
      accounts: []
    };
  }),

  getMarketIntelligenceHome()''',
        "dashboard account loader"
    )

    text = replace_once(
        text,
        '''setPortfolioResult(unifiedResult);
setMarketIntel(marketResult);''',
        '''setPortfolioResult(unifiedResult);

const realAccounts =
  Array.isArray(accountResult?.accounts)
    ? accountResult.accounts
    : [];

const practice =
  investorContextResult?.practicePortfolio || null;

const practiceAvailable =
  Array.isArray(practice?.holdings) &&
  practice.holdings.length > 0;

const realPortfolioAvailable =
  Array.isArray(unifiedResult?.holdings) &&
  unifiedResult.holdings.length > 0;

const sourceAccounts = [
  ...realAccounts
];

if (
  realPortfolioAvailable &&
  !sourceAccounts.some(
    (item) =>
      item?.type === "ALL" ||
      item?.broker === "ALL"
  )
) {
  sourceAccounts.unshift({
    broker: "ALL",
    label: "All Accounts",
    type: "ALL"
  });
}

if (practiceAvailable) {
  sourceAccounts.push({
    broker: "PRACTICE",
    label: "Practice Portfolio",
    type: "PRACTICE"
  });
}

setPortfolioAccounts(sourceAccounts);

if (
  !realPortfolioAvailable &&
  practiceAvailable &&
  selectedPortfolioAccount?.type !== "PRACTICE"
) {
  setSelectedPortfolioAccount({
    broker: "PRACTICE",
    label: "Practice Portfolio",
    type: "PRACTICE"
  });
}

setMarketIntel(marketResult);''',
        "dashboard source catalog"
    )

    text = replace_once(
        text,
        '''  const activeHoldings = unifiedHoldings.length
    ? unifiedHoldings
    : practiceHoldings;

  const usePracticePortfolio =
  practiceHoldings.length > 0 &&
  unifiedHoldings.length === 0;''',
        '''  const usePracticePortfolio =
    selectedPortfolioAccount?.type === "PRACTICE";

  const activeHoldings =
    usePracticePortfolio
      ? practiceHoldings
      : unifiedHoldings;''',
        "dashboard active holdings"
    )

    text = replace_once(
        text,
        '''  const sourceLabel = unifiedHoldings.length
    ? "UNIFIED PORTFOLIO"
    : practiceHoldings.length
    ? "GATECEP PRACTICE PORTFOLIO"
    : marketIntel?.marketFeed?.provider
    ? `MARKET INTELLIGENCE • ${marketIntel.marketFeed.provider}`
    : "NO PORTFOLIO LOADED";''',
        '''  const sourceLabel =
    selectedPortfolioAccount?.type === "PRACTICE"
      ? "GATECEP PRACTICE PORTFOLIO"
      : unifiedHoldings.length
        ? selectedPortfolioAccount?.label || "ALL ACCOUNTS"
        : marketIntel?.marketFeed?.provider
          ? `MARKET INTELLIGENCE • ${marketIntel.marketFeed.provider}`
          : "NO PORTFOLIO LOADED";

  async function selectPortfolioAccount(account) {
    try {
      setPortfolioAccountModalOpen(false);

      const nextAccount = {
        ...account,
        userSelected: true
      };

      setSelectedPortfolioAccount(nextAccount);

      if (account?.type === "PRACTICE") {
        return;
      }

      const nextPortfolio =
        await loadUnifiedPortfolio({
          broker:
            account?.broker || "ALL"
        });

      setPortfolioResult(nextPortfolio);
      setLastUpdated(new Date().toLocaleString());
    } catch (error) {
      console.log(
        "Dashboard portfolio source change error:",
        error.message
      );
    }
  }''',
        "dashboard selection handler"
    )

    text = replace_once(
        text,
        '''      <Text style={styles.sourceText}>Source: {sourceLabel}</Text>

      <ActiveUserBanner />''',
        '''      <Text style={styles.sourceText}>Source: {sourceLabel}</Text>

      <Pressable
        onPress={() => setPortfolioAccountModalOpen(true)}
        style={{
          marginTop: 10,
          borderWidth: 1,
          borderColor: "#334155",
          backgroundColor: "#0f172a",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <View>
          <Text
            style={{
              color: "#64748b",
              fontSize: 9,
              fontWeight: "900"
            }}
          >
            PORTFOLIO VIEW
          </Text>

          <Text
            style={{
              color: "#f8fafc",
              fontWeight: "900",
              marginTop: 3
            }}
          >
            {selectedPortfolioAccount?.label || "All Accounts"}
          </Text>

          {selectedPortfolioAccount?.type === "PRACTICE" ? (
            <Text
              style={{
                color: "#fde68a",
                fontSize: 10,
                marginTop: 3
              }}
            >
              Simulation only • No real money
            </Text>
          ) : null}
        </View>

        <Text
          style={{
            color: "#67e8f9",
            fontWeight: "900"
          }}
        >
          ▼
        </Text>
      </Pressable>

      <Modal
        visible={portfolioAccountModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPortfolioAccountModalOpen(false)}
      >
        <Pressable
          onPress={() => setPortfolioAccountModalOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(2,6,23,.75)",
            justifyContent: "center",
            padding: 22
          }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: "#0f172a",
              borderWidth: 1,
              borderColor: "#334155",
              borderRadius: 18,
              padding: 14
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 18,
                fontWeight: "900",
                marginBottom: 8
              }}
            >
              Portfolio View
            </Text>

            {portfolioAccounts.map((account, index) => {
              const active =
                selectedPortfolioAccount?.broker === account?.broker &&
                selectedPortfolioAccount?.type === account?.type;

              return (
                <Pressable
                  key={`${account?.broker || account?.label}-${index}`}
                  onPress={() => selectPortfolioAccount(account)}
                  style={{
                    paddingVertical: 12,
                    borderTopWidth: index ? StyleSheet.hairlineWidth : 0,
                    borderTopColor: "#1e293b",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "800"
                      }}
                    >
                      {account?.label || account?.broker || "Portfolio"}
                    </Text>

                    {account?.type === "PRACTICE" ? (
                      <Text
                        style={{
                          color: "#fde68a",
                          fontSize: 9,
                          marginTop: 3
                        }}
                      >
                        SIMULATION ONLY
                      </Text>
                    ) : null}
                  </View>

                  {active ? (
                    <Text
                      style={{
                        color: "#22d3ee",
                        fontWeight: "900"
                      }}
                    >
                      ✓
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <ActiveUserBanner />''',
        "dashboard selector UI"
    )

    text = replace_once(
        text,
        '''              {practiceHoldings.length && !unifiedHoldings.length
                ? "Practice Net Worth"
                : "Net Worth"}''',
        '''              {usePracticePortfolio
                ? "Practice Net Worth"
                : "Net Worth"}''',
        "dashboard net worth label"
    )

    text = replace_once(
        text,
        '''              {practiceHoldings.length && !unifiedHoldings.length
                ? "PRACTICE"
                : "PORTFOLIO"}''',
        '''              {usePracticePortfolio
                ? "PRACTICE"
                : selectedPortfolioAccount?.type === "ALL"
                  ? "ALL ACCOUNTS"
                  : "PORTFOLIO"}''',
        "dashboard badge"
    )

    if text == original:
        raise RuntimeError("Dashboard patch produced no changes.")

    backup_path = backup(DASHBOARD)
    DASHBOARD.write_text(text, encoding="utf-8")
    return backup_path

def patch_hub():
    text = HUB.read_text(encoding="utf-8")
    original = text

    text = replace_once(
        text,
        '''    const sourceAccounts = [];

    if (
      Array.isArray(practice?.holdings) &&
      practice.holdings.length > 0
    ) {
      sourceAccounts.push({
        broker: "PRACTICE",
        label: "Practice Portfolio",
        type: "PRACTICE"
      });
    }

    sourceAccounts.push(...liveAccounts);

    setAccounts(sourceAccounts);''',
        '''    const sourceAccounts = [
      ...liveAccounts
    ];

    if (
      Array.isArray(practice?.holdings) &&
      practice.holdings.length > 0
    ) {
      sourceAccounts.push({
        broker: "PRACTICE",
        label: "Practice Portfolio",
        type: "PRACTICE"
      });
    }

    setAccounts(sourceAccounts);''',
        "portfolio hub source order"
    )

    text = replace_once(
        text,
        '''    setPortfolio(
      Array.isArray(portfolioResult?.holdings)
        ? portfolioResult.holdings
        : []
    );''',
        '''    const realHoldings =
      Array.isArray(portfolioResult?.holdings)
        ? portfolioResult.holdings
        : [];

    if (
      realHoldings.length === 0 &&
      liveAccounts.length === 0 &&
      Array.isArray(practice?.holdings) &&
      practice.holdings.length > 0 &&
      account?.type !== "PRACTICE"
    ) {
      const practiceAccount = {
        broker: "PRACTICE",
        label: "Practice Portfolio",
        type: "PRACTICE"
      };

      setSelectedAccount(practiceAccount);
      setPortfolio(practice.holdings);
      return;
    }

    setPortfolio(realHoldings);''',
        "portfolio hub practice fallback"
    )

    if text == original:
        raise RuntimeError("Portfolio Hub patch produced no changes.")

    backup_path = backup(HUB)
    HUB.write_text(text, encoding="utf-8")
    return backup_path

def main():
    if not DASHBOARD.exists():
        raise FileNotFoundError(DASHBOARD)

    if not HUB.exists():
        raise FileNotFoundError(HUB)

    dashboard_backup = patch_dashboard()
    hub_backup = patch_hub()

    print("PC-028N LIVE patch applied.")
    print(f"Dashboard backup: {dashboard_backup}")
    print(f"Portfolio Hub backup: {hub_backup}")
    print()
    print("Next:")
    print("  cd ~/gatecep/mobile")
    print("  bash scripts/verify-pc028n-live.sh")
    print("  npx expo start -c")

if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)
