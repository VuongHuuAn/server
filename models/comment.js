const mongoose = require("mongoose");

const commentSchema = mongoose.Schema({
    userId: {
        type: String,  // Phù hợp với userId trong Order
        required: true,
    },
    userName: {  // Tên người comment
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
    },
    images: [{
        type: String, // URL của ảnh
    }],
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    likes: [{ // Lưu userId của người like
        type: String
    }],
    purchaseVerified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    replies: [{
        userId: {
            type: String,
            required: true
        },
        userName: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        isSellerReply: {
            type: Boolean,
            default: false
        }
    }]
});

module.exports = commentSchema;