import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from '../utils/ApiError.js'
import { User } from "../models/user.models.js"
import uploadOnCloudinary from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from 'jsonwebtoken'
import mongoose from "mongoose"
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

const generateAccessAndRefreshToken = async (userId) => {
    try {
        // find user on id basis
        const user = await User.findById(userId);

        if (!user) {
            console.log("User not found");
            throw new ApiError(404, "User not found");
        }

        // generate refresh and access token
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // store refresh token in the database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Error in generateAccessAndRefreshToken:", error);
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
};

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
    console.log("username",username)
    console.log("password",password)

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
        new ApiResponse(
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
            // This MongoDB operation is used to find and update the user document in the database. It sets the refreshToken field to undefined. The new: true option returns the modified document.

            // $set:{
            //     refreshToken:undefined
            // }

            $unset:{
                refreshToken:1 //this removes the field from document
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
  
   if(!incomingRefreshToken){
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


const changeCurrentPassword= asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} =req.body
    console.log(oldPassword)
    const user=await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    user.password= newPassword

    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password Changed Successfully"))
})


const getCurrentUser= asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfully"))
    // return res.status(201).json(new ApiResponse(200, createdUser, "User created successfully"));
})


const updateAccountDetails= asyncHandler(async(req,res)=>{
    const {fullname,email}=req.body

    if(!fullname || !email){
        throw new ApiError(400,"all fields are required")
    }

    const user =await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email:email
            }
        },
        {new:true}
    ).select("-password")


    return res.status(200)
    .json(new ApiResponse(200,
        req.user,
        "Account Details udpdated succesfully"))
})

const updateUserAvatar= asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"avatar file is missing")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on cloudinary")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")   //excluding user credential password

    return res.status(200)
    .json(
        new ApiResponse(200,
            req.user,
            "avatar image update succesfully")
    )
})

const updateUserCoverImage= asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"cover image file is missing")
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on Cover Image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200,"cover image update succesfully")
    )
})


const getUserchannelProfile= asyncHandler(async(req,res)=>{
    const {username}=req.params

    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }
    // console.log(username)
    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }

            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1,

            }
        }
    ])
    console.log(channel)
    if(!channel?.length){
        throw new ApiError(404,"channel does not exists")
    }


    return res.status(200).
    json(new ApiResponse(200,channel[0],"user channel fetched successfully"))
})


const getWatchHistory=asyncHandler(async(req,res)=>{
    const user=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }

                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,user[0].watchHistory,"wathc history fetched sucessesfully")
    )
})
export {registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    refreshAccessToken,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserchannelProfile,
    getWatchHistory
}




    // registerUser:
    //     Handles user registration.
    //     Validates required fields (fullname, email, username, password).
    //     Checks if the user already exists.
    //     Uploads avatar and cover image to Cloudinary.
    //     Creates a new user in the database.
    //     Returns a JSON response with the created user data.

    // loginUser:
    //     Handles user login.
    //     Validates whether either username or email is provided.
    //     Finds the user based on the provided username or email.
    //     Checks the password validity.
    //     Generates access and refresh tokens.
    //     Sets cookies with the tokens.
    //     Returns a JSON response with the logged-in user data.

    // logoutUser:
    //     Handles user logout.
    //     Clears the access and refresh tokens cookies.
    //     Returns a JSON response indicating successful logout.

    // refreshAccessToken:
    //     Handles the refresh of the access token using the provided refresh token.
    //     Verifies the incoming refresh token.
    //     Generates a new access token and refresh token pair.
    //     Sets cookies with the new tokens.
    //     Returns a JSON response with the new tokens.

    // changeCurrentPassword:
    //     Handles the change of the current user's password.
    //     Validates the old password.
    //     Updates the password in the database.
    //     Returns a JSON response indicating successful password change.

    // getCurrentUser:
    //     Returns the current user's data.
    //     Excludes sensitive information like the password and refresh token.
    //     Returns a JSON response with the current user's data.

    // updateAccountDetails:
    //     Handles the update of the current user's account details (fullname and email).
    //     Validates that both fields are provided.
    //     Updates the user's details in the database.
    //     Returns a JSON response indicating successful account details update.

    // updateUserAvatar and updateUserCoverImage:
    //     Handle the update of the current user's avatar and cover image, respectively.
    //     Uploads the new image to Cloudinary.
    //     Updates the user's profile with the new image URL.
    //     Returns a JSON response indicating successful image update.

    // getUserchannelProfile:
    //     Fetches the profile of a user's channel based on the provided username.
    //     Uses MongoDB's aggregation pipeline to gather information about the user and their subscribers.
    //     Returns a JSON response with the user's channel profile.