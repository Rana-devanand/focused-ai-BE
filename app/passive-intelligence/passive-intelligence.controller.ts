import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import * as service from "./passive-intelligence.service";
import * as aiService from "../ai/connection";
import {
  generateEmailReplyDraft,
  generateEmailReplyQuestions,
  generateEmailComposeQuestions,
  generateEmailComposeDraft,
} from "../ai/groq-connection";
import { createResponse } from "../common/helper/response.hepler";
import * as userService from "../user/user.service";

export const getDashboardData = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id!;
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Handle optional month parameter (format: YYYY-MM)
    let year = new Date().getFullYear();
    let monthNum = new Date().getMonth();

    if (req.query.month) {
      const parts = (req.query.month as string).split("-");
      if (parts.length === 2) {
        year = parseInt(parts[0]);
        monthNum = parseInt(parts[1]) - 1;
      }
    }

    const lastDayOfMonth = new Date(year, monthNum + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const endDateString = `${year}-${String(monthNum + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    // Parallel fetch
    const [
      stats,
      events,
      insights,
      tasksDueToday,
      suggestedActions,
      weeklyStats,
    ] = await Promise.all([
      service.getDailyStats(userId, today),
      service.getCalendarEvents(userId, startOfDay, endOfDay),
      service.getInsights(userId, 3),
      service.getTasksDueToday(userId),
      service.getSuggestedActions(userId),
      service.getWeeklyStats(userId, endDateString, daysInMonth),
    ]);

    res.send(
      createResponse({
        stats: stats || {
          screenTimeMinutes: 0,
          meetingCount: 0,
          focusScore: 0,
        },
        events,
        insights,
        tasksDueToday,
        suggestedActions,
        weeklyStats,
      }),
    );
  },
);

// FIXING getDashboardData Logic cleanly:
/*
    const [stats, events, insights, tasksDueToday, suggestedActions] = await Promise.all([
      service.getDailyStats(userId, today),
      service.getCalendarEvents(userId, startOfDay, endOfDay),
      service.getInsights(userId, 3),
      service.getTasksDueToday(userId),
      service.getSuggestedActions(userId),
    ]);
*/
// I will just replace the whole function body in next chunk or do it properly here.
// Actually I can't easily change the destructuring line and this line separately if they are far apart.
// I will just use one large chunk for getDashboardData to be safe.

export const getInsightsData = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id!;

    // Ensure stats columns exist
    await userService.ensureStatsColumns();

    // Check Subscription Status
    const subscriptionService = require("../subscriptions/subscription.service");
    const subStatus =
      await subscriptionService.getUserSubscriptionStatus(userId);

    // Trigger email check (async, don't await)
    subscriptionService.checkAndSendExpiryEmails(userId).catch(console.error);

    if (subStatus.status === "EXPIRED") {
      throw new Error("SUBSCRIPTION_EXPIRED"); // Frontend will handle this specific error message
    }

    const today = new Date();
    const endDate = today.toISOString().split("T")[0];

    // 1. Fetch Weekly Stats (Last 7 days)
    const weeklyStats = await service.getWeeklyStats(userId, endDate, 7);

    // 2. Fetch AI Insights
    const aiInsights = await service.getInsights(userId, 3);

    // 3. Fetch User Streak & Total Active Time
    const user = await userService.getUserById(userId, {
      currentStreak: true,
      totalActiveMinutes: true,
    });

    // 4. Get Performance Analysis (AI Summary + Peak Day)
    const perfAnalysis = await service.getPerformanceAnalysis(userId);

    // Get today's active time
    const todayStat = await service.getDailyStats(userId, endDate);
    const todayActiveMinutes = todayStat?.screenTimeMinutes || 0;

    // 5. Aggregate Data for Charts
    let totalFocusMinutes = 0;
    const appUsageMap: Record<string, number> = {};

    weeklyStats.forEach((stat) => {
      // Focus Minutes
      totalFocusMinutes += stat.focusScore || 0; // Assuming focusScore is roughly minutes or points

      // App Usage Aggregation
      if (Array.isArray(stat.appUsageBreakdown)) {
        stat.appUsageBreakdown.forEach((app: any) => {
          // Aggregate by app name for now as we don't have categories yet
          const name = app.appName || app.packageName;
          appUsageMap[name] =
            (appUsageMap[name] || 0) + (app.durationMinutes || 0);
        });
      }
    });

    // Format Weekly Data for Chart
    const weeklyChartData = weeklyStats.map((stat) => {
      // Use focusScore if available, otherwise fall back to screenTimeMinutes
      const minutes = stat.focusScore || stat.screenTimeMinutes || 0;
      const hours = parseFloat((minutes / 60).toFixed(1));

      return {
        day: new Date(stat.date).toLocaleDateString("en-US", {
          weekday: "short",
        }),
        hours: hours,
        fullDate: stat.date,
        // For chart library
        value: hours,
        label: new Date(stat.date).toLocaleDateString("en-US", {
          weekday: "short",
        }),
      };
    });

    // Format Category Data (Top 5 Apps by time)
    const predefinedColors = [
      "#4D96FF",
      "#6BCB77",
      "#FFD93D",
      "#FF6B6B",
      "#6C63FF",
    ];

    const categoryData = Object.entries(appUsageMap)
      .map(([label, value], index) => ({
        label,
        value: Math.round(value),
        color: predefinedColors[index % predefinedColors.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Start with Top 5 apps

    res.send(
      createResponse(
        {
          weeklyData: weeklyChartData,
          categoryData,
          summary: {
            peakDay: perfAnalysis.peakDay || "None",
            avgDailyFocus: (totalFocusMinutes / 7 / 60).toFixed(1), // Hours
            streak: user?.currentStreak || 0,
            totalActiveHours: parseFloat((todayActiveMinutes / 60).toFixed(1)),
            performanceScore: perfAnalysis.performanceScore || 0,
            performanceSummary:
              perfAnalysis.summary || "Keep up the good work!",
          },
          insights: aiInsights,
        },
        "Insights data retrieved successfully",
      ),
    );
  },
);

export const syncEvents = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id!;
  const { events } = req.body;

  const results = [];
  for (const event of events) {
    const created = await service.createCalendarEvent({
      ...event,
      userId: userId,
    });
    results.push(created);
  }

  res.send(createResponse(results, "Events synced successfully"));
});

export const updateStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id!;
  const statsData = req.body;
  const stats = await service.upsertDailyStats({
    ...statsData,
    userId: userId,
  });
  res.send(createResponse(stats, "Stats updated successfully"));
});

export const updateAppUsage = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id!;
      const { appUsageBreakdown } = req.body;
      const today = new Date().toISOString().split("T")[0];

      // Get existing stats or create new
      let stats = await service.getDailyStats(userId, today);

      const totalScreenTime = appUsageBreakdown.reduce(
        (acc: number, app: any) => acc + (app.durationMinutes || 0),
        0,
      );

      if (stats) {
        // Update existing stats with new app usage data
        stats = await service.upsertDailyStats({
          userId,
          date: today,
          screenTimeMinutes: totalScreenTime,
          meetingCount: stats.meetingCount || 0,
          focusScore: stats.focusScore || 0,
          appUsageBreakdown,
        });
      } else {
        // Create new stats entry
        stats = await service.upsertDailyStats({
          userId,
          date: today,
          screenTimeMinutes: totalScreenTime,
          meetingCount: 0,
          focusScore: 0,
          appUsageBreakdown,
        });
      }

      res.send(createResponse(stats, "App usage updated successfully"));
    } catch (error: any) {
      console.error("❌ Error updating app usage:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        userId: req.user?.id,
        body: req.body,
      });
      throw error;
    }
  },
);

export const analyzeEmails = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id!;
    const { emails } = req.body;

    // 1. Analyze with AI
    const analysis = await aiService.analyzeEmailsCallback(emails);

    // 2. Save Tasks to DB
    if (analysis && analysis.tasks) {
      for (const task of analysis.tasks) {
        // Check mapping logic carefully
        const emailSource = emails[task.email_index || 0] || {};
        await service.createEmailTask({
          userId,
          subject: task.subject,
          taskDescription: task.process_thought,
          priority: task.priority,
          dueDate: task.due_date ? new Date(task.due_date) : undefined,
          snippet: emailSource.snippet,
          emailId: emailSource.id,
          fromAddress: emailSource.from,
        });
      }
    }

    // 3. Save Summary/Insight to DB if available
    if (analysis && analysis.summary) {
      await service.createInsight({
        userId,
        type: "PRODUCTIVITY_TIP",
        message: `Workload Analysis: ${analysis.summary}`,
        metadata: { burnout_risk: analysis.burnout_risk },
      });
    }

    res.send(createResponse(analysis, "Analysis complete"));
  },
);

export const fetchAndAnalyzeEmails = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id!;
    const axios = require("axios");
    const userService = require("../user/user.service");

    console.log("📧 Starting email fetch and analysis for user:", userId);

    // Get user's Google access token
    const user = await userService.getUserById(userId, {
      googleAccessToken: true,
      lastEmailFetch: true,
    });

    // Check Subscription Status
    const subscriptionService = require("../subscriptions/subscription.service");
    const subStatus =
      await subscriptionService.getUserSubscriptionStatus(userId);

    // Trigger email check
    subscriptionService.checkAndSendExpiryEmails(userId).catch(console.error);

    if (subStatus.status === "EXPIRED") {
      res
        .status(403)
        .send(
          createResponse(
            null,
            "Subscription expired. Please upgrade to continue using Email Analysis.",
          ),
        );
      return;
    }

    if (!user.googleAccessToken) {
      console.log("❌ No Google access token found for user");
      // If we don't have a token, we can't do anything.
      // But don't throw error to avoid crashing the app flow, just return.
      res.send(
        createResponse(
          null,
          "Google access token not found. Please sign in with Google again.",
        ),
      );
      return; // Ensure we return here
    }

    // Check if we fetched emails recently (Last 7 days)
    if (user.lastEmailFetch) {
      const lastFetch = new Date(user.lastEmailFetch);
      const diff = new Date().getTime() - lastFetch.getTime();
      const diffDays = diff / (1000 * 3600 * 24);

      if (diffDays < 7) {
        console.log(
          `Skipping email fetch: Last fetch was ${diffDays.toFixed(1)} days ago.`,
        );
        res.send(createResponse(null, "Emails already analyzed recently"));
        return;
      }
    }

    console.log("✅ Google access token found, fetching emails...");

    try {
      // Fetch emails from Gmail API (last 7-10 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const query = `after:${Math.floor(sevenDaysAgo.getTime() / 1000)}`;

      console.log(`📬 Fetching emails from last 7 days (query: ${query})...`);

      const gmailResponse = await axios.get(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages`,
        {
          headers: {
            Authorization: `Bearer ${user.googleAccessToken}`,
          },
          params: {
            q: query,
            maxResults: 50, // Limit to 50 most recent emails
          },
        },
      );

      const messages = gmailResponse.data.messages || [];
      console.log(
        `📨 Found ${messages.length} emails, fetching details for first 20...`,
      );

      // Fetch full email details
      const emails = await Promise.all(
        messages.slice(0, 20).map(async (msg: any) => {
          const emailDetail = await axios.get(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
            {
              headers: {
                Authorization: `Bearer ${user.googleAccessToken}`,
              },
            },
          );

          const payload = emailDetail.data.payload;
          const headers = payload.headers;

          const getHeader = (name: string) =>
            headers.find((h: any) => h.name === name)?.value || "";

          return {
            id: emailDetail.data.id,
            subject: getHeader("Subject"),
            from: getHeader("From"),
            date: getHeader("Date"),
            snippet: emailDetail.data.snippet,
          };
        }),
      );

      console.log(`✅ Successfully fetched ${emails.length} email details`);
      console.log("🤖 Sending emails to AI for analysis...");

      // Analyze emails with AI
      const analysis = await aiService.analyzeEmailsCallback(emails);

      console.log("✅ AI analysis complete!");
      console.log(`   - Tasks found: ${analysis?.tasks?.length || 0}`);
      console.log(`   - Summary: ${analysis?.summary || "N/A"}`);
      console.log(`   - Burnout risk: ${analysis?.burnout_risk || "N/A"}`);

      // Save Tasks to DB
      if (analysis && analysis.tasks) {
        console.log(`💾 Saving ${analysis.tasks.length} tasks to database...`);
        for (const task of analysis.tasks) {
          const emailSource = emails[task.email_index || 0] || {};
          await service.createEmailTask({
            userId,
            subject: task.subject,
            taskDescription: task.process_thought,
            priority: task.priority,
            dueDate: task.due_date ? new Date(task.due_date) : undefined,
            snippet: emailSource.snippet,
            emailId: emailSource.id,
            fromAddress: emailSource.from,
          });
        }
        console.log("✅ Tasks saved successfully");
      }

      // Save Summary/Insight to DB
      if (analysis && analysis.summary) {
        console.log("💾 Saving AI insight to database...");
        await service.createInsight({
          userId,
          type: "PRODUCTIVITY_TIP",
          message: `Email Analysis: ${analysis.summary}`,
          metadata: { burnout_risk: analysis.burnout_risk },
        });
        console.log("✅ Insight saved successfully");
      }

      // Update last_email_fetch timestamp
      await userService.editUser(userId, {
        lastEmailFetch: new Date(),
      });

      console.log("🎉 Email fetch and analysis completed successfully!");

      res.send(
        createResponse(
          {
            emailCount: emails.length,
            analysis,
          },
          "Emails fetched and analyzed successfully",
        ),
      );
    } catch (error: any) {
      console.error("❌ Error fetching/analyzing emails:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });

      if (error.response?.status === 401) {
        throw new Error(
          "Google access token expired. Please sign in with Google again.",
        );
      }

      throw error;
    }
  },
);

