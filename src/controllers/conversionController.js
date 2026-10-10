import mongoose from "mongoose";
import leadModel from "../models/lead.js";
import customerModel from "../models/customer.js";
import dealModel from "../models/deal.js";
import timelineModel from "../models/timeLine.js";

export const convertLead = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { id } = req.params;
        const { dealValue, probability, expectedClosingDate, description } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead ID"
            });
        }

        if (
            dealValue === undefined ||
            typeof dealValue !== "number" ||
            !Number.isFinite(dealValue) ||
            dealValue <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Deal value must be a number greater than zero"
            });
        }

        if (
            probability !== undefined &&
            (
                typeof probability !== "number" ||
                !Number.isFinite(probability) ||
                probability < 0 ||
                probability > 100
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Probability must be a number between 0 and 100"
            });
        }

        let closingDate = null;

        if (expectedClosingDate !== undefined && expectedClosingDate !== null && expectedClosingDate !== "") {
            closingDate = new Date(expectedClosingDate);

            if (Number.isNaN(closingDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid expected closing date"
                });
            }

            if (closingDate < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: "Expected closing date cannot be in the past"
                });
            }
        }

        let convertedData;

        await session.withTransaction(async () => {
            const lead = await leadModel.findById(id).session(session);

            if (!lead) {
                const error = new Error("Lead not found");
                error.statusCode = 404;
                throw error;
            }

            // Sales Executives can convert only their own assigned leads
            if (
                req.user.role === "Sales Executive" &&
                (!lead.assignedTo ||
                    lead.assignedTo.toString() !== req.user.userId)
            ) {
                const error = new Error(
                    "You can convert only leads assigned to you"
                );
                error.statusCode = 403;
                throw error;
            }

            if (lead.status === "Converted") {
                const error = new Error("Lead has already been converted");
                error.statusCode = 400;
                throw error;
            }

            if (lead.status !== "Qualified") {
                const error = new Error("Only qualified leads can be converted");
                error.statusCode = 400;
                throw error;
            }

            const existingCustomer = await customerModel.findOne({
                originalLead: lead._id
            }).session(session);

            if (existingCustomer) {
                const error = new Error("A customer already exists for this lead");
                error.statusCode = 400;
                throw error;
            }

            const customer = new customerModel({
                name: lead.name,
                email: lead.email || null,
                phone: lead.phone,
                company: lead.company || "",
                originalLead: lead._id,
                assignedTo: lead.assignedTo,
                status: "active"
            });

            await customer.save({ session });

            const deal = new dealModel({
                name: `${lead.company || lead.name} Deal`,
                lead: lead._id,
                customer: customer._id,
                assignedTo: lead.assignedTo,
                dealValue,
                probability: probability ?? 10,
                expectedClosingDate: closingDate,
                description: description || ""
            });

            await deal.save({ session });

            const previousStatus = lead.status;
            lead.status = "Converted";
            await lead.save({ session });

            const performedBy = new mongoose.Types.ObjectId(req.user.userId);

            await timelineModel.create(
                [
                    {
                        action: "Customer Created",
                        entityType: "Customer",
                        entityId: customer._id,
                        performedBy,
                        newValue: customer._id,
                        description: `Customer created by converting lead ${lead._id}`
                    },
                    {
                        action: "Deal Created",
                        entityType: "Deal",
                        entityId: deal._id,
                        performedBy,
                        newValue: deal._id,
                        description: `Deal created during conversion of lead ${lead._id}`
                    },
                    {
                        action: "Lead Converted",
                        entityType: "Lead",
                        entityId: lead._id,
                        performedBy,
                        previousValue: previousStatus,
                        newValue: "Converted",
                        description: `Lead converted into customer ${customer._id} and deal ${deal._id}`
                    }
                ],
                { session, ordered: true }
            );

            convertedData = {
                lead,
                customer,
                deal
            };
        });

        return res.status(201).json({
            success: true,
            message: "Lead converted successfully",
            data: convertedData
        });
    } catch (error) {
        console.error("Lead Conversion Error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Internal server error"
        });
    } finally {
        await session.endSession();
    }
};