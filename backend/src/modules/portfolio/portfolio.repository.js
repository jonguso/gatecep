import { v4 as uuid } from "uuid";
import { pool } from "../../database/db.js";
import { applySecurityMaster } from "../../data/nseSecurityMaster.js";

function enrichHolding(holding = {}) {
  const mastered = applySecurityMaster({
    symbol: holding.symbol,
    name: holding.name,
    sector: holding.sector
  });

  return {
    ...holding,
    symbol: mastered.symbol,
    name: mastered.name,
    sector: mastered.sector
  };
}

export async function listUserPortfolio(userId, options = {}) {
  const params = [userId];
  const broker = options?.broker;

  let where = `WHERE user_id = $1
    AND COALESCE(broker, '') NOT IN ('GATECEP-DEMO', 'PRACTICE')
    AND UPPER(COALESCE(source, '')) NOT LIKE '%PRACTICE%'`;

  if (broker && broker !== "ALL") {
    params.push(broker);
    where += ` AND broker = $${params.length}`;
  }

  const result = await pool.query(
    `
      SELECT
        id,
        user_id AS "userId",
        broker,
        symbol,
        name,
        sector,
        quantity,
        settled_quantity AS "settledQuantity",
        pending_buy_quantity AS "pendingBuyQuantity",
        pending_sell_quantity AS "pendingSellQuantity",
        settlement_status AS "settlementStatus",
        settlement_date AS "settlementDate",
        average_price AS "averagePrice",
        market_price AS "marketPrice",
        market_value AS "marketValue",
        profit_loss AS "profitLoss",
        source,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM user_portfolios
      ${where}
      ORDER BY created_at DESC
    `,
    params
  );

  return result.rows.map(enrichHolding);
}

export async function listUserPortfolioAccounts(userId) {
  const result = await pool.query(
    `
      WITH real_holdings AS (
        SELECT broker, COUNT(*) AS holdings_count, SUM(market_value) AS total_value
        FROM user_portfolios
        WHERE user_id = $1
          AND COALESCE(broker, '') NOT IN ('GATECEP-DEMO', 'PRACTICE')
          AND UPPER(COALESCE(source, '')) NOT LIKE '%PRACTICE%'
        GROUP BY broker
      ), real_cash AS (
        SELECT broker, SUM(cash_balance) AS available_cash
        FROM user_cash_balances
        WHERE user_id = $1
          AND COALESCE(broker, '') NOT IN ('GATECEP-DEMO', 'PRACTICE')
          AND UPPER(COALESCE(source, '')) NOT LIKE '%PRACTICE%'
        GROUP BY broker
      )
      SELECT
        COALESCE(h.broker, c.broker) AS broker,
        COALESCE(h.holdings_count, 0) AS holdings_count,
        COALESCE(h.total_value, 0) AS total_value,
        COALESCE(c.available_cash, 0) AS available_cash
      FROM real_holdings h
      FULL OUTER JOIN real_cash c ON c.broker = h.broker
      ORDER BY
        CASE
          WHEN COALESCE(h.broker, c.broker) = 'GATECEP-DEMO' THEN 1
          WHEN COALESCE(h.broker, c.broker) = 'IMPORT_REVIEW' THEN 2
          ELSE 3
        END,
        COALESCE(h.broker, c.broker)
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    broker: row.broker,
    label:
      row.broker === "GATECEP-DEMO"
        ? "Gatecep Demo"
        : row.broker === "IMPORT_REVIEW"
        ? "Imported Portfolio"
        : row.broker,
    type:
      row.broker === "GATECEP-DEMO"
        ? "DEMO"
        : row.broker === "IMPORT_REVIEW"
        ? "IMPORTED"
        : "BROKER",
    holdingsCount: Number(row.holdings_count || 0),
    holdingsValue: Number(row.total_value || 0),
    availableCash: Number(row.available_cash || 0),
    totalValue: Number(row.total_value || 0) + Number(row.available_cash || 0)
  }));
}

export async function addUserHolding(userId, holding = {}) {
  const id = uuid();

  const mastered = applySecurityMaster({
    symbol: String(holding.symbol || "").toUpperCase().trim(),
    name: holding.name,
    sector: holding.sector
  });

  if (!mastered.symbol || Number(holding.quantity || 0) <= 0) {
    throw new Error("Invalid holding: symbol and quantity are required");
  }

  const result = await pool.query(
    `
      INSERT INTO user_portfolios (
        id,
        user_id,
        broker,
        symbol,
        name,
        sector,
        quantity,
        settled_quantity,
        pending_buy_quantity,
        pending_sell_quantity,
        settlement_status,
        settlement_date,
        average_price,
        market_price,
        market_value,
        profit_loss,
        source,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
        $13,$14,$15,$16,$17,NOW(),NOW()
      )
      ON CONFLICT (user_id, broker, symbol)
      DO UPDATE SET
        name = EXCLUDED.name,
        sector = EXCLUDED.sector,
        quantity = EXCLUDED.quantity,
        settled_quantity = EXCLUDED.settled_quantity,
        pending_buy_quantity = EXCLUDED.pending_buy_quantity,
        pending_sell_quantity = EXCLUDED.pending_sell_quantity,
        settlement_status = EXCLUDED.settlement_status,
        settlement_date = EXCLUDED.settlement_date,
        average_price = EXCLUDED.average_price,
        market_price = EXCLUDED.market_price,
        market_value = EXCLUDED.market_value,
        profit_loss = EXCLUDED.profit_loss,
        source = EXCLUDED.source,
        updated_at = NOW()
      RETURNING
        id,
        user_id AS "userId",
        broker,
        symbol,
        name,
        sector,
        quantity,
        settled_quantity AS "settledQuantity",
        pending_buy_quantity AS "pendingBuyQuantity",
        pending_sell_quantity AS "pendingSellQuantity",
        settlement_status AS "settlementStatus",
        settlement_date AS "settlementDate",
        average_price AS "averagePrice",
        market_price AS "marketPrice",
        market_value AS "marketValue",
        profit_loss AS "profitLoss",
        source,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      id,
      userId,
      holding.broker || "GATECEP-DEMO",
      mastered.symbol,
      mastered.name,
      mastered.sector,
      Number(holding.quantity || 0),
      Number(holding.settledQuantity ?? holding.quantity ?? 0),
      Number(holding.pendingBuyQuantity || 0),
      Number(holding.pendingSellQuantity || 0),
      holding.settlementStatus || "SETTLED",
      holding.settlementDate || null,
      Number(holding.averagePrice || holding.averageCost || 0),
      Number(holding.marketPrice || holding.price || 0),
      Number(holding.marketValue || holding.value || 0),
      Number(holding.profitLoss || 0),
      holding.source || "DEMO_TRADE"
    ]
  );

  return enrichHolding(result.rows[0]);
}
export async function listUserPositions(userId, options = {}) {
  return await listUserPortfolio(userId, options);
}

