import express from "express";
import { createActivity,getActivities,getActivityById,updateActivity,completeActivity,deleteActivity } from "../controllers/activityController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const activityRouter = express.Router();

activityRouter.post("/", authMiddleware, createActivity);
activityRouter.get("/", authMiddleware, getActivities);
activityRouter.get("/:id", authMiddleware, getActivityById);
activityRouter.patch("/:id", authMiddleware, updateActivity);
activityRouter.patch("/:id/complete", authMiddleware, completeActivity);
activityRouter.delete("/:id", authMiddleware, deleteActivity);

export default activityRouter;