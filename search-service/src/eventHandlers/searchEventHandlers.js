const Search = require('../models/Search');
const logger = require('../utils/logger');

async function handlePostCreated(event) {
    try {

        const newSearchPost = new Search({
            postId: event.postId,
            userId: event.userId,
            content: event.content,
            createdAt: event.createdAt,
        })

        await newSearchPost.save();

        logger.info("New post created, added to search index", event.postId, newSearchPost._id.toString());
        
    } catch (error) {
        logger.error("Error handling post created event", error);
    }
}

async function handlePostDeleted(event) {
    try {
        await Search.findOneAndDelete({postId: event.postId, userId: event.userId});

        logger.info("Post deleted, removed from search index", event.postId);

        
        
    } catch (error) {
        logger.error("Error handling post deleted event", error);
    }
}

module.exports = {handlePostCreated,handlePostDeleted}