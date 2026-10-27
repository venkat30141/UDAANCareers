
import {
  registerSchema,
  loginSchema,
} from "../validators/auth.validator.js";

import {
  registerUser,
  loginUser,
  verifyUserEmail,
} from "../services/auth.service.js";

import { z } from "zod";

const verifyEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email cannot exceed 255 characters")
    .transform((value) => value.toLowerCase()),

  otp: z.string().regex(
    /^\d{6}$/,
    "Verification code must contain exactly six digits"
  ),
});

// ============================================================
// REGISTER CONTROLLER
// ============================================================


export async function register(req, res, next) {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const user = await registerUser({
      fullName: validation.data.fullName,
      email: validation.data.email,
      password: validation.data.password,
      role: validation.data.role,
    });

    return res.status(201).json({
      success: true,
      message:
        "Account created. Check your email for the verification code.",
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          is_email_verified: user.is_email_verified,
          created_at: user.created_at,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}


// ============================================================
// VERIFY EMAIL CONTROLLER
// ============================================================

export async function verifyEmail(req, res, next) {
  try {
    const validation = verifyEmailSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const result = await verifyUserEmail(validation.data);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// LOGIN CONTROLLER
// ============================================================

export async function login(req, res, next) {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const result = await loginUser(validation.data);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    return next(error);
  }
}
