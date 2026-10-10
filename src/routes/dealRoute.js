
import express from "express";
import { getDeals,getDealById,updateDeal } from "../controllers/dealController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const dealRouter = express.Router();

dealRouter.get("/", authMiddleware, getDeals);
dealRouter.get("/:id", authMiddleware, getDealById);
dealRouter.patch("/:id", authMiddleware, updateDeal);

export default dealRouter;
