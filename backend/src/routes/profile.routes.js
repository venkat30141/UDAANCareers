
import { Router } from "express";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";
import {
  getMyProfile,
  saveMyProfile,
} from "../controllers/profile.controller.js";

const router = Router();

// All profile routes require an active, verified job-seeker account.
router.use(authenticateToken);
router.use(authorizeRoles("job_seeker"));

// GET /api/profiles/me
router.get("/me", getMyProfile);

// PUT /api/profiles/me
router.put("/me", saveMyProfile);

export default router;
