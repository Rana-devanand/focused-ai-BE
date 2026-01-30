export interface ICalendarEvent {
  id?: string;
  userId: string;
  externalId?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay?: boolean;
  location?: string;
  source: "GMAIL" | "CALENDAR" | "OUTLOOK" | "DEVICE";
  aiCategory?: string;
  aiSummary?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IEmailTask {
  id?: string;
  userId: string;
  emailId?: string;
  subject: string;
  fromAddress?: string;
  snippet?: string;
  receivedAt?: Date;
  taskDescription?: string;
  isCompleted?: boolean;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  dueDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDailyStats {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  screenTimeMinutes: number;
  meetingCount: number;
  focusScore: number;
  appUsageBreakdown?: {
    packageName: string;
    durationMinutes: number;
    icon?: string;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAIInsight {
  id?: string;
  userId: string;
  type: "BURNOUT_WARNING" | "PRODUCTIVITY_TIP" | "SCHEDULE_OPTIMIZATION";
  message: string;
  metadata?: any;
  isRead?: boolean;
  createdAt?: Date;
}
