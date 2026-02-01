import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import * as service from "./passive-intelligence.service";
import * as aiService from "../ai/connection";
import { createResponse } from "../common/helper/response.hepler";

export const getDashboardData = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id!;
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Parallel fetch
    const [stats, events, insights, tasksDueToday] = await Promise.all([
      service.getDailyStats(userId, today),
      service.getCalendarEvents(userId, startOfDay, endOfDay),
      service.getInsights(userId, 3),
      service.getTasksDueToday(userId),
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
      }),
    );
  },
);

export const getInsightsData = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id!;
    const today = new Date();
    const endDate = today.toISOString().split("T")[0];

    // 1. Fetch Weekly Stats (Last 7 days)
    const weeklyStats = await service.getWeeklyStats(userId, endDate, 7);

    // 2. Fetch AI Insights
    const aiInsights = await service.getInsights(userId, 3);

    // 3. Aggregate Data for Charts
    let totalFocusMinutes = 0;
    let streak = 0;
    let peakDay = { day: "", value: 0 };
    const appUsageMap: Record<string, number> = {};

    // Calculate Streak (consecutive days with activity backwards from today)
    // Note: weeklyStats is ordered ASC.
    const reversedStats = [...weeklyStats].reverse();
    const checkDate = new Date(today);

    // Simple streak: check if entry exists for consecutive previous days
    // A more robust streak would check gaps, but this is a starting point.
    // For now, let's just count days in the last 7 days with focusScore > 0
    streak = weeklyStats.filter((s) => s.focusScore > 0).length;

    weeklyStats.forEach((stat) => {
      // Focus Minutes
      totalFocusMinutes += stat.focusScore || 0; // Assuming focusScore is roughly minutes or points

      // Peak Day
      if ((stat.focusScore || 0) > peakDay.value) {
        peakDay = {
          day: new Date(stat.date).toLocaleDateString("en-US", {
            weekday: "long",
          }),
          value: stat.focusScore || 0,
        };
      }

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
    const weeklyChartData = weeklyStats.map((stat) => ({
      day: new Date(stat.date).toLocaleDateString("en-US", {
        weekday: "short",
      }),
      hours: parseFloat(((stat.focusScore || 0) / 60).toFixed(1)), // Convert to hours
      fullDate: stat.date,
    }));

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
            peakDay: peakDay.day || "None",
            avgDailyFocus: (totalFocusMinutes / 7 / 60).toFixed(1), // Hours
            streak,
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

    const tasks = await service.getEmailTasks(userId, limit);

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
