import "dotenv/config";

import {
  pool
} from "../src/database/db.js";

function parseArgs(argv) {
  const args = {
    email: "",
    apply: false
  };

  for (
    let index = 0;
    index < argv.length;
    index += 1
  ) {
    const value = argv[index];

    if (value === "--email") {
      args.email =
        String(
          argv[index + 1] || ""
        )
          .trim()
          .toLowerCase();

      index += 1;
      continue;
    }

    if (value === "--apply") {
      args.apply = true;
      continue;
    }

    throw new Error(
      "Unsupported argument: " +
        value
    );
  }

  return args;
}

function maskEmail(email) {
  const parts =
    String(email || "").split("@");

  if (parts.length !== 2) {
    return "[masked]";
  }

  const local = parts[0];
  const domain = parts[1];

  const maskedLocal =
    local.length <= 2
      ? local.slice(0, 1) + "***"
      : local.slice(0, 2) + "***";

  return (
    maskedLocal +
    "@" +
    domain
  );
}

const args =
  parseArgs(
    process.argv.slice(2)
  );

if (!args.email) {
  throw new Error(
    "Required argument missing: --email"
  );
}

const client =
  await pool.connect();

try {
  await client.query("BEGIN");

  const result =
    await client.query(
      `
      SELECT
        id,
        email,
        role
      FROM public.auth_users
      WHERE LOWER(email) = LOWER($1)
      `,
      [args.email]
    );

  console.log(
    "MATCH_COUNT=" +
      result.rows.length
  );

  if (result.rows.length !== 1) {
    throw new Error(
      "Bootstrap requires exactly one matching account"
    );
  }

  const user =
    result.rows[0];

  console.log(
    "TARGET_EMAIL=" +
      maskEmail(user.email)
  );

  console.log(
    "CURRENT_ROLE=" +
      user.role
  );

  console.log(
    "REQUESTED_ROLE=ADMIN"
  );

  console.log(
    "MODE=" +
      (args.apply
        ? "APPLY"
        : "DRY_RUN")
  );

  if (user.role === "ADMIN") {
    throw new Error(
      "Target account is already ADMIN"
    );
  }

  if (user.role !== "USER") {
    throw new Error(
      "Target account does not have canonical USER role"
    );
  }

  if (!args.apply) {
    await client.query(
      "ROLLBACK"
    );

    console.log(
      "DATABASE_MUTATED=false"
    );

    console.log(
      "BOOTSTRAP_DRY_RUN=PASS"
    );
  } else {
    const update =
      await client.query(
        `
        UPDATE public.auth_users
        SET
          role = 'ADMIN',
          updated_at = NOW()
        WHERE id = $1
          AND role = 'USER'
        RETURNING role
        `,
        [user.id]
      );

    if (
      update.rows.length !== 1 ||
      update.rows[0].role !== "ADMIN"
    ) {
      throw new Error(
        "ADMIN promotion did not affect exactly one USER"
      );
    }

    await client.query(
      "COMMIT"
    );

    console.log(
      "DATABASE_MUTATED=true"
    );

    console.log(
      "FINAL_ROLE=ADMIN"
    );

    console.log(
      "BOOTSTRAP_APPLY=PASS"
    );
  }
} catch (error) {
  try {
    await client.query(
      "ROLLBACK"
    );
  } catch {
  }

  throw error;
} finally {
  client.release();
  await pool.end();
}
