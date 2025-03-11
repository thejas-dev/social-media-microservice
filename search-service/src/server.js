require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const Redis = require('ioredis');
const helmet = require('helmet');
const errorHandler  = require('./middlwares/errorHandler');
const {connectToRabbitMQ, consumeEvent} = require('./utils/rabbitmq');
const searchRoutes = require('./routes/search-routes');
const { handlePostCreated, handlePostDeleted } = require('./eventHandlers/searchEventHandlers');
const rateLimit = require('express-rate-limit')
const {RedisStore} = require('rate-limit-redis');

const app = express();
const PORT = process.env.PORT || 3004;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI).then(() =>{
    console.log('MongoDB Connected...')
    logger.info('MongoDB Connected successfully');
}).catch((err)=>{
    logger.error("Mongo connection error: " + err);
})

const redisClient = new Redis(process.env.REDIS_URL);
 
// middlwares
app.use(helmet());
app.use(cors());
app.use(express.json());


// IP based rate limiting for sensitive endpoints
const sensitiveRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler:(req,res)=>{
        logger.warn("Sensitive endpoint rate limit exceeded for IP: " + req.ip + " for sensitive endpoint: " + req.url);
        res.status(429).json({success:false, message: 'Too Many Requests. Please try again later.'});
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args)
        
    })
})

// apply this sensitive rate limiter to routes
app.use('/api/search',sensitiveRateLimiter)

// Homework - Implement redis caching for this service
// Pass redis client as part of the request and then implement redis caching in controllers.
app.use('/api/search', searchRoutes);


app.use(errorHandler);

async function startServer(){
    try{
        await connectToRabbitMQ();
        consumeEvent('post.created', handlePostCreated);
        consumeEvent('post.deleted', handlePostDeleted);
        console.log('Subscribed to event post.created & post.deleted'+ PORT);
        app.listen(PORT,() => {
            
            console.log('Search Service running on port '+ PORT);
            logger.info('Search Service running on port '+ PORT);
        });  // Start the server

    }catch(error){
        logger.error("Error starting server", error);
        process.exit(1);
    }
}

startServer();