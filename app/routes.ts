import express from "express";
import path from "path";
import userRoutes from "./user/user.route";
import passiveIntelligenceRoutes from "./passive-intelligence/passive-intelligence.route";
import aiChatRoutes from "./ai-chat/ai-chat.route";

// routes
const router = express.Router();

router.use("/users", userRoutes);
router.use("/passive", passiveIntelligenceRoutes);
router.use("/ai-chat", aiChatRoutes);

// Static Pages
router.get("/neurotrack/privacy-policy", (req, res) => {
  res.sendFile(path.join(process.cwd(), "templates", "privacy-policy.html"));
});

export default router;
