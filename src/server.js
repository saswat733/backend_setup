// require('dotenv').config({path:'./env'})
import dotenv from 'dotenv'
import connectDB from "./db/index.js";
import { app } from './app.js';
dotenv.config({
    path:'./env'
})

connectDB()
.then(()=>{
    app.on('error',(error)=>{
        console.log("error:",error);
        throw error
    })
    app.listen(process.env.PORT||8000,()=>{
        console.log(`server is running at port: ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log('MONGO connection failed:',err)
})







//first approach for connect to DB
/*
;(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/
        ${DB_NAME}`)
        app.on("error",(error)=>{
            console.log("ERR:",error);
            throw error;
        })

        app.listen(process.env.PORT,()=>{
            console.log(`app is running on port http://localhost${process.env.PORT}`)
        })
    } catch (error) {
        console.log('Error hai:',error)
        throw err
    }
})()

*/