export const getEmailTasks = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id!;
    const limit = parseInt(req.query.limit as string) || 20;

    // Parse filter parameters
    const filters: {
      priority?: "HIGH" | "MEDIUM" | "LOW";
      isRead?: boolean;
      isManual?: boolean;
    } = {};

    if (req.query.priority) {
      filters.priority = req.query.priority as "HIGH" | "MEDIUM" | "LOW";
    }

    if (req.query.isRead !== undefined) {
      filters.isRead = req.query.isRead === "true";
    }

    if (req.query.isManual !== undefined) {
      filters.isManual = req.query.isManual === "true";
    }

    const tasks = await service.getEmailTasks(userId, limit, filters);

    res.send(createResponse(tasks, "Email tasks retrieved successfully"));
  },
);

export const updateTaskStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id!;
    const { taskId } = req.params;
    const { isRead, isCompleted } = req.body;

    const task = await service.updateTaskStatus(taskId, userId, {
      isRead,
      isCompleted,
    });

    if (!task) {
      throw new Error("Task not found or update failed");
    }

    res.send(createResponse(task, "Task status updated successfully"));
  },
);

export const createManualTask = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id!;
    const { title, priority, dueDate } = req.body;

    if (!title) {
      throw new Error("Task title is required");
    }

    const task = await service.createManualTask(userId, {
      title,
      priority: priority || "MEDIUM",
      dueDate,
    });

    res.send(createResponse(task, "Task created successfully"));
  },
);

