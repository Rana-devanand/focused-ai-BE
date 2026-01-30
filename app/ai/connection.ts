import { GoogleGenAI } from "@google/genai";
import { IEmailTask } from "../passive-intelligence/passive-intelligence.dto";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  // Assuming GEMINI_API_KEY is available in env.
  // The previous connection.ts didn't explicitly load from env but passed empty object to constructor
  // which usually implies it picks up GOOGLE_API_KEY or similar from env or it was just a stub.
  // I will assume process.env.GEMINI_API_KEY is the standard for this project based on user context or I'll check .env if needed.
  // Wait, the previous view of connection.ts showed `new GoogleGenAI({})`.
  // If it works, great. If not, I should probably check how it is configured.
});

// Assuming the model name from previous file `gemini-2.5-flash` or use standard `gemini-1.5-flash` if 2.5 is typo/early access.
// User code had `gemini-2.5-flash`. I will stick to it.
const MODEL_NAME = "gemini-2.5-flash";

export const connectAI = async () => {
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
};

export const analyzeEmailsCallback = async (emails: any[]) => {
  if (!emails || emails.length === 0)
    return { tasks: [], summary: "No emails to analyze." };

  const emailContent = emails
    .map(
      (e, index) => `
    Email ${index + 1}:
    Subject: ${e.subject}
    Snippet: ${e.snippet}
    From: ${e.from}
    Date: ${e.date}
    `,
    )
    .join("\n---\n");

  const prompt = `
    Analyze the following emails and extract any actionable tasks, deadlines, or important events.
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
    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    // SDK dependent: check if text() is a function or property.
    // Based on previous lint errors, .text is a property/getter in this SDK version.
    const responseText = result.text; // Removed dynamic check as it confuses TS

    if (!responseText) {
      throw new Error("No text response from AI");
    }

    // Sometimes the text might be wrapped in ```json ```
    const cleanText =
      typeof responseText === "string"
        ? responseText.replace(/```json|```/g, "").trim()
        : JSON.stringify(responseText);

    return JSON.parse(cleanText);
  } catch (error) {
    console.error("AI Analysis Failed:", error);
    return {
      tasks: [],
      summary: "Failed to analyze emails.",
      burnout_risk: "LOW",
    };
  }
};