export async function updateUserPositionSettlement(userId, payload = {}) {
  const broker = payload.broker || "GATECEP-DEMO";
  const symbol = String(payload.symbol || "").toUpperCase().trim();

  if (!symbol) {
    throw new Error("Settlement update requires symbol");
  }

  const result = await pool.query(
    `
      UPDATE user_portfolios
      SET
        settled_quantity = $4,
        pending_buy_quantity = $5,
        pending_sell_quantity = $6,
        settlement_status = $7,
        settlement_date = $8,
        updated_at = NOW()
      WHERE user_id = $1
        AND broker = $2
        AND symbol = $3
      RETURNING
        id,
        user_id AS "userId",
        broker,
        symbol,
        name,
        sector,
        quantity,
        settled_quantity AS "settledQuantity",
        pending_buy_quantity AS "pendingBuyQuantity",
        pending_sell_quantity AS "pendingSellQuantity",
        settlement_status AS "settlementStatus",
        settlement_date AS "settlementDate",
        average_price AS "averagePrice",
        market_price AS "marketPrice",
        market_value AS "marketValue",
        profit_loss AS "profitLoss",
        source,
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `,
    [
      userId,
      broker,
      symbol,
      Number(payload.settledQuantity || 0),
      Number(payload.pendingBuyQuantity || 0),
      Number(payload.pendingSellQuantity || 0),
      payload.settlementStatus || "SETTLED",
      payload.settlementDate || null
    ]
  );

  if (!result.rows[0]) {
    throw new Error("Position not found for settlement update");
  }

  return enrichHolding(result.rows[0]);
}

export async function upsertUserPosition(userId, position = {}) {
  return await addUserHolding(userId, position);
}

