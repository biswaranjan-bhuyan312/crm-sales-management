import leadModel from "../models/lead.js";
import customerModel from "../models/customer.js";
import dealModel from "../models/deal.js";
import activityModel from "../models/activity.js";
import userModel from "../models/user.js";


export const getSalesAnalytics = async (req, res) => {
  try {
    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      totalCustomers,
      totalDeals,
      openDeals,
      wonDeals,
      lostDeals,
      totalRevenue,
      expectedRevenue,
      pendingActivities,
      overdueActivities
    ] = await Promise.all([
      leadModel.countDocuments(),
      leadModel.countDocuments({ status: "New" }),
      leadModel.countDocuments({ status: "Qualified" }),
      leadModel.countDocuments({ status: "Converted" }),
      customerModel.countDocuments(),
      dealModel.countDocuments(),
      dealModel.countDocuments({
        stage: { $nin: ["Won", "Lost"] }
      }),
      dealModel.countDocuments({ stage: "Won" }),
      dealModel.countDocuments({ stage: "Lost" }),
      dealModel.aggregate([
        { $match: { stage: "Won" } },
        { $group: { _id: null, total: { $sum: "$dealValue" } } }
      ]),
      dealModel.aggregate([
        { $match: { stage: { $nin: ["Won", "Lost"] } } },
        { $group: { _id: null, total: { $sum: "$expectedRevenue" } } }
      ]),
      activityModel.countDocuments({ status: "Pending" }),
      activityModel.countDocuments({ status: "Overdue" })
    ]);


    const pipeline = await dealModel.aggregate([
    {
        $match: {
        stage: { $nin: ["Won", "Lost"] }
        }
    },
    {
        $group: {
        _id: "$stage",
        dealCount: { $sum: 1 },
        totalValue: { $sum: "$dealValue" },
        expectedRevenue: { $sum: "$expectedRevenue" }
        }
    },
    {
        $sort: { _id: 1 }
    }
    ]);

    const conversionRate =
    totalLeads > 0
        ? Number(((convertedLeads / totalLeads) * 100).toFixed(2))
        : 0;

    const teamPerformance = await userModel.aggregate([
    {
        $match: {
        status: "active",
        role: { $in: ["Sales Manager", "Sales Executive"] }
        }
    },
    {
        $lookup: {
        from: "leads",
        localField: "_id",
        foreignField: "assignedTo",
        as: "assignedLeads"
        }
    },
    {
        $lookup: {
        from: "deals",
        localField: "_id",
        foreignField: "assignedTo",
        as: "assignedDeals"
        }
    },
    {
        $project: {
        name: 1,
        role: 1,
        assignedLeadCount: { $size: "$assignedLeads" },
        assignedDealCount: { $size: "$assignedDeals" },
        wonDeals: {
            $size: {
            $filter: {
                input: "$assignedDeals",
                as: "deal",
                cond: { $eq: ["$$deal.stage", "Won"] }
            }
            }
        },
        wonRevenue: {
            $sum: {
            $map: {
                input: {
                $filter: {
                    input: "$assignedDeals",
                    as: "deal",
                    cond: { $eq: ["$$deal.stage", "Won"] }
                }
                },
                as: "deal",
                in: "$$deal.dealValue"
            }
            }
        }
        }
    },
    { $sort: { name: 1 } }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        leads: {
          total: totalLeads,
          new: newLeads,
          qualified: qualifiedLeads,
          converted: convertedLeads
        },
        customers: {
          total: totalCustomers
        },
        deals: {
          total: totalDeals,
          open: openDeals,
          won: wonDeals,
          lost: lostDeals
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          expected: expectedRevenue[0]?.total || 0
        },
        activities: {
          pending: pendingActivities,
          overdue: overdueActivities
        }
      },
      pipeline: pipeline.map((item) => ({
        stage: item._id,
        dealCount: item.dealCount,
        totalValue: item.totalValue,
        expectedRevenue: item.expectedRevenue
      })),
      conversionRate,
      teamPerformance
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};