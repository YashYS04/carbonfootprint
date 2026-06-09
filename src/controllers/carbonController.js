/**
 * @fileoverview Controller for logging activities and calculating carbon footprint aggregates.
 */

const {
  calculateTransportEmission,
  calculateMealEmission,
  calculateEnergyEmission,
  getAggregatedSummary
} = require('../utils/calculations');
const logger = require('../utils/logger');

// In-memory array acting as our database
/** @type {Array<{id: string, type: 'transport'|'meal'|'energy', details: object, emissions: number, timestamp: string}>} */
const activities = [];

/**
 * Logs a new user activity and returns the calculated carbon footprint.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {void}
 */
function addActivity(req, res) {

  try {
    const { type, details } = req.body;
    let emissions = 0;

    // Calculate emissions based on activity type
    if (type === 'transport') {
      emissions = calculateTransportEmission(details.mode, details.distance);
    } else if (type === 'meal') {
      emissions = calculateMealEmission(details.dietType, details.count);
    } else if (type === 'energy') {
      emissions = calculateEnergyEmission(details.electricityKwh, details.gasKwh);
    }

    const newActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      details,
      emissions,
      timestamp: new Date().toISOString()
    };

    activities.push(newActivity);

    // Calculate updated aggregates
    const summary = getAggregatedSummary(activities);

    return res.status(201).json({
      message: 'Activity logged successfully',
      activity: newActivity,
      activities,
      summary
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process activity: ' + error.message });
  }

}

/**
 * Returns the complete activity log and summarized totals.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {void}
 */
function getSummary(req, res) {
  try {
    const summary = getAggregatedSummary(activities);
    return res.status(200).json({
      activities,
      summary
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch summary: ' + error.message });
  }
}

/**
 * Clears the user activity history.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {void}
 */
function clearActivities(req, res) {
  try {
    activities.length = 0;
    return res.status(200).json({
      message: 'Activity history cleared successfully',
      activities: [],
      summary: getAggregatedSummary(activities)
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to clear activities: ' + error.message });
  }
}



/**
 * Expose raw activities list (primarily for tests/internal use).
 * @returns {Array} List of current activities.
 */
function getRawActivities() {
  return activities;
}

module.exports = {
  addActivity,
  getSummary,
  clearActivities,
  getRawActivities
};
