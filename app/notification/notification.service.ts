import admin from "firebase-admin";
import cron from "node-cron";
import path from "path";
import fs from "fs";
import { getDBPool } from "../common/services/database.service";

let isInitialized = false;

export const initNotificationService = () => {
  if (isInitialized) return;

  try {
    const serviceAccountPath = path.join(process.cwd(), "service-account.json");

    if (!fs.existsSync(serviceAccountPath)) {
      console.warn(
        "⚠️ service-account.json not found. Backend notifications disabled.",
      );
      return;
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8"),
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅ Firebase Admin Initialized");
    isInitialized = true;

    // Schedule task to run every hour
    cron.schedule("0 2,8,14,20 * * *", async () => {
      console.log("⏰ Running Manual Schedule...");
      await checkAndSendNotifications();
    });

    // Run immediately on startup for testing (optional, remove for prod)
    // checkAndSendNotifications();
  } catch (error) {
    console.error("❌ Failed to init notification service:", error);
  }
};

const checkAndSendNotifications = async () => {
  const pool = getDBPool();

  try {
    // 1. Fetch pending tasks with high/medium priority and user fcm_token
    const query = `
      SELECT 
        t.id, 
        t.subject, 
        t.priority, 
        u.fcm_token 
      FROM email_tasks t
      JOIN users u ON t.user_id = u.id
      WHERE 
        t.notification_sent = false 
        AND t.priority IN ('HIGH', 'MEDIUM')
        AND u.fcm_token IS NOT NULL
        AND u.fcm_token != ''
        AND (u.notifications_enabled IS NULL OR u.notifications_enabled = true) -- Check preference
      LIMIT 50; -- Batch size limits
    `;

    const { rows: tasks } = await pool.query(query);

    if (tasks.length === 0) {
      console.log("📭 No pending notifications to send.");
      return;
    }

    console.log(`📨 Found ${tasks.length} tasks to notify.`);

    for (const task of tasks) {
      try {
        const priorityEmoji = task.priority === "HIGH" ? "🔥" : "⚠️";

        await admin.messaging().send({
          token: task.fcm_token,
          notification: {
            title: `${priorityEmoji} ${task.priority} Priority Task`,
            body: task.subject,
          },
          android: {
            priority: "high",
            notification: {
              icon: "ic_launcher", // Uses app icon resource
              channelId: "default",
            },
          },
          data: {
            taskId: task.id,
            type: "EMAIL_TASK",
          },
        });

        // 2. Mark as sent
        await pool.query(
          "UPDATE email_tasks SET notification_sent = true WHERE id = $1",
          [task.id],
        );

        console.log(`✅ Notification sent for task: ${task.id}`);
      } catch (sendError: any) {
        console.error(
          `❌ Failed to send notification for task ${task.id}:`,
          sendError,
        );

        // Check for invalid token error
        if (
          sendError.code === "messaging/registration-token-not-registered" ||
          sendError.errorInfo?.code ===
            "messaging/registration-token-not-registered"
        ) {
          console.warn(
            `⚠️ Invalid FCM token detected. Removing from user record.`,
          );
          await pool.query(
            "UPDATE users SET fcm_token = NULL WHERE fcm_token = $1",
            [task.fcm_token],
          );
        }
      }
    }
  } catch (error) {
    console.error("❌ Error in checkAndSendNotifications:", error);
  }
};
