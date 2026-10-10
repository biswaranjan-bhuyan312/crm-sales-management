import  jwt from "jsonwebtoken";

const createToken = (user) =>{
    return jwt.sign(
        {
            userId:user._id,
            role:user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn:"1d"
        }
    );
}

export default createToken;