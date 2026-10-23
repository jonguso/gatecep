/**
 * STATUS: ACTIVE
 * MODULE: <module name>
 * PURPOSE: Production API/service logic for GateCEP 3.0
 * USED BY: Backend, Mobile, Railway
 * LAST VERIFIED: 2026-06-29
 * NOTES: GateCEP 3.0 foundation file
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";

import {
  createUser,
  findUserByEmail
} from "../users/users.repository.js";

export async function register(payload = {}) {
  const email = String(payload.email || "").toLowerCase().trim();
  const username = String(payload.username || "").trim();
  const password = String(payload.password || "");

  if (!email) {
    throw new Error("Email is required");
  }

  if (!username) {
    throw new Error("Username is required");
  }

  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const existing = await findUserByEmail(email);

  if (existing) {
    throw new Error("User already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await createUser({
    id: uuid(),
    email,
    username,
    passwordHash,
    createdAt: new Date().toISOString()
  });

  return user;
}

export async function login(payload = {}) {
  const email = String(payload.email || "").toLowerCase().trim();
  const password = String(payload.password || "");

  if (!email) throw new Error("Email is required");
  if (!password) throw new Error("Password is required");

  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);

  if (!validPassword) {
    throw new Error("Invalid email or password");
  }

  const accountStatus =
    String(user.status || "")
      .trim()
      .toUpperCase();

  if (accountStatus !== "ACTIVE") {
    const error =
      new Error(
        "This account is disabled."
      );

    error.code =
      "ACCOUNT_DISABLED";

    error.status = 403;

    throw error;
  }

  const accessToken = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET || "dev-access-secret",
    { expiresIn: process.env.ACCESS_TOKEN_TTL || "15m" }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt
    },
    accessToken
  };
}