export const getSuggestedActions = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id!;
    const actions = await service.getSuggestedActions(userId);
    res.send(
      createResponse(actions, "Suggested actions retrieved successfully"),
    );
  },
);

export const getDailyMood = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id!;
    const today = new Date().toISOString().split("T")[0];
    const mood = await service.getDailyMood(userId, today);
    res.send(createResponse(mood, "Daily mood retrieved successfully"));
  },
);

export const logDailyMood = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id!;
    const { mood, energy, note } = req.body;
    const today = new Date().toISOString().split("T")[0];

    const result = await service.logDailyMood({
      userId,
      date: today,
      mood,
      energy,
      note,
    });
    res.send(createResponse(result, "Mood logged successfully"));
  },
);

export const deleteTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id!;
  const taskIds =
    req.body.taskIds ||
    (req.query.taskIds ? (req.query.taskIds as string).split(",") : []);

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new Error("Task IDs are required");
  }

  const deletedTasks = await service.softDeleteEmailTasks(userId, taskIds);
  res.send(createResponse(deletedTasks, "Tasks deleted successfully"));
});

export const getReplyQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const { snippet } = req.body;
    if (!snippet) {
      res.status(400).send(createResponse(null, "Snippet is required"));
      return;
    }
    const result = await generateEmailReplyQuestions(snippet);
    res.send(createResponse(result, "Questions generated successfully"));
  },
);

