import mongoose from "mongoose";
import customerModel from "../models/customer.js";
import dealModel from "../models/deal.js";


export const getCustomers = async (req, res) => {
    try {
        const {
            search,
            status,
            assignedTo,
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
            "createdAt",
            "updatedAt",
            "company"
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

        if (search) {
            const searchRegex = new RegExp(
                search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                "i"
            );

            filter.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                { company: searchRegex }
            ];
        }

        if (status) {
            if (!["active", "inactive"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid customer status"
                });
            }

            filter.status = status;
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

        if (startDate || endDate) {
            filter.createdAt = {};

            if (startDate) {
                const from = new Date(startDate);

                if (Number.isNaN(from.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid start date"
                    });
                }

                filter.createdAt.$gte = from;
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
                filter.createdAt.$lte = to;
            }

            if (
                filter.createdAt.$gte &&
                filter.createdAt.$lte &&
                filter.createdAt.$gte > filter.createdAt.$lte
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Start date cannot be after end date"
                });
            }
        }

        // Sales Executives can view only their assigned customers.
        if (req.user.role === "Sales Executive") {
            filter.assignedTo = req.user.userId;
        }

        const skip = (pageNumber - 1) * limitNumber;
        const sortDirection = order === "asc" ? 1 : -1;

        const [customers, totalCustomers] = await Promise.all([
            customerModel
                .find(filter)
                .populate("originalLead", "name status")
                .populate("assignedTo", "name email role")
                .sort({ [sortBy]: sortDirection })
                .skip(skip)
                .limit(limitNumber)
                .lean(),

            customerModel.countDocuments(filter)
        ]);

        return res.status(200).json({
            success: true,
            message: "Customers fetched successfully",
            data: customers,
            pagination: {
                totalCustomers,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalCustomers / limitNumber),
                limit: limitNumber
            }
        });
    } catch (error) {
        console.error("Get Customers Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID"
            });
        }

        const customer = await customerModel
            .findById(id)
            .populate("originalLead", "name email phone company status")
            .populate("assignedTo", "name email role")
            .lean();

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        // Sales Executives can access only their assigned customers.
        if (
            req.user.role === "Sales Executive" &&
            (!customer.assignedTo ||
                customer.assignedTo._id.toString() !== req.user.userId)
        ) {
            return res.status(403).json({
                success: false,
                message: "You can access only customers assigned to you"
            });
        }

        const deals = await mongoose.model("Deal")
            .find({ customer: customer._id })
            .populate("assignedTo", "name email role")
            .lean();

        return res.status(200).json({
            success: true,
            message: "Customer fetched successfully",
            data: {
                ...customer,
                deals
            }
        });
    } catch (error) {
        console.error("Get Customer By ID Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, company, address, assignedTo, status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID"
            });
        }

        const customer = await customerModel.findById(id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        // Sales Executives can update only their assigned customers.
        if (
            req.user.role === "Sales Executive" &&
            (!customer.assignedTo ||
                customer.assignedTo.toString() !== req.user.userId)
        ) {
            return res.status(403).json({
                success: false,
                message: "You can update only customers assigned to you"
            });
        }

        // Only Admins can change customer assignment.
        if (assignedTo !== undefined && req.user.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Only Admin can change customer assignment"
            });
        }

        if (name !== undefined) customer.name = name;
        if (email !== undefined) customer.email = email;
        if (phone !== undefined) customer.phone = phone;
        if (company !== undefined) customer.company = company;
        if (address !== undefined) customer.address = address;
        if (status !== undefined) customer.status = status;

        if (assignedTo !== undefined) {
            if (
                assignedTo !== null &&
                !mongoose.Types.ObjectId.isValid(assignedTo)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid assigned user ID"
                });
            }

            customer.assignedTo = assignedTo;
        }

        await customer.save();

        return res.status(200).json({
            success: true,
            message: "Customer updated successfully",
            data: customer
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email or phone number already exists"
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Update Customer Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID"
            });
        }

        const customer = await customerModel.findById(id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        // Only Admins can delete customers.
        if (req.user.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Only Admin can delete customers"
            });
        }

        const existingDeal = await dealModel.exists({
            customer: customer._id
        });

        if (existingDeal) {
            return res.status(409).json({
                success: false,
                message: "Cannot delete customer because associated deals exist"
            });
        }

        await customerModel.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Customer deleted successfully"
        });
    } catch (error) {
        console.error("Delete Customer Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const createCustomer = async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            company,
            address,
            originalLead,
            assignedTo,
            status
        } = req.body;

        if (!name || !phone || !originalLead) {
            return res.status(400).json({
                success: false,
                message: "Name, phone, and original lead are required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(originalLead)) {
            return res.status(400).json({
                success: false,
                message: "Invalid original lead ID"
            });
        }

        const leadModel = (await import("../models/lead.js")).default;
        const lead = await leadModel.findById(originalLead);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Original lead not found"
            });
        }

        const existingCustomer = await customerModel.findOne({
            originalLead
        });

        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "A customer already exists for this lead"
            });
        }

        let assignedUserId = assignedTo ?? null;

        if (assignedUserId !== null) {
            if (!mongoose.Types.ObjectId.isValid(assignedUserId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid assigned user ID"
                });
            }

            const userModel = (await import("../models/user.js")).default;
            const assignedUser = await userModel.findOne({
                _id: assignedUserId,
                role: "Sales Executive",
                status: "active"
            });

            if (!assignedUser) {
                return res.status(400).json({
                    success: false,
                    message: "Assigned user must be an active Sales Executive"
                });
            }
        }

        const customer = await customerModel.create({
            name,
            email,
            phone,
            company,
            address,
            originalLead,
            assignedTo: assignedUserId,
            status
        });

        return res.status(201).json({
            success: true,
            message: "Customer created successfully",
            data: customer
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A customer with this lead, email, or phone already exists"
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Create Customer Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};



