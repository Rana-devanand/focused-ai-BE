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
    const usersSqlPath = path.join(__dirname, "users.sql");
    const passiveIntelligenceSqlPath = path.join(
      __dirname,
      "passive_intelligence.sql",
    );
    const usersUpdateFcmPath = path.join(__dirname, "users_update_fcm.sql");

    const usersSql = fs.readFileSync(usersSqlPath, "utf8");
    const passiveIntelligenceSql = fs.readFileSync(
      passiveIntelligenceSqlPath,
      "utf8",
    );
    const usersUpdateFcmSql = fs.readFileSync(usersUpdateFcmPath, "utf8");

    console.log("Running migration for Users table...");
    await pool.query(usersSql);

    console.log("Running migration for Passive Intelligence tables...");
    await pool.query(passiveIntelligenceSql);

    console.log("Running migration for FCM Token...");
    await pool.query(usersUpdateFcmSql);

    const emailTasksUpdatePath = path.join(
      __dirname,
      "passive_intelligence_update_notification.sql",
    );
    const emailTasksUpdateSql = fs.readFileSync(emailTasksUpdatePath, "utf8");

    console.log("Running migration for Email Tasks Notification...");
    await pool.query(emailTasksUpdateSql);

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
