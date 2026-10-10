import mongoose from "mongoose";
import timelineModel from "../models/timeLine.js";

export const getEntityTimeline = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    if (!["Lead", "Customer", "Deal"].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entity type"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entity ID"
      });
    }

    const timeline = await timelineModel
      .find({ entityType, entityId })
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: timeline.length,
      data: timeline
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};