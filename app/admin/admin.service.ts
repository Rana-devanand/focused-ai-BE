import { getDBPool } from "../common/services/database.service";
import admin from "firebase-admin";
import { generateCustomNotificationWithGroq } from "../ai/groq-connection";

export const getAllEmailsPaginated = async (
  page: number,
  limit: number,
  searchQuery: string = "",
) => {
  const pool = getDBPool();
  const offset = (page - 1) * limit;

  let baseQuery = `
    FROM email_tasks e
    JOIN users u ON e.user_id = u.id
    WHERE e.is_deleted = false
  `;
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (searchQuery) {
    baseQuery += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
    queryParams.push(`%${searchQuery}%`);
    paramIndex++;
  }

  const countQuery = `SELECT COUNT(*) ${baseQuery}`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count);

  const dataQuery = `
    SELECT e.*, u.name as user_name, u.email as user_email
    ${baseQuery}
    ORDER BY e.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  queryParams.push(limit, offset);
  const dataResult = await pool.query(dataQuery, queryParams);

  return {
    data: dataResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getAllChatsPaginated = async (
  page: number,
  limit: number,
  searchQuery: string = "",
) => {
  const pool = getDBPool();
  const offset = (page - 1) * limit;

  let baseQuery = `
    FROM ai_chat_history c
    JOIN users u ON c.user_id = u.id
  `;
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (searchQuery) {
    baseQuery += ` WHERE u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex}`;
    queryParams.push(`%${searchQuery}%`);
    paramIndex++;
  }

  const countQuery = `SELECT COUNT(*) ${baseQuery}`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count);

  const dataQuery = `
    SELECT c.*, u.name as user_name, u.email as user_email
    ${baseQuery}
    ORDER BY c.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  queryParams.push(limit, offset);
  const dataResult = await pool.query(dataQuery, queryParams);

  return {
    data: dataResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getAllSubscriptionsPaginated = async (
  page: number,
  limit: number,
  searchQuery: string = "",
) => {
  const pool = getDBPool();
  const offset = (page - 1) * limit;

  let baseQuery = `
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
  `;
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (searchQuery) {
    baseQuery += ` WHERE u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex}`;
    queryParams.push(`%${searchQuery}%`);
    paramIndex++;
  }

  const countQuery = `SELECT COUNT(*) ${baseQuery}`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count);

  const dataQuery = `
    SELECT s.*, u.name as user_name, u.email as user_email
    ${baseQuery}
    ORDER BY s.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  queryParams.push(limit, offset);
  const dataResult = await pool.query(dataQuery, queryParams);

  return {
    data: dataResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const generateCustomNotification = async (prompt: string) => {
  return await generateCustomNotificationWithGroq(prompt);
};

export const sendCustomNotification = async (
  userIds: string[],
  title: string,
  body: string,
) => {
  const pool = getDBPool();

  if (!userIds || userIds.length === 0) {
    throw new Error("No users selected");
  }

  // Fetch FCM tokens
  const placeholders = userIds.map((_, i) => `$${i + 1}`).join(",");
  const query = `
    SELECT id, fcm_token 
    FROM users 
    WHERE id IN (${placeholders}) 
      AND fcm_token IS NOT NULL 
      AND fcm_token != ''
      AND (notifications_enabled IS NULL OR notifications_enabled = true)
  `;

  const { rows } = await pool.query(query, userIds);

  if (rows.length === 0) {
    return {
      success: 0,
      failed: userIds.length,
      message: "No valid FCM tokens found for selected users",
    };
  }

  const tokens = rows.map((r) => r.fcm_token);

  if (admin.apps.length === 0) {
    throw new Error(
      "Push Notification service (Firebase) is not initialized in the backend. Please check service-account config.",
    );
  }

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      android: {
        priority: "high",
        notification: {
          icon: "ic_launcher",
          channelId: "default",
        },
      },
    });

    return {
      success: response.successCount,
      failed: response.failureCount + (userIds.length - tokens.length),
      message: `Sent ${response.successCount} notifications successfully.`,
    };
  } catch (error) {
    console.error("Error sending custom notifications:", error);
    throw new Error("Failed to send notifications");
  }
};
