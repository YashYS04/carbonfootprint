/**
 * @fileoverview Routing table mapping routes to carbon tracking controller methods.
 */

const express = require('express');
const router = express.Router();
const carbonController = require('../controllers/carbonController');
const { validateActivity } = require('../middleware/validation');

/**
 * @route POST /api/carbon/activities
 * @desc Logs a new user activity (transport, meals, or home energy)
 * @access Public
 */
router.post('/activities', validateActivity, carbonController.addActivity);

/**
 * @route GET /api/carbon/summary
 * @desc Fetches current aggregated carbon statistics and activities list
 * @access Public
 */
router.get('/summary', carbonController.getSummary);

/**
 * @route DELETE /api/carbon/activities
 * @desc Resets activities history
 * @access Public
 */
router.delete('/activities', carbonController.clearActivities);

/**
 * @route POST /api/carbon/clear
 * @desc Resets activities history (POST fallback alias)
 * @access Public
 */
router.post('/clear', carbonController.clearActivities);

module.exports = router;
