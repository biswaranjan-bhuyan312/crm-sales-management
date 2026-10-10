import express from "express";
import { createLead,getLeads,getLeadById,updateLead,updateLeadStatus,assignLead,getLeadTimeline, deleteLead} from "../controllers/leadController.js";
import { convertLead } from "../controllers/conversionController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import authorizeRoles from "../middleware/authorizeRole.js";

const leadRouter = express.Router();

leadRouter.post("/create-lead",authMiddleware,authorizeRoles(["Admin", "Sales Manager"]),createLead);
leadRouter.get("/",authMiddleware,authorizeRoles(["Admin", "Sales Manager","Sales Executive"]),getLeads);
leadRouter.get("/:id",authMiddleware,authorizeRoles(["Admin", "Sales Manager"]),getLeadById);
leadRouter.put("/:id",authMiddleware,authorizeRoles(["Admin", "Sales Manager"]),updateLead);
leadRouter.patch("/:id/status",authMiddleware,authorizeRoles(["Admin", "Sales Manager"]),updateLeadStatus);
leadRouter.patch("/:id/assign",authMiddleware,authorizeRoles(["Admin", "Sales Manager"]),assignLead);
leadRouter.get("/:id/timeline",authMiddleware,authorizeRoles(["Admin", "Sales Manager"]),getLeadTimeline);
leadRouter.delete("/:id",authMiddleware,authorizeRoles(["Admin", "Sales Manager"]),deleteLead);
leadRouter.post("/:id/convert",authMiddleware,authorizeRoles(["Admin", "Sales Manager", "Sales Executive"]),convertLead);
export default leadRouter;