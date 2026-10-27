
import {
  createCompany,
  getMyCompanies,
  updateMyCompany,
} from "../services/company.service.js";

const ALLOWED_FIELDS = [
  "name",
  "description",
  "website",
  "industry",
  "city",
  "state",
];

function validateCompany(body, requireName = true) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "A valid JSON object is required.";
  }

  const unknownFields = Object.keys(body).filter(
    (key) => !ALLOWED_FIELDS.includes(key)
  );

  if (unknownFields.length > 0) {
    return `Unsupported fields: ${unknownFields.join(", ")}.`;
  }

  if (
    requireName &&
    (typeof body.name !== "string" || !body.name.trim())
  ) {
    return "Company name is required.";
  }

  for (const field of ALLOWED_FIELDS) {
    if (
      body[field] !== undefined &&
      body[field] !== null &&
      typeof body[field] !== "string"
    ) {
      return `${field} must be a string or null.`;
    }
  }

  return null;
}

export async function createMyCompany(req, res, next) {
  try {
    const error = validateCompany(req.body);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const company = await createCompany(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: "Company created and submitted for verification.",
      data: company,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listMyCompanies(req, res, next) {
  try {
    const companies = await getMyCompanies(req.user.id);

    return res.status(200).json({
      success: true,
      data: companies,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateMyCompanyDetails(req, res, next) {
  try {
    const error = validateCompany(req.body);

    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const companyId = req.params.companyId;

    if (!/^[1-9]\d*$/.test(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid company ID.",
      });
    }

    const company = await updateMyCompany(
      req.user.id,
      companyId,
      req.body
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Company details updated successfully.",
      data: company,
    });
  } catch (error) {
    return next(error);
  }
}
