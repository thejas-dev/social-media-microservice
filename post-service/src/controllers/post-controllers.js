const Post = require('../models/Post');
const logger =require('../utils/logger');
const { validateCreatePost } = require('../utils/validation');
const {publishEvent} = require('../utils/rabbitmq');

async function invalidatePostCache(req, input){
    const cachedKey = `post:${input}`;
    await req.redisClient.del(cachedKey);

    const keys = await req.redisClient.keys("posts:*");
    if(keys.length > 0){
        await req.redisClient.del(keys);
    }
}

const createPost = async(req,res,next)=>{
    try {
        const {error} = validateCreatePost(req.body);
        if(error) {
            logger.warn("Validation error in create post endpoint", error.details[0].message);
            return res.status(400).json({success: false, message: error.details[0].message});
        }

        // Perform your business logic here
        const {content, mediaIds}= req.body;
        const newlyCreatedPost = new Post({
            user: req.user.userId,
            content,
            mediaIds: mediaIds || [], 
        })

        await newlyCreatedPost.save();

        await publishEvent('post.created',{
            postId: newlyCreatedPost._id.toString(),
            userId: newlyCreatedPost.user.toString(),
            content: newlyCreatedPost.content,
            createdAt: newlyCreatedPost.createdAt
        })

        await invalidatePostCache(req, newlyCreatedPost._id.toString());
        logger.info("Post created successfully",newlyCreatedPost);

        res.status(201).json({
            success: true,
            message: "Post created successfully",
            postId: newlyCreatedPost._id
        })

    } catch (error) {
        logger.error("Error creating post", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error: Error creating post"
        })
    }
}

const getAllPosts = async(req,res,next)=>{
    try {
        const page = parseInt(req.query.page)|| 1;
        const limit = parseInt(req.query.limit)|| 10;

        const startIndex = (page - 1) * limit;

        const cacheKey = `posts:${page}:${limit}`;
        const cachedPosts = await req.redisClient.get(cacheKey);

        if(cachedPosts){
            return res.json(JSON.parse(cachedPosts));
        }

        const posts = await Post.find().sort({createdAt:-1}).skip(startIndex).limit(limit);

        const totalNoOfPosts = await Post.countDocuments();

        const result = {
            posts, 
            currentPage:page, 
            totalPosts: totalNoOfPosts,
            totalPages: Math.ceil(totalNoOfPosts / limit)
        }

        // Save posts in redis cache
        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

        return res.json(result);

    } catch (error) {
        logger.error("Error getting all posts ", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error: Error getting all posts"
        })
    }
}

const getPost = async(req,res,next)=>{
    try {
        const postId = req.params.id;
        const cacheKey = `post:${postId}`;

        const cachedPost = await req.redisClient.get(cacheKey);
        if(cachedPost){
            return res.json({success:true, cache:true, post: JSON.parse(cachedPost)});
        }

        const post = await Post.findById(postId);
        if(!post){
            logger.warn(`Post not found for id: ${postId}`);
            return res.status(404).json({success:false, message: "Post not found"});
        }

        // Save post in redis cache
        await req.redisClient.setex(cacheKey, 3600, JSON.stringify(post));

        return res.json({success:true, post});
        
    } catch (error) {
        logger.error("Error getting post", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error: Error getting post"
        })
    }
}

const deletePost = async(req,res,next)=>{
    try {
        const post = await Post.findOneAndDelete({
            _id: req.params.id,
            user: req.user.userId
        });
        if(!post){
            logger.warn(`Post not found for id: ${req.params.id} to delete`);
            return res.status(404).json({success:false, message: "Post not found"});
        }

        // Publish post delete event
        await publishEvent('post.deleted',{
            postId: post._id.toString(),
            userId: req.user.userId,
            mediaIds: post.mediaIds
        })

        await invalidatePostCache(req, req.params.id);
        
        logger.info("Post deleted successfully", post);
        
        res.status(200).json({
            success: true,
            message: "Post deleted successfully"
        })

        
    } catch (error) {
        logger.error("Error deleting post", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error: Error deleting post"
        })
    }
}

module.exports = {createPost, getAllPosts, getPost, deletePost};