/**
 * @fileoverview Validation middleware for activity logging endpoints.
 */

const { EMISSION_FACTORS } = require('../utils/calculations');

/**
 * Validates the request body for adding carbon activities.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 */
function validateActivity(req, res, next) {
  const { type, details } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Activity type is required' });
  }

  const validTypes = ['transport', 'meal', 'energy'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid activity type. Allowed: ${validTypes.join(', ')}` });
  }

  if (!details || typeof details !== 'object') {
    return res.status(400).json({ error: 'Activity details object is required' });
  }

  // Type-specific validations
  if (type === 'transport') {
    const { mode, distance } = details;
    if (!mode) {
      return res.status(400).json({ error: 'Transport mode is required' });
    }
    if (!Object.keys(EMISSION_FACTORS.transport).includes(mode)) {
      return res.status(400).json({ error: `Invalid transport mode. Allowed: ${Object.keys(EMISSION_FACTORS.transport).join(', ')}` });
    }
    const dist = parseFloat(distance);
    if (isNaN(dist) || dist < 0) {
      return res.status(400).json({ error: 'Distance must be a non-negative number' });
    }
  }

  if (type === 'meal') {
    const { dietType, count } = details;
    if (!dietType) {
      return res.status(400).json({ error: 'Meal dietType is required' });
    }
    if (!Object.keys(EMISSION_FACTORS.meals).includes(dietType)) {
      return res.status(400).json({ error: `Invalid dietType. Allowed: ${Object.keys(EMISSION_FACTORS.meals).join(', ')}` });
    }
    const cnt = parseInt(count, 10);
    if (isNaN(cnt) || cnt < 0) {
      return res.status(400).json({ error: 'Meal count must be a non-negative integer' });
    }
  }

  if (type === 'energy') {
    const { electricityKwh, gasKwh } = details;
    if (electricityKwh === undefined || gasKwh === undefined) {
      return res.status(400).json({ error: 'Both electricityKwh and gasKwh are required for energy activities' });
    }
    const elec = parseFloat(electricityKwh);
    const gas = parseFloat(gasKwh);
    if (isNaN(elec) || elec < 0) {
      return res.status(400).json({ error: 'Electricity consumption must be a non-negative number' });
    }
    if (isNaN(gas) || gas < 0) {
      return res.status(400).json({ error: 'Gas consumption must be a non-negative number' });
    }
  }

  next();
}

/**
 * Validates query format for AI chat requests.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 */
function validateChatPrompt(req, res, next) {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Chat message must be a non-empty string' });
  }
  next();
}

module.exports = {
  validateActivity,
  validateChatPrompt
};
