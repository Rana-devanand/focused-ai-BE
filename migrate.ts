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

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "users.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    console.log("Running migration...");
    await pool.query(sql);

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
