import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from '../utils/ApiError.js'
import { User } from "../models/user.models.js"
import uploadOnCloudinary from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from 'jsonwebtoken'

// const registerUser= asyncHandler(async (req,res)=>{
//     // step-1: get user detail from frontend
//     // step-2: validation whether the provided details are correct
//     // step-3: check if user already exists: either using username or email
//     // step-4: check for images,check for avatar
//     // step-5: if available then upload it on cloudinary
//     // create user object - create entry in DB
//     // remove password and refresh token field from response
//     // check for user creation
//     // return response

//     const {fullname,username,email,password}=req.body
//     console.log("email",email)
//     // if(fullname===""){
//     //     throw new ApiError(400,"fullname is required")
//     // }
//     // if(username===""){
//     //     throw new ApiError(400,"username is required")
//     // }
//     // if(email===""){
//     //     throw new ApiError(400,"email is required")
//     // }
//     // if(password===""){
//     //     throw new ApiError(400,"password is required")
//     // }

//     if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
//         throw new ApiError(400, "All fields are required");
//     }
    
//     //checks if the user already exists or not
//     const existedUser= await User.findOne({
//         $or: [{username},{email}]
//     })

//     if(existedUser){
//         throw new ApiError(409,"user is already registered")
//     }

//     //taking the images local path
//     const avatarLocalPath = req.files?.avatar[0]?.path;
//     const coverImageLocalPath=req.files?.coverImage[0]?.path;

//     if(!avatarLocalPath){
//         throw new ApiError(400,"Avatar file is required")
//     }


//     //uploading on cloudinary
//     const avatar = await uploadOnCloudinary(avatarLocalPath)

//     const coverImage = await uploadOnCloudinary(coverImageLocalPath)

//     if(!avatar){
//         throw new ApiError(400,"Avatar file is required")
//     }


//     //creating user
//     const user=await User.create({
//         fullname,
//         avatar:avatar.url,
//         coverImage:coverImage?.url || "",
//         email,
//         password,
//         username:username.toLowerCase(),
//     })

//     //checking is the user is created or not
//     const createdUser=await User.findById(user._id).select(
//         "-password -refreshToken"
//     )

//     if(!createdUser){
//         throw new ApiError(500,"Something went wrong while registering the user")
//     }


//     return res.status(201).json(
//         new ApiResponse(200,createdUser,"user created successfully")
//     )



// })

const generateAccessAndRefreshToken=async(userId)=>{
    try{
        //find user on id basis
        const user=await User.findById(userId)
        //generate refresh and access token
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        //stores refresh token in databases
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
    }catch(error){
        throw new ApiError(500,"something went wrong while generating refresh and access token")
    }
}
const registerUser = asyncHandler(async (req, res) => {
    const { fullname, username, email, password } = req.body;

    if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if the user already exists
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });

    if (existedUser) {
        throw new ApiError(409, "User is already registered");
    }

    // Take the images local path
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Upload images to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file upload failed");
    }

    // Create user
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    // Check if the user is created
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User created successfully"));
});


const loginUser=asyncHandler(async (req,res)=>{
    //bring the data from req body
    //username or email
    //find the user 
    //password check
    //accesss and refresh token
    //send cookies

    const {email,username,password}=req.body

    if(!username && !email){
        throw new ApiError(400,"username or email is required")
    }

    /*
    heres and alternative for above code based on logic discussed 
    if(!(username||email)){
        throw new ApiError(400,"username or email is required")
    }
    */

    const user= await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(400,"user does not exists")
    }

    const isPasswordValid= await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(400,"invalid user credentials")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)

    const loggedInUser=await User.findById(user._id).
    select("-password -refreshToken")

    const options={
        //this will help to make it secure and frontend will be modifiable only by server
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApResponse(
            200,
            {
                user:loggedInUser,accessToken,
                refreshToken
            },
            "User logged In Successfully"
        )
    )
})


const logoutUser=asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },{
          new:true  
        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200).clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"))
})

//refresh tokens are saved in database and acces token are with user and it expires in specific time so we send request end point inorder to refresh the access token

const refreshAccessToken=asyncHandler(async (req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
  
   if(incomingRefreshToken){
       throw new ApiError(401,"unauthorized request")
   }

   try {
    const decodedToken = jwt.verify(
     incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET
     )
 
 
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
         throw new ApiError(401,"Invalid refresh token")
     }
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,"Refresh token is expired or used")
     }
 
     const options={
         httpOnly:true,
         secure:true
     }
 
     const {accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id)
 
     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",newRefreshToken,options)
     .json(
         new ApiResponse(
             200,
             {
                 accessToken,refreshToken:newRefreshToken
             },
             "Access Token refreshed"
         )
     )
     
 
   } catch (error) {
    throw new ApiError(401,error?.message|| "invalid refresh token") 
   }


})



export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}
