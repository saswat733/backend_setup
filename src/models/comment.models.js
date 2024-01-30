import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const commentsSchema=new mongoose.Schema({
    content:{
        type:String,
        required:true
    },
    video:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Video"
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true})

//this gives the ability to control kahan se kahan tak videos dene hai kitne videos dene hai
commentsSchema.plugin(mongooseAggregatePaginate)
export const Comment=mongoose.model("Comment",commentsSchema)