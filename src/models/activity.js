import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
        type: {
            type: String,
            enum: [
                "Call",
                "Email",
                "Meeting",
                "Demo",
                "Follow-up",
                "Reminder",
                "Note"
            ],
            required: [true, "Activity type is required"]
        },
        title: {
            type: String,
            required: [true, "Activity title is required"],
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Assigned user is required"]
        },
        dueDate: {
            type: Date,
            required: [true, "Due date is required"]
        },
        status: {
            type: String,
            enum: ["Pending", "Completed", "Overdue"],
            default: "Pending"
        },
        relatedEntityType: {
            type: String,
            enum: ["Lead", "Customer", "Deal", "User"],
            required: true
        },
        relatedEntityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        completedAt: {
            type: Date,
            default: null
        }
    },{ timestamps: true });

activitySchema.index({ assignedTo: 1, status: 1 });
activitySchema.index({ dueDate: 1, status: 1 });
activitySchema.index({ relatedEntityType: 1, relatedEntityId: 1 });

const activityModel = mongoose.models.Activity || mongoose.model("Activity", activitySchema);

export default activityModel;
