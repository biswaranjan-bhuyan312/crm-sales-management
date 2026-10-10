import mongoose from "mongoose";

const blacklistedTokenSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true
        },
        expiresAt: {
            type: Date,
            required: true,
            expires: 0
        }
    },
    {
        timestamps: true
    }
);

const blacklistedTokenModel =
    mongoose.models.BlacklistedToken ||
    mongoose.model("BlacklistedToken", blacklistedTokenSchema);

export default blacklistedTokenModel;