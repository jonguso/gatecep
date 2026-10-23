import {
  findUserById
} from "../modules/users/users.repository.js";

export function requireRole(...allowedRoles) {
  const canonicalRoles = new Set(
    allowedRoles.map((role) =>
      String(role || "").trim().toUpperCase()
    )
  );

  return async function roleRequired(req, res, next) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: "Authentication required"
        });
      }

      const user = await findUserById(userId);

      if (!user) {
        return res.status(401).json({
          ok: false,
          error: "Authenticated user not found"
        });
      }

      const currentRole =
        String(user.role || "")
          .trim()
          .toUpperCase();

      if (!canonicalRoles.has(currentRole)) {
        return res.status(403).json({
          ok: false,
          error: "Insufficient permissions"
        });
      }

      req.user = {
        ...req.user,
        role: currentRole
      };

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export const requireAdmin =
  requireRole("ADMIN");
