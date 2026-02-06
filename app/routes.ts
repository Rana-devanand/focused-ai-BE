import express from "express";
import userRoutes from "./user/user.route";
import passiveIntelligenceRoutes from "./passive-intelligence/passive-intelligence.route";
import aiChatRoutes from "./ai-chat/ai-chat.route";

// routes
const router = express.Router();

router.use("/users", userRoutes);
router.use("/passive", passiveIntelligenceRoutes);
router.use("/ai-chat", aiChatRoutes);

export default router;
