
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

const ALLOWED_ROLES = new Set([
  "job_seeker",
  "employer",
  "government_editor",
  "admin",
]);

export async function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required.",
    });
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required.",
    });
  }

  if (!process.env.JWT_SECRET) {
    return next(new Error("JWT_SECRET is not configured."));
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "udaan-careers-api",
      audience: "udaan-careers-client",
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.sub !== "string" ||
    payload.sub.length === 0
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, role, is_active, is_email_verified
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [payload.sub]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive.",
      });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before accessing this resource.",
      });
    }

    if (!ALLOWED_ROLES.has(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Your account role is not authorized.",
      });
    }

    // Always use the current role from PostgreSQL, not the JWT role.
    req.user = {
      id: String(user.id),
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required.",
      });
    }

    if (
      allowedRoles.length === 0 ||
      !allowedRoles.every((role) => ALLOWED_ROLES.has(role))
    ) {
      return next(new Error("Invalid role authorization configuration."));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource.",
      });
    }

    return next();
  };
}
