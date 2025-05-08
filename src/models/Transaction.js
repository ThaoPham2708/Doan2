const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  question_id: { type: Number, ref: 'Question' },
  timestamp: { type: Date, required: true },
  correct: { type: Boolean, required: true },
  time_taken: { type: Number },
  attempt_count: { type: Number },
  hint_used: { type: Boolean },
  hint_count: { type: Number }
});

// Create compound index for efficient querying
transactionSchema.index({ user_id: 1, timestamp: 1 });

module.exports = mongoose.model('Transaction', transactionSchema); 