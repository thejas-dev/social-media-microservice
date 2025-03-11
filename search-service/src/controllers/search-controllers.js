const logger = require("../utils/logger")
const Search = require('../models/Search');

// Implementing caching here for max of 2-5 mins
const searchPostController = async(req,res,next) => {
    logger.info("Search Endpoint hit...");
    try {
        const {query} = req.query;

        const results = await Search.find({
            $text: {$search: query}
        },{
            score: { $meta: "textScore" }
        }).sort({score: { $meta: "textScore" }})
        .limit(10);
        console.log(results);

        return res.json({success: true, results});
        
    } catch (error) {
        logger.error("Error while searching post", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        })
    }
}

module.exports = {searchPostController};