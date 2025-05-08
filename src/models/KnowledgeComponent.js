const mongoose = require('mongoose');

const knowledgeComponentSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    grade: { type: Number, required: false },
    dependencies: [{
        type: String,
        ref: 'KnowledgeComponent'
    }]
}, { timestamps: true });

module.exports = mongoose.model('KnowledgeComponent', knowledgeComponentSchema); 