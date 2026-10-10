
import mongoose from "mongoose";
import dealModel from "../models/deal.js";
import timelineModel from "../models/timeLine.js";

export const getDeals = async (req, res) => {
    try {
        const {
            search,
            stage,
            assignedTo,
            minAmount,
            maxAmount,
            startDate,
            endDate,
            sortBy = "createdAt",
            order = "desc",
            page = 1,
            limit = 10
        } = req.query;

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        if (
            !Number.isInteger(pageNumber) ||
            pageNumber < 1 ||
            !Number.isInteger(limitNumber) ||
            limitNumber < 1 ||
            limitNumber > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Page must be positive and limit must be between 1 and 100"
            });
        }

        const allowedSortFields = [
            "name",
            "dealValue",
            "probability",
            "expectedRevenue",
            "expectedClosingDate",
            "stage",
            "createdAt",
            "updatedAt"
        ];

        if (
            !allowedSortFields.includes(sortBy) ||
            !["asc", "desc"].includes(order)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid sorting parameters"
            });
        }

        const filter = {};

        const allowedStages = [
            "Qualification",
            "Discovery",
            "Proposal",
            "Negotiation",
            "Won",
            "Lost"
        ];

        if (stage) {
            if (!allowedStages.includes(stage)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid deal stage"
                });
            }

            filter.stage = stage;
        }

        if (assignedTo) {
            if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid assigned user ID"
                });
            }

            filter.assignedTo = assignedTo;
        }

        if (req.user.role === "Sales Executive") {
            // Executives can see only their own deals.
            filter.assignedTo = req.user.userId;
        }

        if (search) {
            const escapedSearch = search.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            filter.name = {
                $regex: escapedSearch,
                $options: "i"
            };
        }

        if (minAmount !== undefined || maxAmount !== undefined) {
            filter.dealValue = {};

            if (minAmount !== undefined) {
                const minimum = Number(minAmount);

                if (!Number.isFinite(minimum) || minimum < 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Minimum amount must be a non-negative number"
                    });
                }

                filter.dealValue.$gte = minimum;
            }

            if (maxAmount !== undefined) {
                const maximum = Number(maxAmount);

                if (!Number.isFinite(maximum) || maximum < 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Maximum amount must be a non-negative number"
                    });
                }

                filter.dealValue.$lte = maximum;
            }

            if (
                filter.dealValue.$gte !== undefined &&
                filter.dealValue.$lte !== undefined &&
                filter.dealValue.$gte > filter.dealValue.$lte
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Minimum amount cannot exceed maximum amount"
                });
            }
        }

        if (startDate || endDate) {
            filter.expectedClosingDate = {};

            if (startDate) {
                const from = new Date(startDate);

                if (Number.isNaN(from.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid start date"
                    });
                }

                filter.expectedClosingDate.$gte = from;
            }

            if (endDate) {
                const to = new Date(endDate);

                if (Number.isNaN(to.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid end date"
                    });
                }

                to.setUTCHours(23, 59, 59, 999);
                filter.expectedClosingDate.$lte = to;
            }

            if (
                filter.expectedClosingDate.$gte &&
                filter.expectedClosingDate.$lte &&
                filter.expectedClosingDate.$gte >
                    filter.expectedClosingDate.$lte
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Start date cannot be after end date"
                });
            }
        }

        const skip = (pageNumber - 1) * limitNumber;
        const sortDirection = order === "asc" ? 1 : -1;

        const [deals, totalDeals] = await Promise.all([
            dealModel
                .find(filter)
                .populate("lead", "name email phone status")
                .populate("customer", "name email phone company")
                .populate("assignedTo", "name email role")
                .sort({ [sortBy]: sortDirection })
                .skip(skip)
                .limit(limitNumber)
                .lean(),

            dealModel.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: "Deals fetched successfully",
            data: deals,
            pagination: {
                totalDeals,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalDeals / limitNumber),
                limit: limitNumber
            }
        });
    } catch (error) {
        console.error("Get Deals Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getDealById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid deal ID"
            });
        }

        const deal = await dealModel
            .findById(id)
            .populate("lead", "name email phone company status")
            .populate("customer", "name email phone company")
            .populate("assignedTo", "name email role")
            .lean();

        if (!deal) {
            return res.status(404).json({
                success: false,
                message: "Deal not found"
            });
        }

        // Sales Executives can access only their assigned deals.
        if (
            req.user.role === "Sales Executive" &&
            (!deal.assignedTo ||
                deal.assignedTo._id.toString() !== req.user.userId)
        ) {
            return res.status(403).json({
                success: false,
                message: "You can access only deals assigned to you"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Deal fetched successfully",
            data: deal
        });
    } catch (error) {
        console.error("Get Deal By ID Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const updateDeal = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            dealValue,
            probability,
            expectedClosingDate,
            stage,
            description,
            lostReason
        } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid deal ID"
            });
        }

        const deal = await dealModel.findById(id);

        const previousStage = deal.stage;
        const previousAssignedTo = deal.assignedTo
            ? deal.assignedTo.toString()
            : null;

        if (!deal) {
            return res.status(404).json({
                success: false,
                message: "Deal not found"
            });
        }

        // Sales Executives can update only their assigned deals.
        if (
            req.user.role === "Sales Executive" &&
            (!deal.assignedTo ||
                deal.assignedTo.toString() !== req.user.userId)
        ) {
            return res.status(403).json({
                success: false,
                message: "You can update only deals assigned to you"
            });
        }

        // Closed deals cannot return to active stages.
        const closedStages = ["Won", "Lost"];
        const activeStages = [
            "Qualification",
            "Discovery",
            "Proposal",
            "Negotiation"
        ];

        if (
            closedStages.includes(deal.stage) &&
            stage !== undefined &&
            activeStages.includes(stage)
        ) {
            return res.status(400).json({
                success: false,
                message: "Closed deals cannot return to active stages"
            });
        }

        if (name !== undefined) deal.name = name;

        if (dealValue !== undefined) {
            if (!Number.isFinite(dealValue) || dealValue <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Deal value must be greater than zero"
                });
            }

            deal.dealValue = dealValue;
        }

        if (probability !== undefined) {
            if (
                !Number.isFinite(probability) ||
                probability < 0 ||
                probability > 100
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Probability must be between 0 and 100"
                });
            }

            deal.probability = probability;
        }

        
        if (expectedClosingDate !== undefined) {
            if (expectedClosingDate === null || expectedClosingDate === "") {
                deal.expectedClosingDate = null;
            } else {
                const closingDate = new Date(expectedClosingDate);

                if (Number.isNaN(closingDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid expected closing date"
                    });
                }

                const requestedStage = stage ?? deal.stage;
                const isClosedStage = ["Won", "Lost"].includes(requestedStage);

                if (closingDate < new Date() && !isClosedStage) {
                    return res.status(400).json({
                        success: false,
                        message: "Expected closing date cannot be in the past for an active deal"
                    });
                }

                deal.expectedClosingDate = closingDate;
            }
        }


        if (stage !== undefined) {
            const allowedStages = [
                "Qualification",
                "Discovery",
                "Proposal",
                "Negotiation",
                "Won",
                "Lost"
            ];

            if (!allowedStages.includes(stage)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid deal stage"
                });
            }

            if (stage === "Lost" && !lostReason?.trim() && !deal.lostReason) {
                return res.status(400).json({
                    success: false,
                    message: "A reason is required when marking a deal as Lost"
                });
            }

            deal.stage = stage;
        }

        if (description !== undefined) deal.description = description;
        if (lostReason !== undefined) deal.lostReason = lostReason;

       if (deal.stage === "Won") {
    if (!deal.customer || !deal.lead) {
        return res.status(400).json({
            success: false,
            message: "A Won deal must have a valid lead and customer"
        });
    }

        if (!deal.dealValue || deal.dealValue <= 0) {
            return res.status(400).json({
                    success: false,
                    message: "A Won deal must have a deal value greater than zero"
                });
            }

            if (deal.probability !== 100) {
                return res.status(400).json({
                    success: false,
                    message: "Probability must be 100 when a deal is Won"
                });
            }
        }

        // Always recalculate expected revenue on the server.
        deal.expectedRevenue =
            deal.dealValue * deal.probability / 100;

        await deal.save();

        if (previousStage !== deal.stage) {
            await timelineModel.create({
                action: "Deal Stage Changed",
                entityType: "Deal",
                entityId: deal._id,
                performedBy: req.user.userId,
                previousValue: previousStage,
                newValue: deal.stage,
                description: `Deal stage changed from ${previousStage} to ${deal.stage}`
            });

            if (deal.stage === "Won") {
                await timelineModel.create({
                    action: "Deal Won",
                    entityType: "Deal",
                    entityId: deal._id,
                    performedBy: req.user.userId,
                    previousValue: previousStage,
                    newValue: "Won",
                    description: "Deal marked as Won"
                });
            }

            if (deal.stage === "Lost") {
                await timelineModel.create({
                    action: "Deal Lost",
                    entityType: "Deal",
                    entityId: deal._id,
                    performedBy: req.user.userId,
                    previousValue: previousStage,
                    newValue: "Lost",
                    description: `Deal marked as Lost: ${deal.lostReason}`
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Deal updated successfully",
            data: deal
        });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Update Deal Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


