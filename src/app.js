import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRouter from "./routes/authRoute.js";
import userRouter from "./routes/userRoute.js";
import leadRouter from "./routes/leadRoute.js";
import customerRouter from "./routes/customerRoute.js";
import dealRouter from "./routes/dealRoute.js";
import activityRouter from "./routes/activityRoute.js";
import timelineRouter from "./routes/timeLineRoute.js";
import analyticsRouter from "./routes/analyticsRoute.js";

const app = express();

app.use(helmet());

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({extended:true}));

if(process.env.NODE_DEV === "development"){
    app.use(morgan("dev"));
}

const limiter = rateLimit({
    windowMs: 15*60*1000,
    limit:100,
    standardHeaders:"draft-8",
    legacyHeaders:false,
    message:{
        success:false,
        message:"Too many requests. Please try again later."
    }
});

app.use(limiter);

app.use("/api/auth",authRouter);
app.use("/api/users",userRouter);
app.use("/api/leads", leadRouter);
app.use("/api/customers", customerRouter);
app.use("/api/deals", dealRouter);
app.use("/api/activities", activityRouter);
app.use("/api/timeline", timelineRouter);
app.use("/api/analytics", analyticsRouter);

app.get("/",(req,res)=>{
    res.status(200).json({
        success:true,
        message:"CRM sales management API is running"
    });
});

export default app;