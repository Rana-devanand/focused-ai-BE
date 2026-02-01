import { getDBPool } from "../common/services/database.service";
import {
  ICalendarEvent,
  IDailyStats,
  IEmailTask,
  IAIInsight,
} from "./passive-intelligence.dto";

// Helper to convert snake_case DB result to camelCase DTO
const mapRowToEvent = (row: any): ICalendarEvent => {
  if (!row) return row;
  return {
    id: row.id,
    userId: row.user_id,
    externalId: row.external_id,
    title: row.title,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    isAllDay: row.is_all_day,
    location: row.location,
    source: row.source,
    aiCategory: row.ai_category,
    aiSummary: row.ai_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapRowToStats = (row: any): IDailyStats => {
  if (!row) return row;
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date, // might need formatting depending on driver
    screenTimeMinutes: row.screen_time_minutes,
    meetingCount: row.meeting_count,
    focusScore: row.focus_score,
    appUsageBreakdown: row.app_usage_breakdown,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapRowToEmailTask = (row: any): IEmailTask => ({
  id: row.id,
  userId: row.user_id,
  emailId: row.email_id,
  subject: row.subject,
  fromAddress: row.from_address,
  snippet: row.snippet,
  receivedAt: row.received_at,
  taskDescription: row.task_description,
  isCompleted: row.is_completed,
  priority: row.priority,
  dueDate: row.due_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRowToInsight = (row: any): IAIInsight => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  message: row.message,
  metadata: row.metadata,
  isRead: row.is_read,
  createdAt: row.created_at,
});

export const getDailyStats = async (
  userId: string,
  date: string,
): Promise<IDailyStats | null> => {
  const pool = getDBPool();
  const query = `SELECT * FROM daily_stats WHERE user_id = $1 AND date = $2`;
  const result = await pool.query(query, [userId, date]);
  return result.rows[0] ? mapRowToStats(result.rows[0]) : null;
};

export const getWeeklyStats = async (
  userId: string,
  endDate: string, // YYYY-MM-DD
  days: number = 7,
): Promise<IDailyStats[]> => {
  const pool = getDBPool();
  const query = `
    SELECT * FROM daily_stats 
    WHERE user_id = $1 
    AND date <= $2 
    AND date > ($2::date - interval '${days} days')
    ORDER BY date ASC
  `;
  const result = await pool.query(query, [userId, endDate]);
  return result.rows.map(mapRowToStats);
};

export const upsertDailyStats = async (stats: IDailyStats) => {
  const pool = getDBPool();
  // Map input camelCase to snake_case for DB
  const query = `
    INSERT INTO daily_stats (user_id, date, screen_time_minutes, meeting_count, focus_score, app_usage_breakdown)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
      screen_time_minutes = EXCLUDED.screen_time_minutes,
      meeting_count = EXCLUDED.meeting_count,
      focus_score = EXCLUDED.focus_score,
      app_usage_breakdown = EXCLUDED.app_usage_breakdown,
      updated_at = NOW()
    RETURNING *;
  `;
  const result = await pool.query(query, [
    stats.userId,
    stats.date,
    stats.screenTimeMinutes,
    stats.meetingCount,
    stats.focusScore,
    JSON.stringify(stats.appUsageBreakdown || []),
  ]);
  return mapRowToStats(result.rows[0]);
};

export const getCalendarEvents = async (
  userId: string,
  start: Date,
  end: Date,
): Promise<ICalendarEvent[]> => {
  const pool = getDBPool();
  const query = `
    SELECT * FROM calendar_events 
    WHERE user_id = $1 
    AND start_time >= $2 
    AND start_time <= $3
    ORDER BY start_time ASC
  `;
  const result = await pool.query(query, [userId, start, end]);
  return result.rows.map(mapRowToEvent);
};

export const createCalendarEvent = async (event: ICalendarEvent) => {
  const pool = getDBPool();
  const query = `
    INSERT INTO calendar_events (user_id, external_id, title, description, start_time, end_time, is_all_day, location, source, ai_category, ai_summary)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;
  const values = [
    event.userId,
    event.externalId,
    event.title,
    event.description,
    event.startTime,
    event.endTime,
    event.isAllDay,
    event.location,
    event.source,
    event.aiCategory,
    event.aiSummary,
  ];
  const result = await pool.query(query, values);
  return mapRowToEvent(result.rows[0]);
};

export const getInsights = async (
  userId: string,
  limit = 5,
): Promise<IAIInsight[]> => {
  const pool = getDBPool();
  const query = `SELECT * FROM ai_insights WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`;
  const result = await pool.query(query, [userId, limit]);
  return result.rows.map(mapRowToInsight);
};

export const createInsight = async (insight: IAIInsight) => {
  const pool = getDBPool();
  const query = `
    INSERT INTO ai_insights (user_id, type, message, metadata)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const result = await pool.query(query, [
    insight.userId,
    insight.type,
    insight.message,
    insight.metadata,
  ]);
  return mapRowToInsight(result.rows[0]);
};

export const createEmailTask = async (task: IEmailTask) => {
  const pool = getDBPool();
  const query = `
      INSERT INTO email_tasks (user_id, email_id, subject, from_address, snippet, received_at, task_description, priority, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
  const values = [
    task.userId,
    task.emailId,
    task.subject,
    task.fromAddress,
    task.snippet,
    task.receivedAt,
    task.taskDescription,
    task.priority,
    task.dueDate,
  ];
  const result = await pool.query(query, values);
  return mapRowToEmailTask(result.rows[0]);
};

export const getEmailTasks = async (
  userId: string,
  limit = 20,
): Promise<IEmailTask[]> => {
  const pool = getDBPool();
  const query = `
    SELECT * FROM email_tasks 
    WHERE user_id = $1
    ORDER BY 
      CASE priority
        WHEN 'HIGH' THEN 1
        WHEN 'MEDIUM' THEN 2
        WHEN 'LOW' THEN 3
      END,
      created_at DESC 
    LIMIT $2
  `;
  const result = await pool.query(query, [userId, limit]);
  return result.rows.map(mapRowToEmailTask);
};

export const getTasksDueToday = async (
  userId: string,
): Promise<IEmailTask[]> => {
  const pool = getDBPool();
  // Fetch uncompleted tasks that are due today or overdue
  const query = `
    SELECT * FROM email_tasks 
    WHERE user_id = $1 
    AND is_completed = false
    AND due_date IS NOT NULL
    AND due_date::date <= CURRENT_DATE
    ORDER BY 
      CASE priority
        WHEN 'HIGH' THEN 1
        WHEN 'MEDIUM' THEN 2
        ELSE 3
      END
  `;
  const result = await pool.query(query, [userId]);
  return result.rows.map(mapRowToEmailTask);
};

export const updateTaskStatus = async (
  taskId: string,
  userId: string,
  updates: { isRead?: boolean; isCompleted?: boolean },
) => {
  const pool = getDBPool();

  let setClause = [];
  let values: any[] = [taskId, userId];
  let paramIndex = 3;

  if (updates.isRead !== undefined) {
    setClause.push(`is_read = $${paramIndex}`);
    values.push(updates.isRead);
    paramIndex++;
  }

  if (updates.isCompleted !== undefined) {
    setClause.push(`is_completed = $${paramIndex}`);
    // If completed, set completed_at. If not, set to null
    if (updates.isCompleted) {
      setClause.push(`completed_at = NOW()`);
    } else {
      setClause.push(`completed_at = NULL`);
    }
    values.push(updates.isCompleted);
    paramIndex++;
  }

  if (setClause.length === 0) return null;

  const query = `
    UPDATE email_tasks
    SET ${setClause.join(", ")}, updated_at = NOW()
    WHERE id = $1 AND user_id = $2
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0] ? mapRowToEmailTask(result.rows[0]) : null;
};

export const createManualTask = async (
  userId: string,
  task: {
    title: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    dueDate?: string;
  },
) => {
  const pool = getDBPool();
  const query = `
    INSERT INTO email_tasks (
      user_id, 
      subject, 
      task_description, 
      priority, 
      due_date,
      from_address,
      snippet,
      received_at
    )
    VALUES ($1, $2, $3, $4, $5, 'Self', 'Manual Task', NOW())
    RETURNING *;
  `;

  // Using title as both subject and description for manual tasks
  const result = await pool.query(query, [
    userId,
    task.title,
    task.title,
    task.priority,
    task.dueDate || null,
  ]);

  return mapRowToEmailTask(result.rows[0]);
};
