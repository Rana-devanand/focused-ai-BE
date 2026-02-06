import { getDBPool } from "../common/services/database.service";
import Groq from "groq-sdk";
import * as passiveService from "../passive-intelligence/passive-intelligence.service";
import { IChatMessage } from "./ai-chat.dto";

// Initialize Groq with the specific chat API key
const groq = new Groq({
  apiKey: process.env.GROQ_CHAT_API_KEY || process.env.GROQ_API_KEY,
});

const mapRowToChatMessage = (row: any): IChatMessage => ({
  id: row.id,
  userId: row.user_id,
  role: row.role,
  message: row.message,
  createdAt: row.created_at,
});

export const ensureChatTableExists = async () => {
  const pool = getDBPool();
  const query = `
    CREATE TABLE IF NOT EXISTS ai_chat_history (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL, -- Assuming user_id is UUID/Text compatible with other tables
      role VARCHAR(50) NOT NULL, -- 'user' or 'assistant'
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;
  await pool.query(query);
};

export const getChatHistory = async (
  userId: string,
  limit = 20,
): Promise<IChatMessage[]> => {
  const pool = getDBPool();
  await ensureChatTableExists(); // Ensure table exists
  const query = `
    SELECT * FROM ai_chat_history 
    WHERE user_id = $1 
    ORDER BY created_at ASC 
    LIMIT $2
  `; // Fetch oldest first for context window, but we want recent ones.
  // Actually, usually we fetch RECENT messages, so DESC order, then reverse.
  const result = await pool.query(
    `
      SELECT * FROM (
        SELECT * FROM ai_chat_history 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      ) sub
      ORDER BY created_at ASC
  `,
    [userId, limit],
  );
  return result.rows.map(mapRowToChatMessage);
};

export const saveChatMessage = async (
  userId: string,
  role: "user" | "assistant",
  message: string,
): Promise<IChatMessage> => {
  const pool = getDBPool();
  const query = `
    INSERT INTO ai_chat_history (user_id, role, message)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const result = await pool.query(query, [userId, role, message]);
  return mapRowToChatMessage(result.rows[0]);
};

export const processUserMessage = async (
  userId: string,
  userMessage: string,
) => {
  // 1. Save User Message
  await saveChatMessage(userId, "user", userMessage);

  // 2. Gather Context
  // - Recent Chat History
  const history = await getChatHistory(userId, 10); // Last 10 messages

  // - Daily Stats/Mood (Today)
  const today = new Date().toISOString().split("T")[0];
  const dailyStats = await passiveService.getDailyStats(userId, today);
  const dailyMood = await passiveService.getDailyMood(userId, today);

  // - Recent Insights (Last 3)
  const insights = await passiveService.getInsights(userId, 3);

  // 3. Construct System Prompt
  let contextPrompt = `You are a helpful, empathetic, and productivity-neurotrack AI assistant called "NeuroTrack AI".
    Your goal is to help the user stay productive, manage stress, and provide actionable advice.
    
    User Context:
    `;

  if (dailyMood) {
    contextPrompt += `- Current Mood: ${dailyMood.mood} (Energy: ${dailyMood.energy}/10)\n`;
    if (dailyMood.note) contextPrompt += `- Mood Note: ${dailyMood.note}\n`;
  }

  if (dailyStats) {
    contextPrompt += `- Today's Focus Score: ${dailyStats.focusScore}\n`;
    contextPrompt += `- Screen Time: ${dailyStats.screenTimeMinutes} mins\n`;
  }

  if (insights && insights.length > 0) {
    contextPrompt += `- Recent Insights:\n${insights.map((i) => "  * " + i.message).join("\n")}\n`;
  }

  // Format history for Groq
  const messages: any[] = [
    { role: "system", content: contextPrompt },
    ...history.map((msg) => ({ role: msg.role, content: msg.message })),
    // The user message is already in history because we saved it first,
    // BUT getChatHistory fetches from DB.
    // If we saved it, it should be in the fetched history if we fetched AFTER saving.
    // We did fetch AFTER saving.
    // Wait, getChatHistory(limit 10) might miss the just-added message if there are >10 messages?
    // No, we order by created_at DESC and take top 10. The new one is the newest.
  ];

  // Double check if the new message is in history.
  // If we just inserted it, it is the most recent.
  // If history length < limit, it's there.

  // Call Groq
  try {
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 1024,
    });

    const aiResponse =
      completion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response at this time.";

    // 4. Save AI Response
    const savedAiResponse = await saveChatMessage(
      userId,
      "assistant",
      aiResponse,
    );

    return savedAiResponse;
  } catch (error: any) {
    console.error("Error calling Groq for chat:", error);
    throw new Error("Failed to process chat message");
  }
};
