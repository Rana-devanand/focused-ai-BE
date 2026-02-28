import { getDBPool, initDB } from "../app/common/services/database.service";
import { loadConfig } from "../app/common/helper/config.hepler";

async function run() {
  loadConfig();
  await initDB();
  const pool = getDBPool();
  try {
    await pool.query(`
      ALTER TABLE testers 
      ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
    `);
    console.log("Column 'active' added to testers table successfully");
  } catch (err) {
    console.error("Error updating testers table:", err);
  } finally {
    process.exit(0);
  }
}
run();
