import bcrypt from "bcrypt";
import { getDBPool } from "../common/services/database.service";
import { type IUser } from "./user.dto";

export const hashPassword = async (password: string) => {
  const hash = await bcrypt.hash(password, 12);
  return hash;
};

// Helper function to convert snake_case DB columns to camelCase
const mapRowToUser = (row: any): IUser => {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    active: row.active,
    role: row.role,
    password: row.password,
    refreshToken: row.refresh_token,
    blocked: row.blocked,
    blockReason: row.block_reason,
    provider: row.provider,
    facebookId: row.facebook_id,
    image: row.image,
    linkedinId: row.linkedin_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export const createUser = async (
  data: Omit<IUser, "id" | "created_at" | "updated_at">,
) => {
  const pool = getDBPool();

  // Hash password if provided
  const passwordToStore = data.password
    ? await hashPassword(data.password)
    : null;

  const query = `
    INSERT INTO users (name, email, active, role, password, refresh_token, blocked, block_reason, provider, facebook_id, image, linkedin_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id, name, email, active, role, blocked, block_reason, provider, image, created_at, updated_at
  `;

  const values = [
    data.name || null,
    data.email,
    data.active !== undefined ? data.active : true,
    data.role || "USER",
    passwordToStore,
    data.refreshToken || null,
    data.blocked || false,
    data.blockReason || "",
    data.provider || "manual",
    data.facebookId || null,
    data.image || null,
    data.linkedinId || null,
  ];

  const result = await pool.query(query, values);
  return mapRowToUser(result.rows[0]);
};

export const updateUser = async (id: string, data: Partial<IUser>) => {
  const pool = getDBPool();

  const query = `
    UPDATE users
    SET name = $1, email = $2, active = $3, role = $4, blocked = $5, block_reason = $6, provider = $7, image = $8
    WHERE id = $9
    RETURNING id, name, email, active, role, blocked, block_reason, provider, image, created_at, updated_at
  `;

  const values = [
    data.name,
    data.email,
    data.active,
    data.role,
    data.blocked,
    data.blockReason,
    data.provider,
    data.image,
    id,
  ];

  const result = await pool.query(query, values);
  return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
};

export const editUser = async (id: string, data: Partial<IUser>) => {
  const pool = getDBPool();

  // Build dynamic update query based on provided fields
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(data.name);
  }
  if (data.email !== undefined) {
    updates.push(`email = $${paramCount++}`);
    values.push(data.email);
  }
  if (data.active !== undefined) {
    updates.push(`active = $${paramCount++}`);
    values.push(data.active);
  }
  if (data.role !== undefined) {
    updates.push(`role = $${paramCount++}`);
    values.push(data.role);
  }
  if (data.password !== undefined) {
    updates.push(`password = $${paramCount++}`);
    values.push(data.password);
  }
  if (data.refreshToken !== undefined) {
    updates.push(`refresh_token = $${paramCount++}`);
    values.push(data.refreshToken);
  }
  if (data.blocked !== undefined) {
    updates.push(`blocked = $${paramCount++}`);
    values.push(data.blocked);
  }
  if (data.blockReason !== undefined) {
    updates.push(`block_reason = $${paramCount++}`);
    values.push(data.blockReason);
  }
  if (data.provider !== undefined) {
    updates.push(`provider = $${paramCount++}`);
    values.push(data.provider);
  }
  if (data.facebookId !== undefined) {
    updates.push(`facebook_id = $${paramCount++}`);
    values.push(data.facebookId);
  }
  if (data.image !== undefined) {
    updates.push(`image = $${paramCount++}`);
    values.push(data.image);
  }
  if (data.linkedinId !== undefined) {
    updates.push(`linkedin_id = $${paramCount++}`);
    values.push(data.linkedinId);
  }

  if (updates.length === 0) {
    return getUserById(id);
  }

  values.push(id);

  const query = `
    UPDATE users
    SET ${updates.join(", ")}
    WHERE id = $${paramCount}
    RETURNING id, name, email, active, role, blocked, block_reason, provider, image, created_at, updated_at
  `;

  const result = await pool.query(query, values);
  return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
};

export const deleteUser = async (id: string) => {
  const pool = getDBPool();

  const query = `DELETE FROM users WHERE id = $1`;
  const result = await pool.query(query, [id]);

  return { deletedCount: result.rowCount };
};

export const getUserById = async (
  id: string,
  projection?: Record<string, boolean>,
) => {
  const pool = getDBPool();

  // Build SELECT clause based on projection
  let selectClause = "*";
  if (projection) {
    const fields = Object.keys(projection)
      .filter((key) => projection[key])
      .map((key) => {
        // Convert camelCase to snake_case for DB columns
        if (key === "refreshToken") return "refresh_token";
        if (key === "blockReason") return "block_reason";
        if (key === "facebookId") return "facebook_id";
        if (key === "linkedinId") return "linkedin_id";
        if (key === "created_at") return "created_at";
        if (key === "updated_at") return "updated_at";
        return key;
      });
    if (fields.length > 0) {
      selectClause = fields.join(", ");
    }
  }

  const query = `SELECT ${selectClause} FROM users WHERE id = $1`;
  const result = await pool.query(query, [id]);

  return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
};

export const getAllUser = async (
  projection?: Record<string, boolean>,
  options?: { skip?: number; limit?: number },
) => {
  const pool = getDBPool();

  // Build SELECT clause
  let selectClause = "*";
  if (projection) {
    const fields = Object.keys(projection)
      .filter((key) => projection[key])
      .map((key) => {
        if (key === "refreshToken") return "refresh_token";
        if (key === "blockReason") return "block_reason";
        if (key === "facebookId") return "facebook_id";
        if (key === "linkedinId") return "linkedin_id";
        return key;
      });
    if (fields.length > 0) {
      selectClause = fields.join(", ");
    }
  }

  let query = `SELECT ${selectClause} FROM users ORDER BY created_at DESC`;

  const values: any[] = [];
  if (options?.limit) {
    query += ` LIMIT $${values.length + 1}`;
    values.push(options.limit);
  }
  if (options?.skip) {
    query += ` OFFSET $${values.length + 1}`;
    values.push(options.skip);
  }

  const result = await pool.query(query, values);
  return result.rows.map(mapRowToUser);
};

export const getUserByEmail = async (
  email: string,
  projection?: Record<string, boolean>,
) => {
  const pool = getDBPool();

  // Build SELECT clause
  let selectClause = "*";
  if (projection) {
    const fields = Object.keys(projection)
      .filter((key) => projection[key])
      .map((key) => {
        if (key === "refreshToken") return "refresh_token";
        if (key === "blockReason") return "block_reason";
        if (key === "facebookId") return "facebook_id";
        if (key === "linkedinId") return "linkedin_id";
        return key;
      });
    if (fields.length > 0) {
      selectClause = fields.join(", ");
    }
  }

  const query = `SELECT ${selectClause} FROM users WHERE email = $1`;
  const result = await pool.query(query, [email]);

  return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
};

export const countItems = async () => {
  const pool = getDBPool();
  const query = `SELECT COUNT(*) as count FROM users`;
  const result = await pool.query(query);
  return parseInt(result.rows[0].count);
};
