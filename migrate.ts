import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

export const runMigration = async () => {
  const postgresUri = process.env.SUPABASE_POSTGRASE_URL;

  if (!postgresUri) {
    console.error("SUPABASE_POSTGRASE_URL not found in environment variables");
    return; // Don't exit process, just return
  }

  const pool = new Pool({
    connectionString: postgresUri,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log("Connecting to database for migration...");

    // Read the SQL files
    // Read the SQL files
    const migrationFiles = [
      "users.sql",
      "passive_intelligence.sql",
      "users_update_fcm.sql",
      "passive_intelligence_update_notification.sql",
      "users_update_notifications.sql",
      "home_screen_enhancements.sql",
      "subscriptions.sql",
    ];

    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, file);
      const sql = fs.readFileSync(filePath, "utf8");
      console.log(`Running migration for ${file}...`);
      await pool.query(sql);
    }

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    // process.exit(1); // Don't exit, just log
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  runMigration();
}
