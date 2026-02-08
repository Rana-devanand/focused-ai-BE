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
    notificationsEnabled: row.notifications_enabled,
    currentStreak: row.current_streak,
    lastActiveDate: row.last_active_date,
    totalActiveMinutes: row.total_active_minutes,
    stripeCustomerId: row.stripe_customer_id,
    subscriptionId: row.subscription_id,
    subscriptionStatus: row.subscription_status,
    subscriptionPlan: row.subscription_plan,
    subscriptionEndDate: row.subscription_end_date,
    paymentStatus: row.payment_status,
    lastTransactionId: row.last_transaction_id,
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
  if (data.notificationsEnabled !== undefined)
    dbData.notifications_enabled = data.notificationsEnabled;

  // Payment-related fields
  if (data.paymentStatus !== undefined)
    dbData.payment_status = data.paymentStatus;
  if (data.lastTransactionId !== undefined)
    dbData.last_transaction_id = data.lastTransactionId;
  if (data.subscriptionStatus !== undefined)
    dbData.subscription_status = data.subscriptionStatus;
  if (data.subscriptionPlan !== undefined)
    dbData.subscription_plan = data.subscriptionPlan;
  if (data.subscriptionEndDate !== undefined)
    dbData.subscription_end_date = data.subscriptionEndDate;

  const { data: updatedUser, error } = await supabaseAdmin
    .from("users")
    .update(dbData)
    .eq("id", id)
    .select(
      "id, name, email, image, role, provider, active, notifications_enabled, fcm_token, payment_status, last_transaction_id, subscription_status, subscription_plan, subscription_end_date, created_at, updated_at",
    )
    .single();

  if (error) throw error;

  return mapRowToUser(updatedUser);
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
        if (key === "currentStreak") return "current_streak";
        if (key === "lastActiveDate") return "last_active_date";
        if (key === "totalActiveMinutes") return "total_active_minutes";
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
        if (key === "currentStreak") return "current_streak";
        if (key === "lastActiveDate") return "last_active_date";
        if (key === "totalActiveMinutes") return "total_active_minutes";
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

export const ensureStatsColumns = async () => {
  const pool = getDBPool();
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_active_date DATE,
      ADD COLUMN IF NOT EXISTS total_active_minutes INTEGER DEFAULT 0;
    `);
  } catch (e) {
    console.error("Error ensuring stats columns:", e);
  }
};

export const ensureSubscriptionColumns = async () => {
  const pool = getDBPool();
  try {
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
      ADD COLUMN IF NOT EXISTS subscription_id TEXT,
      ADD COLUMN IF NOT EXISTS subscription_status TEXT,
      ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
      ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS last_transaction_id TEXT,
      ADD COLUMN IF NOT EXISTS payment_status TEXT;
    `);
    console.log("Subscription columns ensured");
  } catch (e) {
    console.error("Error ensuring subscription columns:", e);
  }
};

export const updateUserStats = async (
  userId: string,
  data: { date: string; minutes: number },
) => {
  await ensureStatsColumns(); // Ensure columns exist before update
  const pool = getDBPool();

  // Fetch current user stats
  const user = await getUserById(userId, {
    currentStreak: true,
    lastActiveDate: true,
    totalActiveMinutes: true,
  });

  if (!user) return null;

  let newStreak = user.currentStreak || 0;
  const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  const today = new Date(data.date);

  // Normalize to connect at midnight
  if (lastActive) lastActive.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  // Check streak
  if (lastActive) {
    const diffTime = today.getTime() - lastActive.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak += 1; // Consecutive day
    } else if (diffDays > 1) {
      newStreak = 1; // Reset streak
    }
  } else {
    newStreak = 1; // First activity
  }

  const query = `
    UPDATE users
    SET 
      current_streak = $1,
      last_active_date = $2,
      total_active_minutes = COALESCE(total_active_minutes, 0) + $3,
      updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `;

  const result = await pool.query(query, [
    newStreak,
    data.date,
    data.minutes,
    userId,
  ]);

  return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
};
