
import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must contain at least 2 characters")
    .max(150, "Full name cannot exceed 150 characters"),

  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email cannot exceed 255 characters")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(12, "Password must contain at least 12 characters")
    .max(72, "Password cannot exceed 72 characters")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email cannot exceed 255 characters")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required")
    .max(72, "Invalid email or password"),
});