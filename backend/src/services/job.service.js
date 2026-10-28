
import { pool } from "../config/db.js";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const JOB_FIELDS = `
  id,
  company_id,
  posted_by,
  title,
  description,
  job_type,
  sector,
  category,
  location,
  state,
  is_remote,
  salary_min,
  salary_max,
  eligibility,
  application_url,
  source_url,
  application_deadline,
  status,
  created_at,
  updated_at
`;

export async function createJobDraft(employerUserId, data) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Confirm that this employer owns the selected company.
    const companyResult = await client.query(
      `SELECT id, verification_status
       FROM companies
       WHERE id = $1
         AND owner_user_id = $2
       FOR SHARE`,
      [data.company_id, employerUserId]
    );

    if (companyResult.rows.length === 0) {
      throw createHttpError(
        "Company not found or you do not have permission to use it.",
        404
      );
    }

    const company = companyResult.rows[0];

    // Only verified companies may publish jobs.
    // This endpoint creates drafts only, so pending companies may prepare them.

    const jobResult = await client.query(
      `INSERT INTO jobs (
         company_id,
         posted_by,
         title,
         description,
         job_type,
         sector,
         category,
         location,
         state,
         is_remote,
         salary_min,
         salary_max,
         eligibility,
         application_url,
         source_url,
         application_deadline,
         status
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14, $15, $16, 'draft'
       )
       RETURNING ${JOB_FIELDS}`,
      [
        company.id,
        employerUserId,
        data.title,
        data.description,
        data.job_type,
        data.sector,
        data.category ?? null,
        data.location ?? null,
        data.state ?? null,
        data.is_remote,
        data.salary_min ?? null,
        data.salary_max ?? null,
        data.eligibility ?? null,
        data.application_url ?? null,
        data.source_url ?? null,
        data.application_deadline ?? null,
      ]
    );

    await client.query("COMMIT");

    return jobResult.rows[0];
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The transaction may already have ended.
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function getEmployerJobs(employerUserId) {
  const result = await pool.query(
    `SELECT ${JOB_FIELDS}
     FROM jobs
     WHERE posted_by = $1
     ORDER BY created_at DESC, id DESC`,
    [employerUserId]
  );

  return result.rows;
}





export async function getPublishedJobs(filters = {}, pagination = {}) {
  const conditions = ["j.status = 'published'"];
  const values = [];

  function addFilter(condition, value) {
    values.push(value);
    conditions.push(condition.replace("?", `$${values.length}`));
  }

  if (filters.title?.trim()) {
    addFilter("j.title ILIKE ?", `%${filters.title.trim()}%`);
  }

  if (filters.location?.trim()) {
    values.push(`%${filters.location.trim()}%`);
    const index = values.length;
    conditions.push(
      `(j.location ILIKE $${index} OR j.state ILIKE $${index})`
    );
  }

  if (filters.sector) {
    addFilter("j.sector = ?", filters.sector);
  }

  if (filters.job_type) {
    addFilter("j.job_type = ?", filters.job_type);
  }

  if (filters.is_remote !== undefined) {
    addFilter("j.is_remote = ?", filters.is_remote);
  }

  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 10;
  const offset = (page - 1) * limit;

  const whereClause = conditions.join(" AND ");

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM jobs j
     INNER JOIN companies c ON c.id = j.company_id
     WHERE ${whereClause}`,
    values
  );

  const total = countResult.rows[0].total;

  const result = await pool.query(
    `SELECT
       j.id,
       j.company_id,
       c.name AS company_name,
       j.title,
       j.description,
       j.job_type,
       j.sector,
       j.category,
       j.location,
       j.state,
       j.is_remote,
       j.salary_min,
       j.salary_max,
       j.eligibility,
       j.application_url,
       j.source_url,
       j.application_deadline,
       j.created_at
     FROM jobs j
     INNER JOIN companies c ON c.id = j.company_id
     WHERE ${whereClause}
     ORDER BY j.created_at DESC, j.id DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
    [...values, limit, offset]
  );

  return {
    jobs: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}




export async function publishJob(employerUserId, jobId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const jobResult = await client.query(
      `SELECT
         j.id,
         j.status,
         c.verification_status
       FROM jobs j
       INNER JOIN companies c
         ON c.id = j.company_id
       WHERE j.id = $1
         AND c.owner_user_id = $2
       FOR UPDATE OF j`,
      [jobId, employerUserId]
    );

    if (jobResult.rows.length === 0) {
      throw createHttpError(
        "Job not found or you do not have permission to publish it.",
        404
      );
    }

    const job = jobResult.rows[0];

    if (job.verification_status !== "verified") {
      throw createHttpError(
        "Your company must be verified before publishing jobs.",
        403
      );
    }

    if (job.status !== "draft") {
      throw createHttpError(
        "Only draft jobs can be published.",
        400
      );
    }

    const result = await client.query(
      `UPDATE jobs
       SET status = 'published',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING ${JOB_FIELDS}`,
      [jobId]
    );

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The transaction may already have ended.
    }

    throw error;
  } finally {
    client.release();
  }
}

