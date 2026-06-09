/**
 * @fileoverview Routing table mapping routes to AI assistant controller methods.
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { validateChatPrompt } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/security');

/**
 * @route POST /api/ai/chat
 * @desc Sends message to Gemini chatbot for personalized footprint recommendations.
 *       Includes specific rate limiting to prevent key spamming.
 * @access Public
 */
router.post('/chat', apiLimiter, validateChatPrompt, aiController.chat);

module.exports = router;
