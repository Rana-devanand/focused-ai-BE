import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "https://osxhrtfcanoxzurtozwc.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGhydGZjYW5veHp1cnRvendjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNTYzNzAsImV4cCI6MjA4NDgzMjM3MH0.WLyXm8bibUqsisllQEdm3oZ2hAJQTKcWiCAA83b7vuU",
  { auth: { persistSession: false } },
);

// Connection check
(async () => {
  console.log("Initializing Supabase...");
  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("count")
      .limit(1);
    if (error && error.code !== "PGRST116") {
      // Ignore "no rows" type errors if just checking connection
      console.error("❌ Supabase connection failed:", error.message);
    } else {
      console.log("✅ Supabase connection successful!");
    }
  } catch (err: any) {
    console.error("❌ Supabase connection error:", err.message);
  }
})();
