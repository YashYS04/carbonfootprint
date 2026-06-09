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
});
