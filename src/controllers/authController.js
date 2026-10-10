import userModel from "../models/user.js";
import bcrypt from "bcryptjs";
import createToken from "../utils/createToken.js";
import jwt from "jsonwebtoken";
import blacklistedTokenModel from "../models/blacklistedToken.js";

export const register = async(req,res)=>{
    try{
        const {name,email,phone,password,role} = req.body;

        const allowedRoles = [
            "Admin",
            "Sales Manager",
            "Sales Executive"
        ];

        if(!allowedRoles.includes(role)){
            return res.status(400).json({
                success:false,
                message:"Invalid role"
            })
        }

        const existingEmail = await userModel.findOne({email});
        if(existingEmail){
            return res.status(409).json({
                success:false,
                message:"Email already exists"
            });
        }

        const existingPhone = await userModel.findOne({phone});
        if(existingPhone){
            return res.status(409).json({
                success:false,
                message:"Mobile number already exists"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await userModel.create({
            name,
            email,
            phone,
            password:hashedPassword,
            role
        });

        const token = createToken(user);

        return res.status(201).json({
            success:true,
            message:"Registration successful",
            token,
            user:{
                id:user._id,
                name:user.name,
                email:user.email,
                phone:user.phone,
                role:user.role,
                status:user.status,
                createdAt:user.createdAt,
                updatedAt:user.updatedAt
            }
        });
    }catch(error){

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email or phone number already exists"
            });
        }

        if(error.name === "ValidationError"){
            return res.status(400).json({
                success:false,
                message:error.message
            });
        }

        console.error("Registration error:", error.message);

        return res.status(500).json({
            success:false,
            message:"Internal server error"
        });
    }
}

export const login = async(req,res)=>{
    try{
        const {email,password} = req.body;

        const user =await userModel.findOne({email}).select("+password");

        if(!user){
            return res.status(401).json({
                success:false,
                message:"Invalid email or password"
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if(!isPasswordValid){
            return res.status(401).json({
                success:false,
                message:"Invalid email or password"
            });
        }

        if(user.status !== "active"){
            return res.status(403).json({
                success:false,
                message:"Your account is inactive"
            });
        }

        const token = createToken(user);

        return res.status(200).json({
            success:true,
            message:"Login successful",
            token,
            user:{
                id:user._id,
                name:user.name,
                email:user.email,
                phone:user.phone,
                role:user.role,
                status:user.status,
                createdAt:user.createdAt,
                updatedAt:user.updatedAt
            }
        });
    }catch(error){
        console.error("Login error:",error.message);
        return res.status(500).json({
            success:false,
            message:"Internal server error"
        });
    }
}

export const getCurrentUser = async(req,res)=>{
    try{
        const user = await userModel.findById(req.user.userId);

        if(!user){
            return res.status(404).json({
                success:false,
                message:"User not found"
            });
        }

        return res.status(200).json({
            success:true,
            user:{
                id:user._id,
                name:user.name,
                email:user.email,
                phone:user.phone,
                role:user.role,
                status:user.status,
                createdAt:user.createdAt,
                updatedAt:user.updatedAt
            }
        });
    }catch(error){
        console.error("Get current user error:",error.message);

        return res.status(500).json({
            success:false,
            message:"Internal server error"
        });
    }
}

export const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(" ")[1];

        const decoded = jwt.decode(token);

        if (!decoded || !decoded.exp) {
            return res.status(401).json({
                success: false,
                message: "Invalid token"
            });
        }

        const expiresAt = new Date(decoded.exp * 1000);

        await blacklistedTokenModel.create({
            token,
            expiresAt
        });

        return res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).json({
                success: true,
                message: "Logout successful"
            });
        }

        console.error("Logout error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};