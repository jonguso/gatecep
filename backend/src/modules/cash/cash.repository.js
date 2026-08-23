/**
 * STATUS: ACTIVE
 * MODULE: <module name>
 * PURPOSE: Production API/service logic for GateCEP 3.0
 * USED BY: Backend, Mobile, Railway
 * LAST VERIFIED: 2026-06-29
 * NOTES: GateCEP 3.0 foundation file
 */

import { v4 as uuid } from "uuid";
import { pool } from "../../database/db.js";

export async function getUserCashBalances(userId, options = {}) {
  const broker = String(options?.broker || "ALL").trim().toUpperCase();
  const params = [userId];
  let scope = `
    AND COALESCE(broker, '') NOT IN ('GATECEP-DEMO', 'PRACTICE')
    AND UPPER(COALESCE(source, '')) NOT LIKE '%PRACTICE%'`;

  if (broker !== "ALL") {
    params.push(broker);
    scope = `AND UPPER(COALESCE(broker, '')) = $${params.length}`;
  }

  const result = await pool.query(
    `
    SELECT
      id,
      user_id AS "userId",
      broker,
      currency,
      cash_balance AS "cashBalance",
      source,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM user_cash_balances
    WHERE user_id = $1
    ${scope}
    ORDER BY broker
    `,
    params
  );

  return result.rows;
}

export async function upsertUserCashBalance(userId, payload = {}) {
  const result = await pool.query(
    `
    INSERT INTO user_cash_balances (
      id,
      user_id,
      broker,
      currency,
      cash_balance,
      source,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
    ON CONFLICT (user_id, broker, currency)
    DO UPDATE SET
      cash_balance = EXCLUDED.cash_balance,
      source = EXCLUDED.source,
      updated_at = NOW()
    RETURNING
      id,
      user_id AS "userId",
      broker,
      currency,
      cash_balance AS "cashBalance",
      source,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [
      uuid(),
      userId,
      payload.broker || "GATECEP-DEMO",
      payload.currency || "KES",
      Number(payload.cashBalance || payload.amount || payload.availableCash || 0),
      payload.source || "MANUAL"
    ]
  );

  return result.rows[0];
}
