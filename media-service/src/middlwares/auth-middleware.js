const logger = require('../utils/logger');

const authenticateRequest = (req,res,next) => {
    const userId = req.headers['x-user-id'];
    if(!userId) {
        logger.error("Access attempted without User ID");
        return res.status(401).json({
            success: false,
            message: "Authentication required! please login and retry"
        });
    }

    req.user = {userId};

    next();
}

module.exports = {authenticateRequest}