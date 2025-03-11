const Media = require('../models/Media');
const { uploadMediaToCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');

const uploadMedia = async(req,res,next)=>{
    logger.info("Staring media upload...");
    try{
        if(!req.file){
            logger.error("No file found");
            return res.status(400).json({success:false, message: "No file found, please add an file and try again."});
        }

        const {originalname, mimetype, buffer} = req.file;
        const userId = req.user.userId;

        logger.info(`File details: ${originalname}, type: ${mimetype}`);

        const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);
        logger.info(`Media uploaded to Cloudinary successfully, Public Id : ${cloudinaryUploadResult.public_id}`);

        const newlyCreatedMedia = new Media({
            publicId: cloudinaryUploadResult.public_id,
            originalName:originalname,
            mimeType: mimetype,
            url: cloudinaryUploadResult.secure_url,
            userId,
        })

        await newlyCreatedMedia.save();

        return res.status(201).json({
            success: true,
            message: "Media uploaded successfully",
            mediaId: newlyCreatedMedia._id,
            url: newlyCreatedMedia.url,
        })

    }catch(ex){
        logger.error("Error uploading media", ex);
        res.status(500).json({
            success: false,
            message: "Internal Server Error: Error upload media"
        })

    }
}

const getAllMedia = async(req,res,next) => {
    try{
        const result = await Media.find();
        return res.json({
            result,
            success: true,
            message: "All media fetched successfully"
        })

    }catch(error){
        logger.error("Error getting all media", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error: Error getting all media"
        })
    }
}

module.exports = {uploadMedia,getAllMedia};