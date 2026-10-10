import express from "express";
import { getEntityTimeline } from "../controllers/timeLineController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const timelineRouter = express.Router();

timelineRouter.get("/:entityType/:entityId", authMiddleware, getEntityTimeline);

export default timelineRouter;