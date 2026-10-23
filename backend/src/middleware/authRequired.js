import jwt from "jsonwebtoken";

import {
  findUserById
} from "../modules/users/users.repository.js";

function canonicalStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export async function authRequired(
  req,
  res,
  next
) {
  try {
    const header =
      req.headers.authorization || "";

    const token =
      header.startsWith("Bearer ")
        ? header.slice(7)
        : "";

    if (!token) {
      return res.status(401).json({
        ok: false,
        error:
          "Missing authorization token"
      });
    }

    const payload =
      jwt.verify(
        token,
        process.env.JWT_SECRET ||
          "dev-access-secret"
      );

    const userId =
      String(payload?.sub || "").trim();

    if (!userId) {
      return res.status(401).json({
        ok: false,
        error:
          "Invalid or expired token"
      });
    }

    const user =
      await findUserById(userId);

    if (!user) {
      return res.status(401).json({
        ok: false,
        error:
          "Authenticated user not found"
      });
    }

    const status =
      canonicalStatus(user.status);

    if (status !== "ACTIVE") {
      return res.status(403).json({
        ok: false,
        error:
          "ACCOUNT_DISABLED",
        message:
          "This account is disabled."
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role:
        String(user.role || "")
          .trim()
          .toUpperCase(),
      status
    };

    return next();
  } catch (error) {
    if (
      error?.name ===
        "JsonWebTokenError" ||
      error?.name ===
        "TokenExpiredError" ||
      error?.name ===
        "NotBeforeError"
    ) {
      return res.status(401).json({
        ok: false,
        error:
          "Invalid or expired token"
      });
    }

    return next(error);
  }
}
