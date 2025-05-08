const mongoose = require('mongoose');

const userKCStatSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    kc_id: {
        type: String,
        required: true
    },
    alpha: {
        type: Number,
        default: 1
    },
    beta: {
        type: Number,
        default: 1
    }
}, { timestamps: true });

// Compound index for user_id and kc_id
userKCStatSchema.index({ user_id: 1, kc_id: 1 }, { unique: true });

module.exports = mongoose.model('UserKCStat', userKCStatSchema); 