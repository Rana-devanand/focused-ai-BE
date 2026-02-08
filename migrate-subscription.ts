import { ensureSubscriptionColumns } from "./app/user/user.service";
import { initDB } from "./app/common/services/database.service";
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env.local" });

const runMigration = async () => {
  await initDB();
  await ensureSubscriptionColumns();
  console.log("Migration complete");
  process.exit(0);
};

runMigration();
