import { sendEmail } from "../common/services/email.service";
import { getBulkVerificationEmailTemplate } from "../template/verification.template";
import { supabaseAdmin } from "../common/services/supabase.admin";
import { generateBulkEmailContent } from "../ai/groq-connection";

export const sendBulkEmail = async (
  userIds: string[],
  subject: string,
  messageBody: string,
) => {
  // Fetch user details for names/emails
  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, name, email")
    .in("id", userIds);

  if (error) throw error;
  if (!users) return { success: true, count: 0 };

  const results = await Promise.allSettled(
    users.map(async (user) => {
      return await sendEmail({
        from: `"NeuroTrack Admin" <${process.env.SMTP_MAIL_USER}>`,
        to: user.email,
        subject: subject,
        html: getBulkVerificationEmailTemplate(
          user.name || "User",
          messageBody,
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
) => {
  // App installation is indicated by the presence of an fcm_token
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
    users,
    count: count || 0,
  };
};

export const generateEmailContent = async (subject: string) => {
  return await generateBulkEmailContent(subject);
};
