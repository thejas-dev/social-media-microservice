require('dotenv').config();

const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');
const helmet = require('helmet');
const {rateLimit} = require('express-rate-limit');
const {RedisStore} = require('rate-limit-redis');
const logger = require('./utils/logger');
const proxy = require('express-http-proxy');
const errorHandler = require('./middleware/errorHandler');
const validateToken = require('./middleware/auth-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const rateLimitOptions = rateLimit({
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

app.use(rateLimitOptions);

app.use((req,res,next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request Body ${req.body}`);
    next();
})

const proxyOptions = {
    proxyReqPathResolver: (req) => {
        return req.originalUrl.replace(/^\/v1/,'/api');
    },
    proxyErrorHandler: (err, res, next) => {
        logger.error(`Proxy Error: ${err.message}`);
        res.status(500).json({success: false, message: "Internal Server Error", error: err.messge});
    }
}

// Setting up proxy for identity service
app.use('/v1/auth', proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
        proxyReqOptions.headers['Content-Type'] = `application/json`;
        return proxyReqOptions;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response received from identity service: ${proxyRes.statusCode}`);
        return proxyResData;
    }
}))

// Setting up proxy for post service
app.use('/v1/posts',validateToken,proxy(process.env.POST_SERVICE_URL,{
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
        proxyReqOptions.headers['Content-Type'] = `application/json`;
        console.log(srcReq.user);
        proxyReqOptions.headers['x-user-id'] = srcReq.user.userId;
        return proxyReqOptions;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response received from post service: ${proxyRes.statusCode}`);
        return proxyResData;
    },
}))

// Setting up proxy for search service
app.use('/v1/search',validateToken,proxy(process.env.SEARCH_SERVICE_URL,{
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
        proxyReqOptions.headers['Content-Type'] = `application/json`;
        console.log(srcReq.user);
        proxyReqOptions.headers['x-user-id'] = srcReq.user.userId;
        return proxyReqOptions;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response received from post service: ${proxyRes.statusCode}`);
        return proxyResData;
    },
}))

// Setting up proxy for media service
app.use('/v1/media',validateToken,proxy(process.env.MEDIA_SERVICE_URL,{
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
        proxyReqOptions.headers['x-user-id'] = srcReq.user.userId;
        if(!srcReq.headers['content-type']?.startsWith("multipart/form-data")){
            proxyReqOptions.headers['Content-Type'] = `application/json`;
        }

        return proxyReqOptions;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
        logger.info(`Response received from media service: ${proxyRes.statusCode}`);
        return proxyResData;
    },
    parseReqBody:false,
}))


app.use(errorHandler);

app.listen(PORT, () => {
    logger.info(`API Gateway running on port ${PORT}`);
    logger.info(`Identity Service running on port ${process.env.IDENTITY_SERVICE_URL}`);
    logger.info(`Post Service running on port ${process.env.POST_SERVICE_URL}`);
    logger.info(`Media Service running on port ${process.env.MEDIA_SERVICE_URL}`);
    logger.info(`Search Service running on port ${process.env.SEARCH_SERVICE_URL}`);
    logger.info(`Redis Url: ${process.env.REDIS_URL}`);
})