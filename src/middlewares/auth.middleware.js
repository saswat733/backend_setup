import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import {User} from "../models/user.models.js";

//declare a asynchronous function using the asynchhandler function
export const verifyJWT=asyncHandler(async(req, _ ,next)=>{

   try {
    //check if the cookies exists if it is then get the accesstoken || Checks if the token is present in the Authorization header, ////removing the "Bearer" prefix if present
     const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","")
    
     //if ther is no token then request is unauthorized
     if(!token){
         throw new ApiError(401,"unauthorized request")
     }
     
     //using jsonwebstoken to verify the token with secret key
     const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
     
    //  Use the decoded user ID (decodedToken?._id) to find the corresponding user in the database using the User model. Exclude sensitive information such as the password and refresh token.
     const user=await User.findById(decodedToken?._id).select("-password -refreshToken")
 
     if(!user){
         throw new ApiError(401,"Invalid Access Token")
     }
     
    //  Attach the found user object to the req object, making it accessible in subsequent middleware or route handlers.
     req.user=user;

     //pass the control to next middleware
     next()
     
   } catch (error) {
    throw new ApiError(401,error?.message||"Invalid acces token")
   }
})