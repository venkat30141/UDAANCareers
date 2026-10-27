
import { Router } from "express";
import {
  register,
  verifyEmail,
  login,
} from "../controllers/auth.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/verify-email
router.post("/verify-email", verifyEmail);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/me
// Returns the authenticated user's current database identity and role.
router.get("/me", authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authenticated user retrieved successfully.",
    user: {
      id: req.user.id,
      role: req.user.role,
    },
  });
});

export default router;
