import userModel from "../models/user.js";
import bcrypt from "bcryptjs";

export const createUser = async(req,res)=>{
    try{
        const {name,email,phone,password,role}=req.body;

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
                message:"Phone number already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password,10);

        const user = await userModel.create({
            name,
            email,
            phone,
            password:hashedPassword,
            role
        });

        return res.status(201).json({
            success:true,
            message:"User created successfully",
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
        if(error.code === 11000){
            return res.status(409).json({
                success:false,
                message:"Email or phone already exists"
            });
        }

        if(error.name === "ValidationError"){
            return res.status(400).json({
                success:false,
                message:error.message
            });
        }

        console.error("Create user error:",error.message);

        return res.status(500).json({
            success:false,
            message:"Internal server error"
        });
    }
}


export const getUser = async (req, res) => {
    try {
        const {
            search,
            role,
            status,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            order = "desc"
        } = req.query;

        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        if (role) {
            filter.role = role;
        }

        if (status) {
            filter.status = status;
        }

        const currentPage = Number(page);
        const pageSize = Number(limit);

        if (
            !Number.isInteger(currentPage) ||
            !Number.isInteger(pageSize) ||
            currentPage < 1 ||
            pageSize < 1 ||
            pageSize > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Page must be positive and limit must be between 1 and 100"
            });
        }

        const allowedSortFields = [
            "name",
            "email",
            "role",
            "status",
            "createdAt",
            "updatedAt"
        ];

        if (
            !allowedSortFields.includes(sortBy) ||
            !["asc", "desc"].includes(order)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid sorting field or order"
            });
        }

        const skip = (currentPage - 1) * pageSize;

        const sortOrder = order === "asc" ? 1 : -1;

        const [users, totalRecords] = await Promise.all([
            userModel
                .find(filter)
                .select("-password -__v")
                .sort({ [sortBy]: sortOrder, _id: 1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),

            userModel.countDocuments(filter)
        ]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No users found",
                users: []
            });
        }

        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            pagination: {
                currentPage,
                pageSize,
                totalRecords,
                totalPages: Math.ceil(totalRecords / pageSize)
            },
            users
        });

    } catch (error) {
        console.error("Get users error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getUserById = async(req,res)=>{
    try{
        const userId = req.params.id;

        if(!userModel.base.Types.ObjectId.isValid(userId)){
            return res.status(400).json({
                success:false,
                message:"Invalid user ID"
            });
        }

        const user = await userModel.findById(userId).select("-password");

        if(!user){
            return res.status(404).json({
                success:false,
                message:"User not found"
            });
        }

        return res.status(200).json({
            success:true,
            message:"User fetched successfully",
            user
        })
    }catch(error){
        console.error("Get user by ID error:",error.message);

        return res.status(500).json({
            success:false,
            message:"Internal server error"
        });
    }
}

export const updateUser = async(req,res)=>{
    try{
        const userId = req.params.id;
        const {name,email,phone,role} = req.body;

        if( name === undefined &&
            email === undefined &&
            phone === undefined &&
            role === undefined
        ){  
            return res.status(400).json({
                success:false,
                message:"Enter atleast one field"
            });
        }
        if(!userModel.base.Types.ObjectId.isValid(userId)){
            return res.status(400).json({
                success:false,
                message:"Invalid user id"
            });
        }

        const user = await userModel.findById(userId);

        if(!user){
            return res.status(404).json({
                success:false,
                message:"User not found"
            });
        }

        const allowedRoles = [
            "Sales Manager",
            "Sales Executive"
        ];

        if(role !== undefined && !allowedRoles.includes(role)){
            return res.status(400).json({
                success:false,
                message:"Invalid role"
            });
        }

        if(email !== undefined){
            const existingEmail = await userModel.findOne({
                email,
                _id:{$ne:userId}//doubt
            });

            if(existingEmail){
                return res.status(409).json({
                    success:false,
                    message:"Email already exists"
                });
            }
        }

        if(phone !== undefined){
            const existingPhone = await userModel.findOne({
                phone,
                _id:{$ne:userId}
            });

            if(existingPhone){
                return res.status(409).json({
                    success:false,
                    message:"Phone number aleardy exists"
                });
            }
        }

        if(name !== undefined)user.name = name;
        if(email !== undefined)user.email = email;
        if(phone !== undefined)user.phone = phone;
        if(role !== undefined)user.role = role;

        await user.save();

        return res.status(200).json({
            success:true,
            message:"User updated successfully",
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
        })
    }catch(error){
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email or phone number already exists"
            });
        }

        console.error("Update user error:",error.message);

        return res.status(500).json({
            success:false,
            message:"Internal server error"
        });
    }
}

export const updateUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const { status } = req.body;

        if (!userModel.base.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be active or inactive"
            });
        }

        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        user.status = status;
        await user.save();

        return res.status(200).json({
            success: true,
            message: `User ${status === "active" ? "activated" : "deactivated"} successfully`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error("Update user status error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}


export const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        if (!userModel.base.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        await userModel.findByIdAndDelete(userId);

        return res.status(200).json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (error) {
        console.error("Delete user error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}