export async function replaceUserPortfolioSnapshot(userId, accountKey, holdings = [], cashBalance = null) {
  const normalizedAccountKey = String(accountKey || "").trim().toUpperCase();
  if (!normalizedAccountKey || !normalizedAccountKey.includes("|")) {
    throw new Error("A verified broker and client-account key is required.");
  }

  const cleanHoldings = holdings
    .map((holding) => ({ ...holding, ...applySecurityMaster(holding) }))
    .filter((holding) => String(holding.symbol || "").trim() && Number(holding.quantity || 0) > 0);
  if (!cleanHoldings.length) throw new Error("The authoritative snapshot contains no valid holdings.");
  const authoritativeCash = Number(cashBalance);
  if (!Number.isFinite(authoritativeCash) || authoritativeCash < 0) {
    throw new Error("The authoritative snapshot requires a valid cash balance.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Always remove pre-identity REAL rows. Earlier builds stored them under
    // labels such as IMPORT_REVIEW or a broker name, so their continued
    // presence would double-count an account after identity-keyed adoption.
    // Rows already owned by another verified BROKER|CLIENT account survive.
    await client.query(
      `DELETE FROM user_portfolios
       WHERE user_id = $1
         AND COALESCE(broker, '') NOT LIKE '%|%'
         AND COALESCE(broker, '') NOT IN ('GATECEP-DEMO', 'PRACTICE')
         AND UPPER(COALESCE(source, '')) NOT LIKE '%PRACTICE%'`,
      [userId]
    );
    await client.query(
      `DELETE FROM user_cash_balances
       WHERE user_id = $1
         AND COALESCE(broker, '') NOT LIKE '%|%'
         AND COALESCE(broker, '') NOT IN ('GATECEP-DEMO', 'PRACTICE')
         AND UPPER(COALESCE(source, '')) NOT LIKE '%PRACTICE%'`,
      [userId]
    );
    await client.query(
      `DELETE FROM user_portfolios WHERE user_id = $1 AND broker = $2`,
      [userId, normalizedAccountKey]
    );

    await client.query(
      `INSERT INTO user_cash_balances
       (id, user_id, broker, currency, cash_balance, source, created_at, updated_at)
       VALUES ($1,$2,$3,'KES',$4,'AUTHORITATIVE_BROKER_SNAPSHOT',NOW(),NOW())
       ON CONFLICT (user_id, broker, currency) DO UPDATE SET
         cash_balance=EXCLUDED.cash_balance, source=EXCLUDED.source, updated_at=NOW()`,
      [uuid(), userId, normalizedAccountKey, authoritativeCash]
    );

    const saved = [];
    for (const holding of cleanHoldings) {
      const symbol = String(holding.symbol || "").trim().toUpperCase();
      const result = await client.query(
        `INSERT INTO user_portfolios (
           id, user_id, broker, symbol, name, sector, quantity,
           settled_quantity, pending_buy_quantity, pending_sell_quantity,
           settlement_status, settlement_date, average_price, market_price,
           market_value, profit_loss, source, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,0,'SETTLED',NULL,$9,$10,$11,$12,$13,NOW(),NOW())
         ON CONFLICT (user_id, broker, symbol) DO UPDATE SET
           name=EXCLUDED.name, sector=EXCLUDED.sector, quantity=EXCLUDED.quantity,
           settled_quantity=EXCLUDED.settled_quantity, pending_buy_quantity=0,
           pending_sell_quantity=0, settlement_status='SETTLED', settlement_date=NULL,
           average_price=EXCLUDED.average_price, market_price=EXCLUDED.market_price,
           market_value=EXCLUDED.market_value, profit_loss=EXCLUDED.profit_loss,
           source=EXCLUDED.source, updated_at=NOW()
         RETURNING symbol, broker, quantity, average_price AS "averagePrice",
           market_price AS "marketPrice", market_value AS "marketValue"`,
        [
          uuid(), userId, normalizedAccountKey, symbol,
          holding.name || symbol, holding.sector || "Unknown", Number(holding.quantity || 0),
          Number(holding.settledQuantity ?? holding.quantity ?? 0),
          Number(holding.averagePrice || holding.averageCost || 0),
          Number(holding.marketPrice || holding.price || 0),
          Number(holding.marketValue || holding.value || 0),
          Number(holding.profitLoss || 0), "AUTHORITATIVE_BROKER_SNAPSHOT"
        ]
      );
      saved.push(result.rows[0]);
    }

    await client.query("COMMIT");
    return { holdings: saved, cashBalance: authoritativeCash };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
