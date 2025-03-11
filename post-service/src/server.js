require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const Redis = require('ioredis');
const helmet = require('helmet');
const routes = require('./routes/post-routes');
const errorHandler = require('./middlewares/errorHandler');
const rateLimit = require('express-rate-limit')
const {RedisStore} = require('rate-limit-redis');
const { connectToRabbitMQ } = require('./utils/rabbitmq');

const app = express();
const PORT = process.env.PORT || 3002;

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

app.use((req,res,next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request Body ${req.body}`);
    next();
})
 
// IP based rate limiting for sensitive endpoints
const sensitiveRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
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
app.use('/api/posts/create',sensitiveRateLimiter)

// routes 
app.use('/api/posts',(req,res,next) => {
    req.redisClient = redisClient;
    next();
}, routes);

app.use(errorHandler);

async function startServer(){
    try{
        await connectToRabbitMQ();
        app.listen(PORT, () => {
            console.log(`Post Service running on port ${PORT}`);
            logger.info(`Post Service running on port ${PORT}`);
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