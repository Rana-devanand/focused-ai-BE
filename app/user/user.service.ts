import bcrypt from "bcrypt";
import { getDBPool } from "../common/services/database.service";
import { supabaseAdmin } from "../common/services/supabase.admin";
import { type IUser } from "./user.dto";
import { supabase } from "../common/services/supabase.client";

export const hashPassword = async (password: string) => {
  const hash = await bcrypt.hash(password, 12);
  return hash;
};

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
    googleAccessToken: row.google_access_token,
    lastEmailFetch: row.last_email_fetch,
    created_at: row.created_at,
    updated_at: row.updated_at,
    fcmToken: row.fcm_token,
  };
};

export const createUser = async (
  data: Omit<IUser, "id" | "created_at" | "updated_at">,
) => {
  // Hash password if provided
  const passwordToStore = data.password
    ? await hashPassword(data.password)
    : null;

  const newUser = {
    name: data.name || null,
    email: data.email,
    active: data.active !== undefined ? data.active : true,
    role: data.role || "USER",
    password: passwordToStore,
    refresh_token: data.refreshToken || null,
    blocked: data.blocked || false,
    block_reason: data.blockReason || "",
    provider: data.provider || "manual",
    facebook_id: data.facebookId || null,
    image: data.image || null,
    linkedin_id: data.linkedinId || null,
  };

  const { data: createdUser, error } = await supabaseAdmin
    .from("users")
    .insert(newUser)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRowToUser(createdUser);
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
  // Convert camelCase to snake_case for database
  const dbData: any = {};

  if (data.name !== undefined) dbData.name = data.name;
  if (data.email !== undefined) dbData.email = data.email;
  if (data.active !== undefined) dbData.active = data.active;
  if (data.role !== undefined) dbData.role = data.role;
  if (data.password !== undefined) dbData.password = data.password;
  if (data.refreshToken !== undefined) dbData.refresh_token = data.refreshToken;
  if (data.blocked !== undefined) dbData.blocked = data.blocked;
  if (data.blockReason !== undefined) dbData.block_reason = data.blockReason;
  if (data.provider !== undefined) dbData.provider = data.provider;
  if (data.facebookId !== undefined) dbData.facebook_id = data.facebookId;
  if (data.image !== undefined) dbData.image = data.image;
  if (data.linkedinId !== undefined) dbData.linkedin_id = data.linkedinId;
  if (data.googleAccessToken !== undefined)
    dbData.google_access_token = data.googleAccessToken;
  if (data.lastEmailFetch !== undefined)
    dbData.last_email_fetch = data.lastEmailFetch;
  if (data.fcmToken !== undefined) dbData.fcm_token = data.fcmToken;

  const { data: updatedUser, error } = await supabaseAdmin
    .from("users")
    .update(dbData)
    .eq("id", id)
    .select("id, name, email, image, created_at")
    .single();

  if (error) throw error;

  return updatedUser;
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
        if (key === "googleAccessToken") return "google_access_token";
        if (key === "lastEmailFetch") return "last_email_fetch";
        if (key === "fcmToken") return "fcm_token";
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
        if (key === "googleAccessToken") return "google_access_token";
        if (key === "lastEmailFetch") return "last_email_fetch";
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
        if (key === "googleAccessToken") return "google_access_token";
        if (key === "lastEmailFetch") return "last_email_fetch";
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
