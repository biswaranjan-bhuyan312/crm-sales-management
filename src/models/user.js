import mongoose from "mongoose";

const userSchema =new mongoose.Schema({
    name:{
        type:String,
        required:[true,"Name is required"],
        trim:true
    },
    email:{
        type:String,
        required:[true,"Email is required"],
        unique:true,
        lowercase:true,
        trim:true
    },
    phone:{
        type:String,
        required:[true,"Phone number is required"],
        unique:true,
        trim:true
    },
    password:{
        type:String,
        required:[true,"Password is required"],
        minlength:[8,"Password must be at least 8 character long"],
        select:false
    },
    role:{
        type:String,
        enum:["Admin","Sales Manager","Sales Executive"],
        required:true
    },
    status:{
        type:String,
        enum:["active","inactive"],
        default:"active",
        required:true
    }
},{timestamps:true});

userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

const userModel = mongoose.models.User || mongoose.model("User",userSchema);

export default userModel;