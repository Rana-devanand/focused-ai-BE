import { type Request, type Response } from "express";
import asyncHandler from "express-async-handler";
import { createResponse } from "../common/helper/response.hepler";
import { getDBPool } from "../common/services/database.service";

export const getAiStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const pool = getDBPool();

  // Get total emails analyzed for this user
  const emailCountQuery = `
    SELECT COUNT(*) as total_emails
    FROM email_tasks
    WHERE user_id = $1
  `;
  const emailCountResult = await pool.query(emailCountQuery, [userId]);
  const totalEmails = parseInt(emailCountResult.rows[0]?.total_emails || "0");

  // Get last analysis date (most recent email task created_at)
  const lastAnalysisQuery = `
    SELECT MAX(created_at) as last_analysis
    FROM email_tasks
    WHERE user_id = $1
  `;
  const lastAnalysisResult = await pool.query(lastAnalysisQuery, [userId]);
  const lastAnalysis = lastAnalysisResult.rows[0]?.last_analysis || null;

  // Calculate days until next analysis (7 days from last analysis)
  let nextAnalysisIn = 7;
  if (lastAnalysis) {
    const lastDate = new Date(lastAnalysis);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 7);
    const today = new Date();
    const daysLeft = Math.ceil(
      (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    nextAnalysisIn = daysLeft > 0 ? daysLeft : 0;
  }

  const stats = {
    emailsSummarized: totalEmails,
    lastAiAnalysis: lastAnalysis,
    nextAnalysisIn,
  };

  res.send(createResponse(stats, "AI stats fetched successfully"));
});
