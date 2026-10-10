import mongoose from "mongoose";

const timelineSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            enum: [
                "Lead Created",
                "Lead Assigned",
                "Lead Reassigned",
                "Lead Status Changed",
                "Lead Priority Changed",
                "Note Added",
                "Follow-up Created",
                "Follow-up Completed",
                "Customer Created",
                "Lead Converted",
                "Deal Created",
                "Deal Stage Changed",
                "Deal Assigned",
                "Deal Won",
                "Deal Lost"
            ]
        },

        entityType: {
            type: String,
            required: true,
            enum: ["Lead", "Customer", "Deal"]
        },

        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        previousValue: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        newValue: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        description: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

timelineSchema.index({
    entityType: 1,
    entityId: 1,
    createdAt: -1
});

timelineSchema.index({
    performedBy: 1,
    createdAt: -1
});

const timelineModel =
    mongoose.models.Timeline ||
    mongoose.model("Timeline", timelineSchema);

export default timelineModel;