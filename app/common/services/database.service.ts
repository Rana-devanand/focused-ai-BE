// import { Pool } from "pg";

// let pool: Pool | null = null;

// export const getDBPool = (): Pool => {
//   if (!pool) {
//     throw new Error("Database not initialized. Call initDB first.");
//   }
//   return pool;
// };

// export const initDB = async (): Promise<boolean> => {
//   return await new Promise((resolve, reject) => {
//     const postgresUri = process.env.SUPABASE_POSTGRASE_URL ?? "";

//     if (postgresUri === "") {
//       throw new Error("Supabase PostgreSQL URI not found!");
//     }

//     const connectWithRetry = async () => {
//       try {
//         // Parse the hostname from the URI
//         // Handle potential parsing errors loosely or trust the URI is valid since app depends on it
//         let connectionConfig: any = {
//           connectionString: postgresUri,
//           ssl: {
//             rejectUnauthorized: false, // Required for Supabase
//           },
//         };

//         try {
//           // Explicitly resolve hostname to IPv4 to avoid IPv6 connection issues (common on Render/Supabase)
//           // We use a dynamic import or require to ensure we can use dns
//           const dns = await import("node:dns");
//           const { URL } = await import("node:url");

//           const parsedUrl = new URL(postgresUri);
//           const hostname = parsedUrl.hostname;

//           if (hostname && !hostname.match(/^[\d.]+$/)) {
//             // If not already an IP
//             await new Promise<void>((resolveDns, rejectDns) => {
//               dns.lookup(hostname, { family: 4 }, (err, address) => {
//                 if (err || !address) {
//                   console.warn(
//                     "DNS lookup failed, proceeding with original hostname:",
//                     err?.message,
//                   );
//                 } else {
//                   console.log(
//                     `Resolved DB host ${hostname} to IPv4: ${address}`,
//                   );
//                   connectionConfig.host = address; // Override host with IP
//                   connectionConfig.port = parseInt(parsedUrl.port) || 5432;
//                 }
//                 resolveDns();
//               });
//             });
//           }
//         } catch (dnsErr) {
//           console.warn(
//             "DNS resolution step failed, proceeding with standard connection:",
//             dnsErr,
//           );
//         }

//         pool = new Pool(connectionConfig);

//         // Test the connection
//         pool.query("SELECT NOW()", (err: Error | null, res: any) => {
//           if (err) {
//             console.error("Database connection error:", err);
//             reject(err);
//           } else {
//             console.log("DB Connected! Server time:", res.rows[0].now);
//             resolve(true);
//           }
//         });
//       } catch (error) {
//         console.error("Failed to initialize database pool:", error);
//         reject(error);
//       }
//     };

//     void connectWithRetry();
//   });
// };
