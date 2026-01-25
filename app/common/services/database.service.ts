import { Pool } from "pg";

let pool: Pool | null = null;

export const getDBPool = (): Pool => {
  if (!pool) {
    throw new Error("Database not initialized. Call initDB first.");
  }
  return pool;
};

export const initDB = async (): Promise<boolean> => {
  return await new Promise((resolve, reject) => {
    const postgresUri = process.env.SUPABASE_POSTGRASE_URL ?? "";

    if (postgresUri === "") {
      throw new Error("Supabase PostgreSQL URI not found!");
    }

    try {
      pool = new Pool({
        connectionString: postgresUri,
        ssl: {
          rejectUnauthorized: false, // Required for Supabase
        },
      });

      // Test the connection
      pool.query("SELECT NOW()", (err: Error | null, res: any) => {
        if (err) {
          console.error("Database connection error:", err);
          reject(err);
        } else {
          console.log("DB Connected! Server time:", res.rows[0].now);
          resolve(true);
        }
      });
    } catch (error) {
      console.error("Failed to initialize database pool:", error);
      reject(error);
    }
  });
};
