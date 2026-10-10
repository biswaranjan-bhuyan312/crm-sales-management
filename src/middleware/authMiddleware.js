
import jwt from "jsonwebtoken";
import userModel from "../models/user.js";
import blacklistedTokenModel from "../models/blacklistedToken.js";

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const blacklistedToken = await blacklistedTokenModel.findOne({
            token
        });

        if (blacklistedToken) {
            return res.status(401).json({
                success: false,
                message: "You have been logged out. Please log in again."
            });
        }

        const user = await userModel.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User account not found"
            });
        }

        if (user.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive"
            });
        }

        req.user = {
            userId: user._id.toString(),
            role: user.role
        };

        next();
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        console.error("Authentication error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export default authMiddleware;