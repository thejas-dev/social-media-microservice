require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger')
const helmet = require('helmet');
const cors = require('cors');
const {RateLimiterRedis} = require('rate-limiter-flexible');
const Redis = require('ioredis');
const {rateLimit} = require('express-rate-limit');
const {RedisStore} = require('rate-limit-redis');
const routes = require('./routes/identity-service');
const errorHandler = require('./middlewares/errorHandler');

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Connect 
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

// DDOS protection and rate limiting
const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rate_limiter',
    points: 100, // limit each IP to 100 requests per hour,
    duration: 10
})

app.use((req,res,next) => {
    rateLimiter.consume(req.ip)
    .then(() => {
        next();
    }).catch(err=>{
        logger.warn("Rate limit exceeded for IP: " + req.ip);
        res.status(429).json({success:false, message: 'Too Many Requests. Please try again later.'});
    })
})

// IP based rate limiting for sensitive endpoints
const sensitiveRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
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
app.use('/api/auth/register',sensitiveRateLimiter)

// Routes
app.use('/api/auth', routes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Identity Service running on port ${PORT}`);
    logger.info(`Identity Service running on port ${PORT}`);
})

process.on('unhandledRejection',(reason, promise) => {
    logger.error('Unhandled Rejection at', promise, "reason: " + reason);
});