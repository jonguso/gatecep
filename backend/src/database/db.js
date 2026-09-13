import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === "production";


const dbSslSetting = String(
  process.env.DB_SSL ?? (isProduction ? "true" : "false")
).trim().toLowerCase();

const dbSslEnabled = !["false", "0", "no", "off"].includes(dbSslSetting);

export const pool = isProduction
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: dbSslEnabled ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || "gatecep_trader",
      user: process.env.PGUSER || "postgres",
      password: String(process.env.PGPASSWORD || "")
    });

export async function query(text, params = []) {
  return await pool.query(text, params);
}