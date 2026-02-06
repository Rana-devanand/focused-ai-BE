import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Analyze emails using Groq AI and extract actionable tasks, deadlines, and workload summary.
 * Returns the same format as the Gemini implementation for compatibility.
 */
export const analyzeEmailsWithGroq = async (emails: any[]) => {
  if (!emails || emails.length === 0) {
    return { tasks: [], summary: "No emails to analyze.", burnout_risk: "LOW" };
  }

  // Limit to top 10 most recent emails to stay within token limits
  const limitedEmails = emails.slice(0, 10);

  const emailContent = limitedEmails
    .map(
      (e, index) => `
    Email ${index + 1}:
    Subject: ${e.subject}
    Snippet: ${e.snippet ? e.snippet.substring(0, 200) : "No snippet"}...
    From: ${e.from}
    Date: ${e.date}
    `,
    )
    .join("\n---\n");

  const prompt = `Analyze the following emails and extract any actionable tasks, deadlines, or important events.
    Also provide a brief summary of the user's workload.
    
    Return the response in strictly valid JSON format with the following structure:
    {
        "tasks": [
            {
                "subject": "Task Title",
                "process_thought": "Why you think this is a task",
                "priority": "HIGH" | "MEDIUM" | "LOW",
                "due_date": "ISO Date string or null",
                "email_index": number (0-based index of source email)
            }
        ],
        "summary": "A brief summary of workload (max 2 sentences).",
        "burnout_risk": "LOW" | "MEDIUM" | "HIGH"
    }

    Emails:
    ${emailContent}
    `;

  try {
    console.log("🤖 Calling Groq AI for email analysis...");

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile", // Using a more reliable model than the experimental one
      temperature: 0.7,
      max_completion_tokens: 2048,
      top_p: 1,
      response_format: { type: "json_object" }, // Ensure JSON response
    });

    const responseText = chatCompletion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error("No response from Groq AI");
    }

    console.log("✅ Groq AI analysis complete");

    // Parse the JSON response
    const analysis = JSON.parse(responseText);

    return analysis;
  } catch (error: any) {
    console.error("❌ Groq AI Analysis Failed:", error.message);

    // Handle rate limiting
    if (error.status === 429 || error.message?.includes("rate limit")) {
      return {
        tasks: [],
        summary: "AI quota reached. Please try again later.",
        burnout_risk: "LOW",
      };
    }

    // Generic error fallback
    return {
      tasks: [],
      summary: "Failed to analyze emails. Please try again later.",
      burnout_risk: "LOW",
    };
  }
};
// ...
// (existing code)
// ...

interface IPerformanceStats {
  date: string;
  focusMinutes: number;
  meetingCount: number;
}

export const analyzePerformanceWithGroq = async (
  stats: IPerformanceStats[],
  streak: number,
) => {
  const prompt = `Analyze the user's productivity over the last 7 days and provide a short, encouraging summary and a performance score (0-100).
  
  Recent Stats:
  ${JSON.stringify(stats, null, 2)}
  
  Current Streak: ${streak} days.
  
  Return strictly valid JSON:
  {
    "performanceScore": number,
    "summary": "Short explanation (max 2 sentences)",
    "peakDay": "Best day of the week (e.g. Monday)"
  }
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("No response from Groq");
    return JSON.parse(text);
  } catch (error) {
    console.error("Groq Performance Analysis Error:", error);
    return {
      performanceScore: 0,
      summary: "Unable to analyze performance at this time.",
      peakDay: "-",
    };
  }
};
