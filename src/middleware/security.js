/**
 * @fileoverview Custom security middleware including input sanitization, rate limiting, and HTTP security headers.
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Sanitizes a single string to escape HTML entities and prevent XSS injection.
 * @param {string} str - The raw input string.
 * @returns {string} The HTML-escaped string.
 */
function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Recursively traverses and sanitizes nested objects and arrays.
 * @param {*} val - Value to check and sanitize.
 * @returns {*} The sanitized value.
 */
function sanitizeValue(val) {
  if (val === null || val === undefined) {
    return val;
  }
  if (typeof val === 'string') {
    return sanitizeHtml(val);
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (typeof val === 'object') {
    const cleanObj = {};
    for (const key of Object.keys(val)) {
      cleanObj[key] = sanitizeValue(val[key]);
    }
    return cleanObj;
  }
  return val;
}

/**
 * Express middleware to recursively sanitize request body, query params, and route parameters.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 */
function sanitizeInputMiddleware(req, res, next) {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
}

/**
 * Configured rate limiter to prevent API abuse (DDoS, Brute force).
 * Allows max 100 requests per 15 minutes per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

/**
 * Configures express app with standard security headers and settings.
 * @param {import('express').Application} app - Express application instance.
 */
function setupSecurity(app) {
  // Use Helmet to set secure HTTP headers (e.g. Content-Security-Policy, HSTS)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline allowed for UI handlers
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"]
      }
    }
  }));

  // Enable CORS
  const cors = require('cors');
  app.use(cors({
    origin: '*', // For Cloud Run, standard CORS config
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // JSON and URL-encoded parsers with body size limits to prevent large payload attacks
  const express = require('express');
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  // Sanitize all inputs
  app.use(sanitizeInputMiddleware);
}

module.exports = {
  setupSecurity,
  apiLimiter,
  sanitizeHtml,
  sanitizeValue
};
