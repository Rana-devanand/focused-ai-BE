import express from "express";
import path from "path";
import userRoutes from "./user/user.route";
import passiveIntelligenceRoutes from "./passive-intelligence/passive-intelligence.route";
import aiChatRoutes from "./ai-chat/ai-chat.route";
import adminRoutes from "./admin/admin.route";
import testerRoutes from "./tester/tester.route";
import verificationRoutes from "./verification/verification.route";

// routes
const router = express.Router();

router.use("/users", userRoutes);
router.use("/passive", passiveIntelligenceRoutes);
router.use("/ai-chat", aiChatRoutes);
router.use("/admin", adminRoutes);
router.use("/testers", testerRoutes);
router.use("/verification", verificationRoutes);

// Static Pages
router.get("/neurotrack/privacy-policy-policy", (req, res) => {
  res.sendFile(path.join(process.cwd(), "templates", "privacy-policy.html"));
});

// App Version Endpoint for Update Drawer
router.get("/app-version", (req, res) => {
  res.json({
    latestVersion: "32", // Update this string to notify users of a new version!
    forceUpdate: true,
    storeUrl: "market://details?id=com.focusai.mobileapp", // Play Store deep link
    message:
      "✨ A new version of NeuroTrack is out! Please update to get the latest AI tools and bug fixes.",
  });
});

export default router;
