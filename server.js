/**
 * @fileoverview Main entry point for the Carbon Footprint Awareness Platform server.
 * Bootstraps routes, applies security configurations, and binds the server port.
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const path = require('path');
const { setupSecurity } = require('./src/middleware/security');
const carbonRoutes = require('./src/routes/carbonRoutes');
const aiRoutes = require('./src/routes/aiRoutes');

const app = express();
const PORT = process.env.PORT || 8080;

// Apply CORS, Helmet headers, parsers, and custom recursive XSS input sanitizers
setupSecurity(app);

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Register API Routes
app.use('/api/carbon', carbonRoutes);
app.use('/api/ai', aiRoutes);

/**
 * Fallback route handler for SPA routing. Serves the primary index page for frontend views,
 * or returns a 404 JSON response if the request starts with the API prefix.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function.
 */
app.get('*', (req, res, next) => {
  // Check if it's an API route that should return a 404 rather than the index page
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Global Express error handling middleware.
 * @param {Error} err - Unhandled error object.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function.
 */
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    error: 'An internal server error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌍 Carbon Footprint Awareness Platform Running`);
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`====================================================`);
});

module.exports = { app, server };
