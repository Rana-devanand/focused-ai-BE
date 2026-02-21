import { getDBPool, initDB } from "../app/common/services/database.service";
import "dotenv/config";

async function run() {
  await initDB();
  const pool = getDBPool();
  try {
    await pool.query(
      "ALTER TABLE email_tasks ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;",
    );
    console.log("Column is_deleted added to email_tasks");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
