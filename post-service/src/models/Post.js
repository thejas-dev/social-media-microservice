const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
    },
    mediaIds: [
        {
            type:String,
        },
    ],
},{
    timestamps: true
})

// because we will be having different service for search
postSchema.index({content: 'text'});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
 