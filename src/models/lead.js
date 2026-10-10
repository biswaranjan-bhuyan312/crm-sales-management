import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
        name: {
            type: String,
            required: [true, "Lead name is required"],
            trim: true
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
            default: null
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true
        },
        company: {
            type: String,
            trim: true,
            default: ""
        },
        source: {
            type: String,
            enum: [
                "Website",
                "Referral",
                "Social Media",
                "Email",
                "Phone",
                "Other"
            ],
            required: [true, "Lead source is required"]
        },
        status: {
            type: String,
            enum: [
                "New",
                "Contacted",
                "Qualified",
                "Unqualified",
                "Converted",
                "Lost"
            ],
            default: "New"
        },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Medium"
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        description: {
            type: String,
            trim: true,
            default: ""
        }
    },{timestamps: true});

leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ createdAt: -1 });

const leadModel =mongoose.models.Lead || mongoose.model("Lead", leadSchema);

export default leadModel;
