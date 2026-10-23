import { pool } from "../../database/db.js";

export async function createUser(user) {
  const result = await pool.query(
    `
    INSERT INTO public.auth_users (
      id,
      email,
      username,
      password_hash,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING
      id,
      email,
      username,
      role,
      status,
      password_hash AS "passwordHash",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [user.id, user.email, user.username, user.passwordHash]
  );

  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await pool.query(
    `
    SELECT
      id,
      email,
      username,
      role,
      status,
      password_hash AS "passwordHash",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM public.auth_users
    WHERE LOWER(email) = LOWER($1)
    LIMIT 1
    `,
    [email]
  );

  return result.rows[0] || null;
}

export async function findUserById(id) {
  const result = await pool.query(
    `
    SELECT
      id,
      email,
      username,
      role,
      status,
      password_hash AS "passwordHash",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM public.auth_users
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
}
export async function listUsersForAdmin() {
  const result = await pool.query(
    `
    SELECT
      id,
      email,
      username,
      role,
      status,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM public.auth_users
    ORDER BY created_at DESC, id ASC
    `
  );

  return result.rows;
}
