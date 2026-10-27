
import { pool } from "../config/db.js";

const COMPANY_FIELDS = `
  id,
  owner_user_id,
  name,
  description,
  website,
  industry,
  city,
  state,
  verification_status,
  created_at,
  updated_at
`;

export async function createCompany(ownerUserId, data) {
  const result = await pool.query(
    `INSERT INTO companies (
       owner_user_id,
       name,
       description,
       website,
       industry,
       city,
       state
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COMPANY_FIELDS}`,
    [
      ownerUserId,
      data.name.trim(),
      data.description ?? null,
      data.website ?? null,
      data.industry ?? null,
      data.city ?? null,
      data.state ?? null,
    ]
  );

  return result.rows[0];
}

export async function getMyCompanies(ownerUserId) {
  const result = await pool.query(
    `SELECT ${COMPANY_FIELDS}
     FROM companies
     WHERE owner_user_id = $1
     ORDER BY created_at DESC`,
    [ownerUserId]
  );

  return result.rows;
}

export async function updateMyCompany(ownerUserId, companyId, data) {
  const result = await pool.query(
    `UPDATE companies
     SET
       name = $3,
       description = $4,
       website = $5,
       industry = $6,
       city = $7,
       state = $8,
       updated_at = NOW()
     WHERE id = $1
       AND owner_user_id = $2
     RETURNING ${COMPANY_FIELDS}`,
    [
      companyId,
      ownerUserId,
      data.name.trim(),
      data.description ?? null,
      data.website ?? null,
      data.industry ?? null,
      data.city ?? null,
      data.state ?? null,
    ]
  );

  return result.rows[0] ?? null;
}
