
import {
  getJobSeekerProfile,
  upsertJobSeekerProfile,
} from "../services/profile.service.js";

const ALLOWED_FIELDS = [
  "phone",
  "city",
  "state",
  "headline",
  "summary",
  "skills",
  "experience_years",
  "education",
];

function validateProfile(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "A valid JSON object is required.";
  }

  const unknownFields = Object.keys(body).filter(
    (key) => !ALLOWED_FIELDS.includes(key)
  );

  if (unknownFields.length > 0) {
    return `Unsupported fields: ${unknownFields.join(", ")}.`;
  }

  for (const key of ["phone", "city", "state", "headline", "summary", "education"]) {
    if (
      body[key] !== undefined &&
      body[key] !== null &&
      typeof body[key] !== "string"
    ) {
      return `${key} must be a string or null.`;
    }
  }

  if (
    body.skills !== undefined &&
    (!Array.isArray(body.skills) ||
      !body.skills.every((skill) => typeof skill === "string"))
  ) {
    return "skills must be an array of strings.";
  }

  if (
    body.experience_years !== undefined &&
    (!Number.isFinite(body.experience_years) ||
      body.experience_years < 0)
  ) {
    return "experience_years must be a non-negative number.";
  }

  return null;
}

export async function getMyProfile(req, res, next) {
  try {
    const profile = await getJobSeekerProfile(req.user.id);

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    return next(error);
  }
}

export async function saveMyProfile(req, res, next) {
  try {
    const validationError = validateProfile(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const profile = await upsertJobSeekerProfile(
      req.user.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Profile saved successfully.",
      data: profile,
    });
  } catch (error) {
    return next(error);
  }
}
