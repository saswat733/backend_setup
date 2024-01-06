import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from '../utils/ApiError.js'
import { User } from "../models/user.models.js"
import uploadOnCloudinary from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js"


const registerUser= asyncHandler(async (req,res)=>{
    // step-1: get user detail from frontend
    // step-2: validation whether the provided details are correct
    // step-3: check if user already exists: either using username or email
    // step-4: check for images,check for avatar
    // step-5: if available then upload it on cloudinary
    // create user object - create entry in DB
    // remove password and refresh token field from response
    // check for user creation
    // return response

    const {fullname,username,email,password}=req.body
    console.log("email",email)
    if(fullname===""){
        throw new ApiError(400,"fullname is required")
    }
    if(username===""){
        throw new ApiError(400,"username is required")
    }
    if(email===""){
        throw new ApiError(400,"email is required")
    }
    if(password===""){
        throw new ApiError(400,"password is required")
    }

    const existedUser=User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"user is already registered")
    }

    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }


    //creating user
    const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowercase(),
    })

    //checking is the user is created or not
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }


    return res.status(201).json(
        new ApiResponse(200,createdUser,"user created successfully")
    )



})

export {registerUser}
