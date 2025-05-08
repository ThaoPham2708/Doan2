const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessmentController');

// Submit answer and get next question
router.post('/submit-answer', assessmentController.submitAnswer);

// Get weak KCs for a user
router.get('/weak-kcs/:user_id', assessmentController.getWeakKCs);

// Initialize user assessment
router.post('/initialize', assessmentController.initialize);

module.exports = router; 