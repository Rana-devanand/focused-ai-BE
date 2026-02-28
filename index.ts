import bodyParser from "body-parser";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import http from "http";
import morgan from "morgan";
import dns from "node:dns";
import rateLimit from "express-rate-limit";

// Force IPv4 for database connection (Supabase often resolves to IPv6 which can fail in some environments)
dns.setDefaultResultOrder("ipv4first");

import { loadConfig } from "./app/common/helper/config.hepler";
loadConfig();

import errorHandler from "./app/common/middleware/error-handler.middleware";
// import { initDB } from "./app/common/services/database.service";
import { initPassport } from "./app/common/services/passport-jwt.service";
import routes from "./app/routes";
import { type IUser } from "./app/user/user.dto";
import { testSupabaseConnection } from "./app/common/services/supabase.admin";
import { initDB } from "./app/common/services/database.service";
import { runMigration } from "./migration/migrate";
import { connectAI } from "./app/ai/connection";
import { initNotificationService } from "./app/notification/notification.service";

declare global {
  namespace Express {
    interface User extends Omit<IUser, "password"> {}
    interface Request {
      user?: User;
    }
  }
}

const port = Number(process.env.PORT) ?? 5000;

const app: Express = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per `window`
  message: {
    status: 429,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://10.248.57.83:5173",
  "https://app.neurotrack.foocusedai.com",
];

// Apply CORS before rate limiter
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Apply rate limiter globally
app.use(apiLimiter);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(morgan("dev"));

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  console.log("Body:", req.body);
  next();
});

const initApp = async (): Promise<void> => {
  // init mongodb (postgres)
  await initDB();
  // await runMigration(); // Auto-run migration
  await testSupabaseConnection();
  initNotificationService(); // Init hourly notifications
  // connectAI();

  // passport init
  initPassport();

  // set base path to /api
  app.use("/api", routes);

  app.get("/", (req: Request, res: Response) => {
    res.send({ status: "ok" });
  });

  // error handler
  app.use(errorHandler);
  http.createServer(app).listen(port, () => {
    console.log("Server is runnuing on port", port);
  });
};

void initApp();
