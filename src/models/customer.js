import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
        name: {
            type: String,
            required: [true, "Customer name is required"],
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
            required: [true, "Customer phone number is required"],
            trim: true
        },
        company: {
            type: String,
            trim: true,
            default: ""
        },
        address: {
            type: String,
            trim: true,
            default: ""
        },
        originalLead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lead",
            required: true,
            unique: true
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active"
        }
    },{timestamps: true});

customerSchema.index({ name: 1 });
customerSchema.index({ phone: 1 });

const customerModel = mongoose.models.Customer || mongoose.model("Customer", customerSchema);

export default customerModel;