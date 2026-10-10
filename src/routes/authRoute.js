import express from "express";
import { register,login,getCurrentUser,logout } from "../controllers/authController.js";
import { registerValidator,loginValidator } from "../validators/authValidator.js";
import validateRequest from "../middleware/validateRequest.js";
import authMiddleware from "../middleware/authMiddleware.js";

const authRouter = express.Router();

authRouter.post("/register",registerValidator,validateRequest,register);
authRouter.post("/login",loginValidator,validateRequest,login);
authRouter.get("/me",authMiddleware,getCurrentUser);
authRouter.post("/logout", authMiddleware, logout);

export default authRouter;
