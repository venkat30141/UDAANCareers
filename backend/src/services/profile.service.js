
import { pool } from "../config/db.js";

export async function getJobSeekerProfile(userId) {
  const result = await pool.query(
    `SELECT
       id,
       user_id,
       phone,
       city,
       state,
       headline,
       summary,
       skills,
       experience_years,
       education,
       created_at,
       updated_at
     FROM job_seeker_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function upsertJobSeekerProfile(userId, profile) {
  const {
    phone,
    city,
    state,
    headline,
    summary,
    skills,
    experience_years,
    education,
  } = profile;

  const result = await pool.query(
    `INSERT INTO job_seeker_profiles (
       user_id,
       phone,
       city,
       state,
       headline,
       summary,
       skills,
       experience_years,
       education
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id)
     DO UPDATE SET
       phone = EXCLUDED.phone,
       city = EXCLUDED.city,
       state = EXCLUDED.state,
       headline = EXCLUDED.headline,
       summary = EXCLUDED.summary,
       skills = EXCLUDED.skills,
       experience_years = EXCLUDED.experience_years,
       education = EXCLUDED.education,
       updated_at = NOW()
     RETURNING
       id,
       user_id,
       phone,
       city,
       state,
       headline,
       summary,
       skills,
       experience_years,
       education,
       created_at,
       updated_at`,
    [
      userId,
      phone ?? null,
      city ?? null,
      state ?? null,
      headline ?? null,
      summary ?? null,
      skills ?? [],
      experience_years ?? 0,
      education ?? null,
    ]
  );

  return result.rows[0];
}
