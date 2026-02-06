export interface IChatMessage {
  id: string;
  userId: string;
  role: "user" | "assistant";
  message: string;
  createdAt: Date;
}

export interface ISendMessageRequest {
  message: string;
}

export interface ISendMessageResponse {
  message: string; // The AI's response
  history: IChatMessage[]; // Updated history (optional, or just the new message)
}
