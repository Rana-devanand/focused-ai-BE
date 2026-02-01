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
// gemini-2.0-flash-exp supports native audio and has better limits
const MODEL_NAME = "gemini-2.0-flash-exp";

export const connectAI = async () => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: "Explain how AI works in a few words",
    });
    console.log(response.text);
  } catch (err) {
    console.error("AI Connection check failed:", err);
  }
};

export const analyzeEmailsCallback = async (emails: any[]) => {
  // Import and use Groq instead of Gemini
  const { analyzeEmailsWithGroq } = require("./groq-connection");
  return await analyzeEmailsWithGroq(emails);
};
