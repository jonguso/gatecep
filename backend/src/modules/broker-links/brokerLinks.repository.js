/**
 * ============================================================================
 * STATUS: ACTIVE
 * MODULE: Broker Links Repository
 * LAYER: Backend Repository
 * DOMAIN: Broker Integration
 *
 * PURPOSE:
 * Handles persistence of user broker links. Creates, updates and retrieves
 * broker accounts connected to a GateCEP user.
 *
 * DATABASE:
 * - user_broker_links
 *
 * USED BY:
 * - brokerLinks.routes.js
 * - Broker Profile
 * - Broker Account Center
 * - Onboarding Broker Connection
 * - Dashboard
 * - Mobile App
 * - Web App
 *
 * DEPENDS ON:
 * - PostgreSQL
 * - UUID
 *
 * SHARED WITH:
 * - shared/constants/brokers.js
 * - shared/utils/normalizeBroker.js
 *
 * LAST VERIFIED:
 * 2026-06-29
 *
 * VERSION:
 * GateCEP 3.0 Foundation
 *
 * OWNER:
 * Broker Services
 * ============================================================================
 */

import { v4 as uuid } from "uuid";
import { pool } from "../../database/db.js";

export function normalizeBroker(value) {
  const raw =
    String(value || "GATECEP-DEMO")
      .trim()
      .toUpperCase();

  if (
    raw === "ABC" ||
    raw === "ABC CAPITAL"
  ) {
    return "ABC";
  }

  /*
   * Preserve the existing server-side AIB identity.
   * The current authoritative row is AIB-AXYS and
   * must not be rewritten by this repair.
   */
  if (
    raw === "AIB" ||
    raw === "AIB AXYS" ||
    raw === "AIB-AXYS"
  ) {
    return "AIB-AXYS";
  }

  return raw;
}

function requireIdentityText(
  value,
  label
) {
  const result =
    String(value ?? "").trim();

  if (!result) {
    throw new Error(
      `${label} is required.`
    );
  }

  return result;
}

export async function getUserBrokerLinks(userId) {
  const result = await pool.query(
    `
    SELECT
      id,
      user_id AS "userId",
      broker,
      client_number AS "clientNumber",
      cds_number AS "cdsNumber",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM user_broker_links
    WHERE user_id = $1
    ORDER BY broker
    `,
    [userId]
  );

  return result.rows;
}

export async function createBrokerLink(userId, payload = {}) {
  const result = await pool.query(
    `
    INSERT INTO user_broker_links (
      id,
      user_id,
      broker,
      client_number,
      cds_number,
      status,
      created_at,
      updated_at
    )
    VALUES ($1,$2,$3,$4,$5,'ACTIVE',NOW(),NOW())
    ON CONFLICT (
      user_id,
      broker,
      client_number,
      cds_number
    )
    DO UPDATE SET
      status = 'ACTIVE',
      updated_at = NOW()
    RETURNING
      id,
      user_id AS "userId",
      broker,
      client_number AS "clientNumber",
      cds_number AS "cdsNumber",
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [
      uuid(),
      userId,
      normalizeBroker(
        payload.broker ||
        "GATECEP-DEMO"
      ),
      requireIdentityText(
        payload.clientNumber,
        "clientNumber"
      ),
      requireIdentityText(
        payload.cdsNumber,
        "cdsNumber"
      )
    ]
  );

  return result.rows[0];
}