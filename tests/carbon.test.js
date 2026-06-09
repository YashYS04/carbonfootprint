/**
 * @fileoverview Endpoint integration tests for carbon activity logging routes.
 */

// Force dynamic port mapping for testing to prevent conflicts
process.env.PORT = 0;

const request = require('supertest');
const { app, server } = require('../server');

// Ensure we close the server after all tests run
afterAll((done) => {
  server.close(done);
});

describe('Carbon Activities API Endpoints', () => {

  beforeEach(async () => {
    // Clear historical records before each run to ensure tests are decoupled
    await request(app).delete('/api/carbon/activities');
  });

  describe('POST /api/carbon/activities', () => {
    test('should successfully log transportation activity', async () => {
      const payload = {
        type: 'transport',
        details: {
          mode: 'petrol_car',
          distance: 10
        }
      };

      const res = await request(app)
        .post('/api/carbon/activities')
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'Activity logged successfully');
      expect(res.body.activity.emissions).toBe(1.8); // 10 * 0.18
      expect(res.body.summary.totalCo2).toBe(1.8);
      expect(res.body.summary.byCategory.transport).toBe(1.8);
    });

    test('should successfully log meal activity', async () => {
      const payload = {
        type: 'meal',
        details: {
          dietType: 'vegan',
          count: 2
        }
      };

      const res = await request(app)
        .post('/api/carbon/activities')
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.activity.emissions).toBe(1.0); // 2 * 0.5
      expect(res.body.summary.totalCo2).toBe(1.0);
    });

    test('should successfully log home energy utilities activity', async () => {
      const payload = {
        type: 'energy',
        details: {
          electricityKwh: 20,
          gasKwh: 10
        }
      };

      const res = await request(app)
        .post('/api/carbon/activities')
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body.activity.emissions).toBe(11.0); // (20 * 0.45) + (10 * 0.20) = 9 + 2 = 11
    });

    test('should return 400 validation error if type is missing', async () => {
      const payload = {
        details: {
          mode: 'petrol_car',
          distance: 10
        }
      };

      const res = await request(app)
        .post('/api/carbon/activities')
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 400 if transport distance is negative', async () => {
      const payload = {
        type: 'transport',
        details: {
          mode: 'petrol_car',
          distance: -50
        }
      };

      const res = await request(app)
        .post('/api/carbon/activities')
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should return 400 if diet type is invalid', async () => {
      const payload = {
        type: 'meal',
        details: {
          dietType: 'fastfood',
          count: 1
        }
      };

      const res = await request(app)
        .post('/api/carbon/activities')
        .send(payload);

      expect(res.statusCode).toBe(400);
    });

    test('should return 400 if activity type is invalid', async () => {
      const res = await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'flight', details: {} });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid activity type');
    });

    test('should return 400 if details is not an object', async () => {
      const res = await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'transport', details: 'my-journey' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('details object is required');
    });

    test('should return 400 if transport mode is missing', async () => {
      const res = await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'transport', details: { distance: 10 } });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('mode is required');
    });

    test('should return 400 if transport mode is invalid', async () => {
      const res = await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'transport', details: { mode: 'rocket', distance: 10 } });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid transport mode');
    });

    test('should return 400 if meal dietType is missing', async () => {
      const res = await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'meal', details: { count: 3 } });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('dietType is required');
    });

    test('should return 400 if meal count is invalid', async () => {
      const res = await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'meal', details: { dietType: 'vegan', count: -2 } });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('count must be a non-negative integer');
    });

    test('should return 400 if energy details are missing or incomplete', async () => {
      const res = await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'energy', details: { electricityKwh: 10 } });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Both electricityKwh and gasKwh are required');
    });

    test('should return 400 if energy electricityKwh is invalid', async () => {
      const res = await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'energy', details: { electricityKwh: -1, gasKwh: 10 } });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Electricity consumption must be a non-negative number');
    });

    test('should return 400 if energy gasKwh is invalid', async () => {
      const res = await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'energy', details: { electricityKwh: 10, gasKwh: 'invalid' } });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Gas consumption must be a non-negative number');
    });
  });


  describe('GET /api/carbon/summary', () => {
    test('should retrieve empty summary initially', async () => {
      const res = await request(app).get('/api/carbon/summary');
      
      expect(res.statusCode).toBe(200);
      expect(res.body.activities).toHaveLength(0);
      expect(res.body.summary.totalCo2).toBe(0);
    });

    test('should retrieve accumulated calculations', async () => {
      // Seed two items
      await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'transport', details: { mode: 'electric_car', distance: 10 } }); // 0.5 kg
      await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'meal', details: { dietType: 'vegetarian', count: 1 } }); // 1.0 kg

      const res = await request(app).get('/api/carbon/summary');

      expect(res.statusCode).toBe(200);
      expect(res.body.activities).toHaveLength(2);
      expect(res.body.summary.totalCo2).toBe(1.5);
    });
  });

  describe('DELETE /api/carbon/activities', () => {
    test('should clear logged history back to 0', async () => {
      // Seed activity
      await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'transport', details: { mode: 'petrol_car', distance: 10 } });

      // Reset
      const deleteRes = await request(app).delete('/api/carbon/activities');
      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.activities).toHaveLength(0);
      expect(deleteRes.body.summary.totalCo2).toBe(0);

      // Verify via GET
      const getRes = await request(app).get('/api/carbon/summary');
      expect(getRes.body.activities).toHaveLength(0);
    });
  });

  describe('Global App Routing and Errors', () => {
    test('should return 404 JSON for non-existent API routes starting with /api', async () => {
      const res = await request(app).get('/api/invalid-endpoint-path');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('error', 'Endpoint not found');
    });

    test('should serve index.html for non-existent non-API SPA routes', async () => {
      const res = await request(app).get('/some-random-spa-page-route');
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
    });

    test('should handle unhandled errors via global error handler', async () => {
      jest.resetModules();
      jest.doMock('../src/controllers/carbonController', () => {
        const actual = jest.requireActual('../src/controllers/carbonController');
        return {
          ...actual,
          getSummary: (req, res, next) => {
            next(new Error('Test unhandled exception'));
          }
        };
      });


      const inlineRequest = require('supertest');
      const inlineServer = require('../server');

      const res = await inlineRequest(inlineServer.app).get('/api/carbon/summary');
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'An internal server error occurred');

      inlineServer.server.close();
    });

    test('should return 500 error if getSummary controller encounters calculation crash', async () => {
      jest.resetModules();
      jest.unmock('../src/controllers/carbonController');
      jest.doMock('../src/utils/calculations', () => {
        const actual = jest.requireActual('../src/utils/calculations');
        return {
          ...actual,
          getAggregatedSummary: () => {
            throw new Error('Summary calculation crashed');
          }
        };
      });

      const inlineRequest = require('supertest');
      const inlineServer = require('../server');

      const res = await inlineRequest(inlineServer.app).get('/api/carbon/summary');
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Failed to fetch summary: Summary calculation crashed');

      inlineServer.server.close();
    });

    test('should return 500 error if addActivity controller encounters calculation crash', async () => {
      jest.resetModules();
      jest.unmock('../src/controllers/carbonController');
      jest.doMock('../src/utils/calculations', () => {
        const actual = jest.requireActual('../src/utils/calculations');
        return {
          ...actual,
          calculateTransportEmission: () => {
            throw new Error('Calculator crash');
          }
        };
      });

      const inlineRequest = require('supertest');
      const inlineServer = require('../server');

      const res = await inlineRequest(inlineServer.app)
        .post('/api/carbon/activities')
        .send({ type: 'transport', details: { mode: 'petrol_car', distance: 10 } });

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Failed to process activity: Calculator crash');

      inlineServer.server.close();
    });

    test('should return 500 error if clearActivities controller encounters crash', async () => {
      jest.resetModules();
      jest.unmock('../src/controllers/carbonController');
      jest.doMock('../src/utils/calculations', () => {
        const actual = jest.requireActual('../src/utils/calculations');
        return {
          ...actual,
          getAggregatedSummary: () => {
            throw new Error('Clear summary failed');
          }
        };
      });

      const inlineRequest = require('supertest');
      const inlineServer = require('../server');

      const res = await inlineRequest(inlineServer.app).delete('/api/carbon/activities');
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Failed to clear activities: Clear summary failed');

      inlineServer.server.close();
    });
  });


  describe('Input Sanitizer Utilities', () => {
    const { sanitizeValue } = require('../src/middleware/security');

    test('should return null or undefined as is', () => {
      expect(sanitizeValue(null)).toBeNull();
      expect(sanitizeValue(undefined)).toBeUndefined();
    });

    test('should prevent prototype pollution in sanitizeValue', () => {
      const payload = JSON.parse('{"__proto__": {"polluted": true}, "normal": "text"}');
      const sanitized = sanitizeValue(payload);
      expect(sanitized.__proto__.polluted).toBeUndefined();
      expect(sanitized.normal).toBe('text');
    });
  });
});


