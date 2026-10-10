import leadModel from "../models/lead.js";
import userModel from "../models/user.js";
import mongoose from "mongoose";
import timelineModel from "../models/timeLine.js";

export const createLead = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            company,
            source,
            priority,
            description
        } = req.body;

        if (!name || !phone || !source) {
            return res.status(400).json({
                success: false,
                message: "Name, phone, and source are required"
            });
        }

        const allowedSources = [
            "Website",
            "Referral",
            "Social Media",
            "Email",
            "Phone",
            "Other"
        ];

        if (!allowedSources.includes(source)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead source"
            });
        }

        const allowedPriorities = ["Low", "Medium", "High"];

        if (priority && !allowedPriorities.includes(priority)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead priority"
            });
        }

        let assignedTo = null;

        if (req.body.assignedTo) {//doubt
            const executive = await userModel.findById(
                req.body.assignedTo
            );

            if (
                !executive ||
                executive.role !== "Sales Executive" ||
                executive.status !== "active"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Assigned user must be an active Sales Executive"
                });
            }

            assignedTo = executive._id;
        }

        const lead = await leadModel.create({
            name,
            email,
            phone,
            company,
            source,
            priority,
            description,
            assignedTo
        });

        return res.status(201).json({
            success: true,
            message: "Lead created successfully",
            lead
        });

    } catch (error) {
        console.error("Create lead error:", error.message);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid field value"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getLeads = async (req, res) => {
    try {
        const {
            search,
            status,
            source,
            priority,
            assignedTo,
            startDate,
            endDate,
            page = 1,
            limit = 10,
            sortBy = "createdAt",
            order = "desc"
        } = req.query;

        const filter = {};

        if (req.user.role === "Sales Executive") {
            filter.assignedTo = req.user.userId;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { company: { $regex: search, $options: "i" } }
            ];
        }

        if (status) {
            filter.status = status;
        }
        if (source) {
            filter.source = source;
        }

        if (priority) {
            filter.priority = priority;
        }


        if (assignedTo) {
            if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid assignedTo ID"
                });
            }

            if (req.user.role === "Sales Executive") {
                if (assignedTo !== req.user.userId) {
                    return res.status(403).json({
                        success: false,
                        message: "You can only view leads assigned to you"
                    });
                }
            } else {
                filter.assignedTo = assignedTo;
            }
        }

        if (startDate || endDate) {
            filter.createdAt = {};

            if (startDate) {
                const start = new Date(startDate);

                if (isNaN(start.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid startDate"
                    });
                }

                filter.createdAt.$gte = start;
            }

            if (endDate) {
                const end = new Date(endDate);

                if (isNaN(end.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid endDate"
                    });
                }

                // Include the entire end date when YYYY-MM-DD is supplied
                if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
                    end.setUTCHours(23, 59, 59, 999);
                }

                filter.createdAt.$lte = end;
            }

            if (
                filter.createdAt.$gte &&
                filter.createdAt.$lte &&
                filter.createdAt.$gte > filter.createdAt.$lte
            ) {
                return res.status(400).json({
                    success: false,
                    message: "startDate must not be after endDate"
                });
            }
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
            "phone",
            "company",
            "status",
            "source",
            "priority",
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

        const [leads, totalRecords] = await Promise.all([
            leadModel.find(filter)
                .sort({ [sortBy]: sortOrder, _id: 1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),

            leadModel.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: "Leads fetched successfully",
            pagination: {
                currentPage,
                pageSize,
                totalRecords,
                totalPages: Math.ceil(totalRecords / pageSize)
            },
            leads
        });
    } catch (error) {
        console.error("Get leads error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getLeadById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead ID"
            });
        }

        const lead = await leadModel.findById(id).lean();

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        // Sales Executives can only view their assigned leads
        if (
            req.user.role === "Sales Executive" &&
            lead.assignedTo?.toString() !== req.user.userId
        ) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to view this lead"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Lead fetched successfully",
            lead
        });

    } catch (error) {
        console.error("Get lead by ID error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const updateLead = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead ID"
            });
        }

        const allowedFields = [
            "name",
            "email",
            "phone",
            "company",
            "source",
            "priority",
            "description"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one valid field to update"
            });
        }

        const lead = await leadModel.findById(id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        Object.assign(lead, updates);

        await lead.save();

        return res.status(200).json({
            success: true,
            message: "Lead updated successfully",
            lead
        });

    } catch (error) {
        console.error("Update lead error:", error.message);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message: "Invalid field value"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const updateLeadStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead ID"
            });
        }

        const allowedStatuses = [
            "New",
            "Contacted",
            "Qualified",
            "Unqualified",
            "Converted",
            "Lost"
        ];

        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Allowed statuses are: New, Contacted, Qualified, Unqualified, Converted, Lost"
            });
        }

        const lead = await leadModel.findById(id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        lead.status = status;

        await lead.save();

        return res.status(200).json({
            success: true,
            message: "Lead status updated successfully",
            lead
        });

    } catch (error) {
        console.error("Update lead status error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const assignLead = async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedTo } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead ID"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
            return res.status(400).json({
                success: false,
                message: "Invalid assignedTo ID"
            });
        }

        const lead = await leadModel.findById(id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        const user = await userModel.findById(assignedTo);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Assigned user not found"
            });
        }

        if (
            user.role !== "Sales Executive" ||
            user.status !== "active"
        ) {
            return res.status(400).json({
                success: false,
                message: "Lead can only be assigned to an active Sales Executive"
            });
        }

        const previousAssignedTo = lead.assignedTo
            ? lead.assignedTo.toString()
            : null;

        const newAssignedTo = user._id.toString();

        if (previousAssignedTo === newAssignedTo) {
            return res.status(200).json({
                success: true,
                message: "Lead is already assigned to this user",
                data: lead
            });
        }

        lead.assignedTo = user._id;
        await lead.save();

        await timelineModel.create({
            action: previousAssignedTo
                ? "Lead Reassigned"
                : "Lead Assigned",
            entityType: "Lead",
            entityId: lead._id,
            performedBy: req.user.userId,
            previousValue: previousAssignedTo,
            newValue: newAssignedTo,
            description: previousAssignedTo
                ? "Lead reassigned to another Sales Executive"
                : "Lead assigned to a Sales Executive"
        });

        return res.status(200).json({
            success: true,
            message: previousAssignedTo
                ? "Lead reassigned successfully"
                : "Lead assigned successfully",
            data: lead
        });
    } catch (error) {
        console.error("Assign Lead Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const getLeadTimeline = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate lead ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead ID"
            });
        }

        // Check whether the lead exists
        const lead = await leadModel.findById(id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        // Retrieve timeline history for this lead
        const timeline = await timelineModel
            .find({
                entityType: "Lead",
                entityId: id
            })
            .populate("performedBy", "name email role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: timeline.length,
            data: timeline
        });
    } catch (error) {
        console.error("Get Lead Timeline Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const deleteLead = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate lead ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid lead ID"
            });
        }

        // Find the lead
        const lead = await leadModel.findById(id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        // Prevent deletion of converted leads
        if (lead.status === "Converted") {
            return res.status(400).json({
                success: false,
                message: "Converted leads cannot be deleted"
            });
        }

        await leadModel.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Lead deleted successfully"
        });
    } catch (error) {
        console.error("Delete Lead Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

