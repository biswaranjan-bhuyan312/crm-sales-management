import mongoose from "mongoose";
import activityModel from "../models/activity.js";
import timelineModel from "../models/timeLine.js";

export const createActivity = async (req, res) => {
    try {
        const {
            type,
            title,
            description,
            assignedTo,
            dueDate,
            relatedEntityType,
            relatedEntityId
        } = req.body;

        if (
            !type ||
            !title ||
            !assignedTo ||
            !dueDate ||
            !relatedEntityType ||
            !relatedEntityId
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required activity fields"
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(assignedTo) ||
            !mongoose.Types.ObjectId.isValid(relatedEntityId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid assigned user or related entity ID"
            });
        }

        const parsedDueDate = new Date(dueDate);

        if (Number.isNaN(parsedDueDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid due date"
            });
        }

        const activity = await activityModel.create({
            type,
            title,
            description,
            assignedTo,
            dueDate: parsedDueDate,
            relatedEntityType,
            relatedEntityId,
            createdBy: req.user.userId
        });

        await timelineModel.create({
            action: "Follow-up Created",
            entityType:
                ["Lead", "Customer", "Deal"].includes(relatedEntityType)
                    ? relatedEntityType
                    : "Deal",
            entityId: relatedEntityId,
            performedBy: req.user.userId,
            newValue: activity._id,
            description: `Activity created: ${title}`
        });

        return res.status(201).json({
            success: true,
            message: "Activity created successfully",
            data: activity
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getActivities = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      type,
      assignedTo,
      relatedEntityType,
      relatedEntityId
    } = req.query;

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));

    // Mark pending activities with past due dates as overdue.
    await activityModel.updateMany(
      {
        status: "Pending",
        dueDate: { $lt: new Date() }
      },
      { $set: { status: "Overdue" } }
    );

    const filter = {};

    if (req.user.role === "Sales Executive") {
        filter.assignedTo = req.user.userId;
    }

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (relatedEntityType) filter.relatedEntityType = relatedEntityType;
    if (relatedEntityId) filter.relatedEntityId = relatedEntityId;

    const [activities, total] = await Promise.all([
      activityModel
        .find(filter)
        .populate("assignedTo", "name email role")
        .populate("createdBy", "name email")
        .sort({ dueDate: 1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize),
      activityModel.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      count: activities.length,
      total,
      page: currentPage,
      totalPages: Math.ceil(total / pageSize),
      data: activities
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


export const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID"
      });
    }

    const activity = await activityModel
      .findById(id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email");

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: activity
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, description, assignedTo, dueDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID"
      });
    }

    const activity = await activityModel.findById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found"
      });
    }

    if (activity.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Completed activities cannot be updated"
      });
    }

    if (type !== undefined) activity.type = type;
    if (title !== undefined) activity.title = title;
    if (description !== undefined) activity.description = description;

    if (assignedTo !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assigned user ID"
        });
      }

      activity.assignedTo = assignedTo;
    }

    if (dueDate !== undefined) {
      const parsedDueDate = new Date(dueDate);

      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid due date"
        });
      }

      activity.dueDate = parsedDueDate;
      activity.status =
        parsedDueDate < new Date() ? "Overdue" : "Pending";
    }

    await activity.save();

    return res.status(200).json({
      success: true,
      message: "Activity updated successfully",
      data: activity
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const completeActivity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID"
      });
    }

    const activity = await activityModel.findById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found"
      });
    }

    if (activity.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Activity is already completed"
      });
    }

    activity.status = "Completed";
    activity.completedAt = new Date();

    await activity.save();

    if (["Lead", "Customer", "Deal"].includes(activity.relatedEntityType)) {
      await timelineModel.create({
        action: "Follow-up Completed",
        entityType: activity.relatedEntityType,
        entityId: activity.relatedEntityId,
        performedBy: req.user.userId,
        previousValue: activity._id,
        newValue: "Completed",
        description: `Activity completed: ${activity.title}`
      });
    }

    return res.status(200).json({
      success: true,
      message: "Activity completed successfully",
      data: activity
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid activity ID"
      });
    }

    const activity = await activityModel.findById(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found"
      });
    }

    await activityModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Activity deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


