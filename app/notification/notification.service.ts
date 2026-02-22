import admin from "firebase-admin";
import cron from "node-cron";
import path from "path";
import fs from "fs";
import { getDBPool } from "../common/services/database.service";
import { generateNotificationWithGroq } from "../ai/groq-connection";

let isInitialized = false;

export const initNotificationService = () => {
  console.log("isInitialized ===================== ", isInitialized);
  if (isInitialized) return;
  console.log("Initializing notification service...");
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
    cron.schedule("0 * * * *", async () => {
      console.log("⏰ Running Hourly AI Notification Schedule...");
      await checkAndSendNotifications();
    });

    // Run immediately on startup
    checkAndSendNotifications();
  } catch (error) {
    console.error("❌ Failed to init notification service:", error);
  }
};

const checkAndSendNotifications = async () => {
  const pool = getDBPool();

  try {
    // 1. Fetch pending tasks with the user's fcm_token
    const query = `
      SELECT 
        t.id, 
        t.subject, 
        t.priority,
        t.due_date,
        u.id as user_id,
        u.fcm_token 
      FROM email_tasks t
      JOIN users u ON t.user_id = u.id
      WHERE 
        t.notification_sent = false 
        AND u.fcm_token IS NOT NULL
        AND u.fcm_token != ''
        AND (u.notifications_enabled IS NULL OR u.notifications_enabled = true) -- Check preference
      LIMIT 100; -- Batch size limits
    `;

    const { rows: tasks } = await pool.query(query);

    if (tasks.length === 0) {
      console.log("📭 No pending notifications to send.");
      return;
    }

    console.log(`📨 Found ${tasks.length} tasks to notify.`);

    // Group tasks by user
    const tasksByUser = tasks.reduce((acc: any, task: any) => {
      if (!acc[task.user_id]) {
        acc[task.user_id] = {
          fcm_token: task.fcm_token,
          tasks: [],
        };
      }
      acc[task.user_id].tasks.push(task);
      return acc;
    }, {});

    // Process each user's tasks
    for (const userId in tasksByUser) {
      const { fcm_token, tasks: userTasks } = tasksByUser[userId];

      try {
        console.log(
          `🤖 Generating AI notification for user ${userId} with ${userTasks.length} tasks...`,
        );
        const aiMessage = await generateNotificationWithGroq(userTasks);

        let title = "New Updates in FocusAI";
        let body = "You have new tasks to review.";

        if (aiMessage && aiMessage.title && aiMessage.body) {
          title = aiMessage.title;
          body = aiMessage.body;
        }

        await admin.messaging().send({
          token: fcm_token,
          notification: {
            title: title,
            body: body,
          },
          android: {
            priority: "high",
            notification: {
              icon: "ic_launcher", // Uses app icon resource
              channelId: "default",
            },
          },
          data: {
            type: "AI_EMAIL_UPDATE",
          },
        });

        // 2. Mark processed tasks as sent
        const taskIds = userTasks.map((t: any) => t.id);
        await pool.query(
          "UPDATE email_tasks SET notification_sent = true WHERE id = ANY($1)",
          [taskIds],
        );

        console.log(
          `✅ AI Notification sent for user ${userId} | Marked ${taskIds.length} tasks as sent`,
        );
      } catch (sendError: any) {
        console.error(
          `❌ Failed to send notification for user ${userId}:`,
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
            [fcm_token],
          );
        }
      }
    }
  } catch (error) {
    console.error("❌ Error in checkAndSendNotifications:", error);
  }
};
