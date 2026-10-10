
import express from "express";
import { getCustomers,getCustomerById,updateCustomer,deleteCustomer,createCustomer} from "../controllers/customerController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const customerRouter = express.Router();

customerRouter.get("/", authMiddleware, getCustomers);
customerRouter.get("/:id", authMiddleware, getCustomerById);
customerRouter.put("/:id", authMiddleware, updateCustomer);
customerRouter.delete("/:id", authMiddleware, deleteCustomer);
customerRouter.post("/create-customer", authMiddleware, createCustomer);



export default customerRouter;
