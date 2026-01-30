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
    const [stats, events, insights] = await Promise.all([
      service.getDailyStats(userId, today),
      service.getCalendarEvents(userId, startOfDay, endOfDay),
      service.getInsights(userId, 3),
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
      }),
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
