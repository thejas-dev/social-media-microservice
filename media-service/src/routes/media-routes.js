const express = require('express');
const multer = require('multer');

const {uploadMedia, getAllMedia} = require('../controllers/media-controller');
const {authenticateRequest} = require('../middlwares/auth-middleware');
const logger =require('../utils/logger');

const router = express.Router();

// Configure multer to upload files
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit
}).single('file');

router.post('/upload', authenticateRequest, (req,res,next) => {
    upload(req,res,function(err){
        if(err instanceof multer.MulterError){
            logger.error("Multer error while uploading: ", err);
            return res.status(400).json({success: false, message: err.message});
        }else if(err){
            logger.error("Unknown error occureed uploading file: ", err);
            return res.status(500).json({success: false, message: "Internal Server Error: Unknown Error while uploading file"});
        }

        if(!req.file){
            logger.error("No file to upload");
            return res.status(400).json({success: false, message: "No file found"});
        }

        next();
    })
}, uploadMedia);

router.get('/getAll',authenticateRequest, getAllMedia);

module.exports = router;