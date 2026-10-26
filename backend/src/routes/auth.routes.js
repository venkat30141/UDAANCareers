
import { Router } from "express";
import {
  register,
  verifyEmail,
  login,
} from "../controllers/auth.controller.js";

const router = Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/verify-email
router.post("/verify-email", verifyEmail);

// POST /api/auth/login
router.post("/login", login);

export default router;
