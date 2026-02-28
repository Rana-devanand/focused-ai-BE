import { getDBPool, initDB } from "../app/common/services/database.service";
import { loadConfig } from "../app/common/helper/config.hepler";

async function run() {
  loadConfig();
  await initDB();
  const pool = getDBPool();
  try {
    await pool.query(`ALTER TABLE testers DISABLE ROW LEVEL SECURITY;`);
    console.log("RLS disabled for testers table");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
