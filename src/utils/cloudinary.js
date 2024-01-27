import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null;
        }

        // Upload the file on Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        // File has been uploaded successfully
        console.log("File is uploaded on Cloudinary", response.url);
        return response;
    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error.message);

        // Remove the locally saved temporary file as the upload operation failed
        fs.unlinkSync(localFilePath);

        // Handle the error appropriately based on your application's requirements
        // You can choose to return a default value or throw an error
        // return null; // Or throw new Error("Upload failed");
    }
};


export default uploadOnCloudinary
