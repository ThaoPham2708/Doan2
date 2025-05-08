const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    question_id: {
        type: String,
        required: true
    },
    is_correct: {
        type: Boolean,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for faster queries
responseSchema.index({ user_id: 1, timestamp: -1 });

module.exports = mongoose.model('Response', responseSchema); 