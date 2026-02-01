import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const fixGoogleTokenColumn = async () => {
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
    const sqlPath = path.join(__dirname, "fix_google_token_column.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("Fixing google_access_token column...");
    await pool.query(sql);

    console.log("✅ Column fixed successfully!");
    console.log("The google_access_token column is now properly named.");
  } catch (error) {
    console.error("❌ Fix failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

fixGoogleTokenColumn();
