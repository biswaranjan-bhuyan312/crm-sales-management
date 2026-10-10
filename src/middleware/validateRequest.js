import { validationResult } from "express-validator";

const validationRequest = async(req,res,next)=>{
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        return res.status(400).json({
            success:false,
            message:"Validation failed",
            errors:errors.array().map((error)=>({
                field:error.path,
                message:error.msg
            }))
        });
    }
    next();
}

export default validationRequest;