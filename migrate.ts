import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const runMigration = async () => {
  const postgresUri = process.env.SUPABASE_POSTGRASE_URL;

  if (!postgresUri) {
    console.error("SUPABASE_POSTGRASE_URL not found in environment variables");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: postgresUri,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log("Connecting to database...");

    // Read the SQL files
    const usersSqlPath = path.join(__dirname, "users.sql");
    const passiveIntelligenceSqlPath = path.join(
      __dirname,
      "passive_intelligence.sql",
    );

    const usersSql = fs.readFileSync(usersSqlPath, "utf8");
    const passiveIntelligenceSql = fs.readFileSync(
      passiveIntelligenceSqlPath,
      "utf8",
    );

    console.log("Running migration for Users table...");
    await pool.query(usersSql);

    console.log("Running migration for Passive Intelligence tables...");
    await pool.query(passiveIntelligenceSql);

    console.log("✅ Migration completed successfully!");
    console.log("Users table created in Supabase PostgreSQL");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigration();
