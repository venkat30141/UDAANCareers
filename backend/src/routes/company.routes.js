
import { Router } from "express";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";
import {
  createMyCompany,
  listMyCompanies,
  updateMyCompanyDetails,
  verifyCompany,
} from "../controllers/company.controller.js";

const router = Router();

// All company routes require authentication.
router.use(authenticateToken);

// Admin-only: verify or reject a company.
router.patch(
  "/:companyId/verification",
  authorizeRoles("admin"),
  verifyCompany
);

// Employer-only routes.
router.use(authorizeRoles("employer"));

router.post("/", createMyCompany);
router.get("/my", listMyCompanies);
router.put("/:companyId", updateMyCompanyDetails);

export default router;
