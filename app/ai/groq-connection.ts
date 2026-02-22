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
  const prompt = `Analyze the user's productivity over the last 7 days and provide a medium, encouraging summary and a performance score (0-100).
  
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

export const generateNotificationWithGroq = async (tasks: any[]) => {
  const taskContent = tasks
    .map(
      (t, index) =>
        `Task ${index + 1}: ${t.subject} (Priority: ${t.priority}, Due: ${t.due_date || "No deadline"})`,
    )
    .join("\n");

  const prompt = `You are a highly intelligent AI assistant for a productivity app. 
  The user has the following pending email tasks that require their attention:
  
  ${taskContent}
  
  Create a highly personalized, detailed, and action-oriented mobile push notification. 
  The notification body MUST specifically mention details from the email tasks above (e.g., exact task subjects, "HIGH priority", or specific due dates). Make the user realize exactly what email is waiting for them.
  
  Requirements:
  1. Clearly mention at least one specific task subject or deadline in the notification body.
  2. Keep it engaging but urgent.
  3. Title should be catchy (max 40 chars).
  4. Body should be detailed and informative (approx 100-180 chars).
  
  Return strictly valid JSON:
  {
    "title": "Notification Title (max 40 chars)",
    "body": "Detailed notification body mentioning specific email subjects or deadlines (max 180 chars)"
  }`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 300,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("No response from Groq");
    return JSON.parse(text);
  } catch (error) {
    console.error("Groq Notification Generation Error:", error);
    return null;
  }
};

export const generateEmailReplyQuestions = async (emailContent: string) => {
  const prompt = `You are an AI assistant helping a user write an email reply.
  Read the following email:
  
  "${emailContent}"
  
  Identify the most important constraints, missing details, or decisions needed to write a perfect reply.
  Generate exactly 3 short, specific questions to ask the user to collect this information.
  Keep them very brief and direct.
  
  Return strictly valid JSON:
  {
    "questions": [
      "Question 1",
      "Question 2",
      "Question 3"
    ]
  }`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 300,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("No response from Groq");
    return JSON.parse(text);
  } catch (error) {
    console.error("Groq Reply Questions Error:", error);
    return null;
  }
};

export const generateEmailReplyDraft = async (
  emailContent: string,
  userAnswers: string[],
) => {
  const prompt = `You are a professional assistant writing an email reply.
  
  Original Email:
  "${emailContent}"
  
  User's Answers / Preferences for the reply:
  ${userAnswers.map((ans, i) => `${i + 1}. ${ans}`).join("\n")}
  
  Write a complete, professional, yet productive email reply draft. Keep it well-structured, polite, and to the point. Do not include subject line in the response body, only the message. Do not use placeholders like [Your Name] unless absolutely necessary, try to leave it blank or neutral.
  
  Return strictly valid JSON:
  {
    "draft": "The full text of the proposed email reply."
  }`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 800,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("No response from Groq");
    return JSON.parse(text);
  } catch (error) {
    console.error("Groq Reply Draft Error:", error);
    return null;
  }
};

export const generateEmailComposeQuestions = async (subject: string) => {
  const prompt = `You are an AI assistant helping a user write a new email from scratch.
  The user has provided the following topic/subject for the email:
  
  "${subject}"
  
  Identify the most important details needed to write a perfect and complete email on this topic.
  Generate exactly 3 short, specific questions to ask the user to collect this information (e.g. "Who is the recipient?", "What is the main goal?", "Are there any deadlines?").
  Keep them very brief and direct.
  
  Return strictly valid JSON:
  {
    "questions": [
      "Question 1",
      "Question 2",
      "Question 3"
    ]
  }`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 300,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("No response from Groq");
    return JSON.parse(text);
  } catch (error) {
    console.error("Groq Compose Questions Error:", error);
    return null;
  }
};

export const generateEmailComposeDraft = async (
  subject: string,
  userAnswers: string[],
) => {
  const prompt = `You are a professional assistant writing a new email.
  
  Email Topic/Subject:
  "${subject}"
  
  User's Answers / Context for the email:
  ${userAnswers.map((ans, i) => `${i + 1}. ${ans}`).join("\n")}
  
  Write a complete, professional, yet productive email draft based on this information. Keep it well-structured, polite, and to the point. Do not include a subject line in the response body, only the message text itself. Try to keep placeholders to a minimum.
  
  Return strictly valid JSON:
  {
    "draft": "The full text of the proposed email."
  }`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_completion_tokens: 600,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content;
    if (!text) throw new Error("No response from Groq");
    return JSON.parse(text);
  } catch (error) {
    console.error("Groq Compose Draft Error:", error);
    return null;
  }
};
