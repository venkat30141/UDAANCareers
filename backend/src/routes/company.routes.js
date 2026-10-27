
import { Router } from "express";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/auth.middleware.js";
import {
  createMyCompany,
  listMyCompanies,
  updateMyCompanyDetails,
} from "../controllers/company.controller.js";

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles("employer"));

// POST /api/companies
router.post("/", createMyCompany);

// GET /api/companies/my
router.get("/my", listMyCompanies);

// PUT /api/companies/:companyId
router.put("/:companyId", updateMyCompanyDetails);

export default router;
