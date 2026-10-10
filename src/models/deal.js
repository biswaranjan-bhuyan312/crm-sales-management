import mongoose from "mongoose";

const dealSchema = new mongoose.Schema({
        name: {
            type: String,
            required: [true, "Deal name is required"],
            trim: true
        },
        lead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lead",
            required: true
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        dealValue: {
            type: Number,
            required: [true, "Deal value is required"],
            min: [0.01, "Deal value must be greater than zero"]
        },
        probability: {
            type: Number,
            default: 10,
            min: 0,
            max: 100
        },
        expectedRevenue: {
            type: Number,
            default: function () {
                return this.dealValue * this.probability / 100;
            }
        },
        expectedClosingDate: {
            type: Date,
            default: null
        },
        stage: {
            type: String,
            enum: [
                "Qualification",
                "Discovery",
                "Proposal",
                "Negotiation",
                "Won",
                "Lost"
            ],
            default: "Qualification"
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        lostReason: {
            type: String,
            trim: true,
            default: ""
        }
    },{timestamps: true});

dealSchema.index({ lead: 1 });
dealSchema.index({ customer: 1 });
dealSchema.index({ assignedTo: 1 });
dealSchema.index({ stage: 1 });
dealSchema.index({ expectedClosingDate: 1 });

const dealModel = mongoose.models.Deal || mongoose.model("Deal", dealSchema);

export default dealModel;