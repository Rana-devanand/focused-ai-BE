import { supabaseAdmin } from "../common/services/supabase.admin";
import { type ITester } from "./tester.dto";
import { sendEmail } from "../common/services/email.service";
import { getTesterWelcomeEmailTemplate } from "../template/tester.template";

export const addTester = async (data: {
  name: string;
  email: string;
  message: string;
}) => {
  const { data: tester, error } = await supabaseAdmin
    .from("testers")
    .insert([
      {
        name: data.name,
        email: data.email,
        message: data.message,
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Send automated thank you email
  try {
    await sendEmail({
      from: `"NeuroTrack Team" <${process.env.SMTP_MAIL_USER}>`,
      to: data.email,
      subject: "Welcome to NeuroTrack Beta!",
      html: getTesterWelcomeEmailTemplate(data.name),
    });

    // Notify Admin
    await sendEmail({
      from: `"NeuroTrack System" <${process.env.SMTP_MAIL_USER}>`,
      to: "helpdesk.neurotrack@gmail.com",
      subject: "New Tester Registered!",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #6C3BFF;">New Tester Registration</h2>
          <p>A new user has registered as a tester:</p>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Name:</strong> ${data.name}</li>
            <li><strong>Email:</strong> ${data.email}</li>
            <li><strong>Message:</strong> ${data.message || "No message provided"}</li>
          </ul>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #888;">This is an automated notification from the NeuroTrack Admin System.</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Failed to send registration emails:", emailError);
  }

  return tester;
};

export const getAllTesters = async () => {
  const { data: testers, error } = await supabaseAdmin
    .from("testers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return testers;
};

export const updateTesterStatus = async (id: string, active: boolean) => {
  const { data: tester, error } = await supabaseAdmin
    .from("testers")
    .update({ active })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return tester;
};
