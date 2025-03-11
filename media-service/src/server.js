require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mediaRoutes = require('./routes/media-routes');
const logger = require('./utils/logger');
const errorHandler = require('./middlwares/errorHandler');
const rateLimit = require('express-rate-limit')
const {RedisStore} = require('rate-limit-redis');
const Redis = require('ioredis');
const { connectToRabbitMQ, consumeEvent } = require('./utils/rabbitmq');
const { handlePostDeleted } = require('./eventHandlers/media-event-handlers');


const app = express();
const PORT = process.env.PORT || 3003;


mongoose.connect(process.env.MONGODB_URI).then(() =>{
    console.log('MongoDB Connected...')
    logger.info('MongoDB Connected successfully');
}).catch((err)=>{
    logger.error("Mongo connection error: " + err);
})

app.use(cors());
app.use(helmet());
// app.use(express.json());

app.use((req,res,next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request Body ${req.body}`);
    next();
})

const redisClient = new Redis(process.env.REDIS_URL);

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

app.use('/api/media/upload',sensitiveRateLimiter);

app.use('/api/media', mediaRoutes); 

app.use(errorHandler);

async function startServer(){
    try{
        await connectToRabbitMQ();

        // consume the event
        await consumeEvent('post.deleted',handlePostDeleted);
        
        app.listen(PORT, () => {
            console.log(`Media Service running on port ${PORT}`);
            logger.info(`Server running on port ${PORT}`);
        })
    }catch(err){
        logger.error("Failed to connect to server", err);
        process.exit(1);
    }
}

startServer();



process.on('unhandledRejection',(reason, promise) => {
    logger.error('Unhandled Rejection at', promise, "reason: " + reason);
});


