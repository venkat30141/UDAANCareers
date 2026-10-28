
import { createJobSchema } from "../validators/job.validator.js";
import {
  createJobDraft,
  getEmployerJobs,
  getPublishedJobs,
  publishJob,
} from "../services/job.service.js";

export async function createJob(req, res, next) {
  try {
    const validation = createJobSchema.safeParse(req.body);

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

    // The employer ID comes from the verified JWT middleware,
    // never from the request body.
    const job = await createJobDraft(
      req.user.id,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Job draft created successfully.",
      data: {
        job,
      },
    });
  } catch (error) {
    return next(error);
  }
}


export async function getMyJobs(req, res, next) {
  try {
    const jobs = await getEmployerJobs(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Your jobs retrieved successfully.",
      data: {
        jobs,
        count: jobs.length,
      },
    });
  } catch (error) {
    return next(error);
  }
}




export async function getPublicJobs(req, res, next) {
  try {
    const { title, location, sector, job_type, is_remote } = req.query;

    // Validate sector
    if (sector && !["private", "government"].includes(sector)) {
      return res.status(400).json({
        success: false,
        message: "sector must be 'private' or 'government'.",
      });
    }

    // Validate job type
    const allowedJobTypes = [
      "full_time",
      "part_time",
      "contract",
      "internship",
    ];

    if (job_type && !allowedJobTypes.includes(job_type)) {
      return res.status(400).json({
        success: false,
        message:
          "job_type must be full_time, part_time, contract, or internship.",
      });
    }

    // Validate remote filter
    if (
      is_remote !== undefined &&
      !["true", "false"].includes(is_remote)
    ) {
      return res.status(400).json({
        success: false,
        message: "is_remote must be true or false.",
      });
    }

    // Validate pagination
    const pageValue = req.query.page ?? "1";
    const limitValue = req.query.limit ?? "10";

    if (
      !/^[1-9]\d*$/.test(pageValue) ||
      !/^[1-9]\d*$/.test(limitValue)
    ) {
      return res.status(400).json({
        success: false,
        message: "page and limit must be positive integers.",
      });
    }

    const page = Number(pageValue);
    const limit = Number(limitValue);

    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(limit) ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "page must be a safe positive integer and limit must be between 1 and 100.",
      });
    }

    const filters = {
      title,
      location,
      sector,
      job_type,
      ...(is_remote !== undefined && {
        is_remote: is_remote === "true",
      }),
    };

    const result = await getPublishedJobs(filters, { page, limit });

    return res.status(200).json({
      success: true,
      message: "Published jobs retrieved successfully.",
      data: {
        jobs: result.jobs,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    return next(error);
  }
}





export async function publishJobController(req, res, next) {
  try {
    const jobId = Number(req.params.id);

    if (!Number.isSafeInteger(jobId) || jobId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Job ID must be a positive integer.",
      });
    }

    const job = await publishJob(req.user.id, jobId);

    return res.status(200).json({
      success: true,
      message: "Job published successfully.",
      data: {
        job,
      },
    });
  } catch (error) {
    return next(error);
  }
}


