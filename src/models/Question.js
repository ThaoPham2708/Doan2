const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    question_rich_text: { type: String },
    question_title: { type: String },
    explanation: { type: String },
    hint_text: { type: String },
    question_text: { type: String },
    difficulty: { type: Number },
    kcs: [{ type: Number, ref: 'KnowledgeComponent' }]
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema); 