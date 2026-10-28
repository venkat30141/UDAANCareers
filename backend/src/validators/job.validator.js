
import { z } from "zod";

const optionalText = (maxLength, fieldName) =>
  z
    .string()
    .trim()
    .max(maxLength, `${fieldName} cannot exceed ${maxLength} characters`)
    .optional()
    .nullable();

const salarySchema = z
  .number()
  .finite("Salary must be a valid number")
  .min(0, "Salary cannot be negative")
  .nullable()
  .optional();

export const createJobSchema = z
  .object({
    company_id: z
      .coerce
      .number()
      .int("Company ID must be an integer")
      .positive("Company ID must be positive"),

    title: z
      .string()
      .trim()
      .min(3, "Job title must contain at least 3 characters")
      .max(250, "Job title cannot exceed 250 characters"),

    description: z
      .string()
      .trim()
      .min(20, "Job description must contain at least 20 characters"),

    job_type: z.enum([
      "full_time",
      "part_time",
      "contract",
      "internship",
    ]),

    sector: z.enum(["private", "government"]),

    category: optionalText(100, "Category"),
    location: optionalText(150, "Location"),
    state: optionalText(100, "State"),

    is_remote: z.boolean().default(false),

    salary_min: salarySchema,
    salary_max: salarySchema,

    eligibility: optionalText(5000, "Eligibility"),
    application_url: optionalText(2000, "Application URL"),
    source_url: optionalText(2000, "Source URL"),

    application_deadline: z
      .string()
      .date("Application deadline must use YYYY-MM-DD format")
      .optional()
      .nullable(),
  })
  .strict()
  .superRefine((job, ctx) => {
    if (
      job.salary_min != null &&
      job.salary_max != null &&
      job.salary_max < job.salary_min
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["salary_max"],
        message: "Maximum salary cannot be less than minimum salary",
      });
    }

    if (
      job.sector === "government" &&
      !job.source_url
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["source_url"],
        message: "Government jobs require a source URL",
      });
    }

    if (
      job.application_url &&
      !isValidHttpUrl(job.application_url)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["application_url"],
        message: "Application URL must be a valid HTTP or HTTPS URL",
      });
    }

    if (
      job.source_url &&
      !isValidHttpUrl(job.source_url)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["source_url"],
        message: "Source URL must be a valid HTTP or HTTPS URL",
      });
    }

    if (
      job.application_deadline &&
      job.application_deadline < new Date().toISOString().slice(0, 10)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["application_deadline"],
        message: "Application deadline cannot be in the past",
      });
    }
  });

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