export const getReplyDraft = asyncHandler(
  async (req: Request, res: Response) => {
    const { snippet, answers } = req.body;
    if (!snippet || !answers) {
      res
        .status(400)
        .send(createResponse(null, "Snippet and answers are required"));
      return;
    }
    const result = await generateEmailReplyDraft(snippet, answers);
    res.send(createResponse(result, "Draft generated successfully"));
  },
);

export const getComposeQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const { subject } = req.body;
    if (!subject) {
      res.status(400).send(createResponse(null, "Subject is required"));
      return;
    }
    const result = await generateEmailComposeQuestions(subject);
    res.send(createResponse(result, "Questions generated successfully"));
  },
);

export const getComposeDraft = asyncHandler(
  async (req: Request, res: Response) => {
    const { subject, answers } = req.body;
    if (!subject || !answers) {
      res
        .status(400)
        .send(createResponse(null, "Subject and answers are required"));
      return;
    }
    const result = await generateEmailComposeDraft(subject, answers);
    res.send(createResponse(result, "Draft generated successfully"));
  },
);

export const sendEmail = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id!;
  const { to, subject, body } = req.body;

  if (!to || !subject || !body) {
    res
      .status(400)
      .send(
        createResponse(null, "Missing required fields (to, subject, body)"),
      );
    return;
  }

  const user = await userService.getUserById(userId, {
    googleAccessToken: true,
  });
  if (!user?.googleAccessToken) {
    res
      .status(401)
      .send(
        createResponse(
          null,
          "Google access token not found. Please log in again.",
        ),
      );
    return;
  }

  try {
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset="UTF-8"`,
      "",
      body.replace(/\n/g, "<br>"), // Convert plain text newlines to HTML breaks
    ];

    const email = emailLines.join("\r\n");
    const base64EncodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const axios = require("axios");
    const response = await axios.post(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      { raw: base64EncodedEmail },
      {
        headers: {
          Authorization: `Bearer ${user.googleAccessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    res.send(createResponse(response.data, "Email sent successfully"));
  } catch (error: any) {
    console.error("❌ Error sending email:", error.response?.data || error);
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error(
        "Google access token expired or lacking permission. Please re-authenticate.",
      );
    }
    throw error;
  }
});
