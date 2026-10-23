import express from "express";

import {
  register,
  login
} from "./auth.service.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const user = await register(req.body || {});

    return res.status(201).json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error.message || String(error),
code: error.code || null,
detail: error.detail || null
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const result = await login(req.body || {});

    return res.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const status =
      Number.isInteger(error.status) &&
      error.status >= 400 &&
      error.status < 500
        ? error.status
        : 401;

    return res.status(status).json({
      ok: false,
      error: error.message || String(error),
code: error.code || null,
detail: error.detail || null
    });
  }
});

export default router;