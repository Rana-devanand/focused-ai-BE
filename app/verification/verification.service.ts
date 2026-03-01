import { sendEmail } from "../common/services/email.service";
import { getBulkVerificationEmailTemplate } from "../template/verification.template";
import { supabaseAdmin } from "../common/services/supabase.admin";
import { generateBulkEmailContent } from "../ai/groq-connection";

export const sendBulkEmail = async (
  userIds: string[],
  subject: string,
  messageBody: string,
  includePlayStoreLink: boolean = false,
) => {
  // Try finding in users table first
  let { data: users, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .in("id", userIds);

  if (userError) throw userError;

  // If no users found, try testers table
  if (!users || users.length === 0) {
    const { data: testers, error: testerError } = await supabaseAdmin
      .from("testers")
      .select("id, name, email")
      .in("id", userIds);
    if (testerError) throw testerError;
    users = testers;
  }

  if (!users || users.length === 0) return { success: true, count: 0 };

  const results = await Promise.allSettled(
    users.map(async (user) => {
      return await sendEmail({
        from: `"NeuroTrack Admin" <${process.env.SMTP_MAIL_USER}>`,
        to: user.email,
        subject: subject,
        html: getBulkVerificationEmailTemplate(
          user.name || "User",
          messageBody,
          includePlayStoreLink,
        ),
      });
    }),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return {
    success: true,
    total: users.length,
    succeeded,
    failed,
  };
};

export const getActiveInstallers = async (
  skip: number = 0,
  limit: number = 10,
  status: string = "not-installed",
) => {
  if (status === "installed") {
    // Return users from 'users' table who HAVE an fcm_token
    const {
      data: users,
      error,
      count,
    } = await supabaseAdmin
      .from("users")
      .select("*", { count: "exact" })
      .not("fcm_token", "is", null)
      .neq("fcm_token", "")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) throw error;
    return {
      users: (users || []).map((u) => ({ ...u, status: "Installed" })),
      count: count || 0,
    };
  } else {
    // 1. Get all active testers
    const { data: testers, error: testersError } = await supabaseAdmin
      .from("testers")
      .select("id, email, name, created_at")
      .eq("active", true);

    if (testersError) throw testersError;
    if (!testers || testers.length === 0) return { users: [], count: 0 };

    // 2. Get users from 'users' table who HAVE an fcm_token (active installers)
    const { data: activeUsers, error: usersError } = await supabaseAdmin
      .from("users")
      .select("email")
      .not("fcm_token", "is", null)
      .neq("fcm_token", "");

    if (usersError) throw usersError;

    const activeEmails = new Set(activeUsers?.map((u) => u.email) || []);

    // 3. Filter testers who are NOT in activeUsers
    const pendingTesters = testers.filter((t) => !activeEmails.has(t.email));

    // 4. Manual pagination for the filtered list
    const paginatedTesters = pendingTesters
      .slice(skip, skip + limit)
      .map((t) => ({
        ...t,
        status: "Not Installed",
      }));

    return {
      users: paginatedTesters,
      count: pendingTesters.length,
    };
  }
};

export const generateEmailContent = async (subject: string) => {
  return await generateBulkEmailContent(subject);
};
