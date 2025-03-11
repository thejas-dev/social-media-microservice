const Media = require('../models/Media');
const { deleteMediaFromCloudinary } = require('../utils/cloudinary');
const logger = require('../utils/logger');

const handlePostDeleted = async(event) => {
    console.log("postDeletedEvent",event);
    const {postId, mediaIds} = event;

    try {
        // Media to delete
        const mediasToDelete = await Media.find({_id: {$in: mediaIds} });
         
        for(const media of mediasToDelete) {
            await deleteMediaFromCloudinary(media.publicId);
            await Media.findByIdAndDelete(media._id);
            logger.info(`Media deleted from MongoDB successfully, Public Id : ${media.publicId} associated with the deleted post Id : ${postId}`);
        }

        logger.info(`Deleted ${mediasToDelete.length} media(s) from Cloudinary and MongoDB successfully for post: ${postId}`);
        
    } catch (error) {
        logger.error("Error handling post deleted event", error);
        throw error;
    }
}

module.exports = {handlePostDeleted};