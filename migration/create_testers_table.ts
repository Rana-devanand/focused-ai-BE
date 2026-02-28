import { getDBPool, initDB } from "../app/common/services/database.service";
import { loadConfig } from "../app/common/helper/config.hepler";

async function run() {
  loadConfig();
  await initDB();
  const pool = getDBPool();
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS testers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("Table testers created successfully");
  } catch (err) {
    console.error("Error creating testers table:", err);
  } finally {
    process.exit(0);
  }
}
run();
