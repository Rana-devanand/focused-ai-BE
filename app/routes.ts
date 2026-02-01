import express from "express";
import userRoutes from "./user/user.route";
import passiveIntelligenceRoutes from "./passive-intelligence/passive-intelligence.route";


// routes
const router = express.Router();

router.use("/users", userRoutes);
router.use("/passive", passiveIntelligenceRoutes);

export default router;
