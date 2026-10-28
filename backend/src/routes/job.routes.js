
import { Router } from "express";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";
import {
  createJob,
  getMyJobs,
  getPublicJobs,
  publishJobController,
} from "../controllers/job.controller.js";

const router = Router();
// Public endpoint: visitors can browse published jobs.
router.get("/", getPublicJobs);

// All job-creation requests require a valid, verified account.
router.use(authenticateToken);

// Only employers can create job drafts.
router.use(authorizeRoles("employer"));

router.post("/", createJob);
router.get("/my-jobs", getMyJobs);
router.post("/:id/publish", publishJobController);

export default router;
