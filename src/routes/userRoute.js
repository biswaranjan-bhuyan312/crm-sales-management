import express from "express";
import { createUser,deleteUser,getUser,getUserById,updateUser,updateUserStatus } from "../controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRole.js";

const userRouter = express.Router();

userRouter.post("/create-user",authMiddleware,authorizeRoles(["Admin"]),createUser);
userRouter.get("/",authMiddleware,authorizeRoles(["Admin"]),getUser);
userRouter.get("/:id",authMiddleware,authorizeRoles(["Admin"]),getUserById);
userRouter.patch("/:id",authMiddleware,authorizeRoles(["Admin"]),updateUser);
userRouter.patch("/:id/status",authMiddleware,authorizeRoles(["Admin"]),updateUserStatus);
userRouter.delete("/:id",authMiddleware,authorizeRoles(["Admin"]),deleteUser);

export default userRouter;