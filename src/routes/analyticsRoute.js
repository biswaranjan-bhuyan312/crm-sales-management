import express from "express";
import { getSalesAnalytics } from "../controllers/analyticsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const analyticsRouter = express.Router();

analyticsRouter.get("/", authMiddleware, getSalesAnalytics);

export default analyticsRouter;
