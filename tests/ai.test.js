/**
 * @fileoverview Integration tests for the AI chatbot advisor endpoint, mocking Gemini API interactions.
 */

// Mock the Google Gen AI SDK entirely before imports occur
const mockGenerateContent = jest.fn();
jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: mockGenerateContent
        }
      };
    })
  };
});

// Force GEMINI_API_KEY to be set during test execution so initialization triggers
process.env.GEMINI_API_KEY = 'mock_test_key_secret';
// Force dynamic port mapping for testing to prevent conflicts
process.env.PORT = 0;

const request = require('supertest');
const { app, server } = require('../server');
const { aiCache } = require('../src/utils/cache');

// Close the server after tests are finished
afterAll((done) => {
  server.close(done);
});

describe('AI Chatbot Assistant Endpoints', () => {

  beforeEach(async () => {
    // Clear carbon activities and in-memory AI cache before each test
    await request(app).delete('/api/carbon/activities');
    aiCache.clear();
    mockGenerateContent.mockReset();
  });

  describe('POST /api/ai/chat', () => {
    test('should return 400 Bad Request if prompt message is empty', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: '' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('should fallback to local mock engine if no activities logged (even with API key)', async () => {
      // With 0 emissions, controller bypasses or returns the starter message
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'What are some tips?' });

      expect(res.statusCode).toBe(200);
      expect(res.body.cached).toBe(false);
      expect(res.body.response).toContain('haven\'t logged any activities yet');
    });

    test('should query mocked Gemini API when activities exist and key is configured', async () => {
      // Seed an activity so that it goes through standard generation path
      await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'transport', details: { mode: 'petrol_car', distance: 100 } });

      // Mock the resolved API value
      mockGenerateContent.mockResolvedValue({
        text: 'Custom Gemini AI Reduction Strategy: **Switch to walking** and reduce petrol car runs.'
      });

      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'Provide reduction advice' });

      expect(res.statusCode).toBe(200);
      expect(res.body.cached).toBe(false);
      expect(res.body.response).toContain('Custom Gemini AI Reduction Strategy');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    test('should retrieve response from in-memory cache on duplicate calls', async () => {
      // Seed activity
      await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'meal', details: { dietType: 'beef_lamb', count: 3 } });

      mockGenerateContent.mockResolvedValue({
        text: 'Reduce beef/lamb consumption.'
      });

      // Call 1: Fetches from Mocked API
      const res1 = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'How do I reduce my food footprint?' });

      expect(res1.statusCode).toBe(200);
      expect(res1.body.cached).toBe(false);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // Call 2: Fetches from in-memory cache directly
      const res2 = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'How do I reduce my food footprint?' });

      expect(res2.statusCode).toBe(200);
      expect(res2.body.cached).toBe(true);
      expect(res2.body.response).toBe(res1.body.response);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1); // Still 1 call
    });

    test('should fallback gracefully to mock engine if Gemini API throws exception', async () => {
      // Seed activity
      await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'energy', details: { electricityKwh: 50, gasKwh: 50 } });

      // Mock rejection/failure
      mockGenerateContent.mockRejectedValue(new Error('Quota limit exceeded or connection timeout'));

      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'Get reduction advice' });

      expect(res.statusCode).toBe(200);
      expect(res.body.cached).toBe(false);
      // Fallback engine response contains text related to home energy tips since that's highest
      expect(res.body.response).toContain('home energy');
    });

    test('should return 500 error if chatbot controller crashes', async () => {
      jest.resetModules();
      process.env.GEMINI_API_KEY = 'mock_test_key_secret';
      jest.doMock('../src/controllers/carbonController', () => {
        const actual = jest.requireActual('../src/controllers/carbonController');
        return {
          ...actual,
          getRawActivities: () => {
            throw new Error('Test database crash');
          }
        };
      });


      const inlineRequest = require('supertest');
      const inlineServer = require('../server');

      const res = await inlineRequest(inlineServer.app)
        .post('/api/ai/chat')
        .send({ message: 'Hello' });

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Failed to generate chat response: Test database crash');

      inlineServer.server.close();
    });


    test('should test all paths in generateMockResponse via chat route fallbacks', async () => {
      // Temporarily disable Live AI Client to force local mock engine
      const geminiConfig = require('../src/config/gemini');
      const originalAi = geminiConfig.ai;
      geminiConfig.ai = null;

      // Path A: Primary source is transport, asks to reduce
      await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'transport', details: { mode: 'petrol_car', distance: 100 } }); // 18 kg CO2e
      
      const resTransReduce = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'reduce transport' });
      expect(resTransReduce.body.response).toContain('transportation');

      // Clear activities
      await request(app).delete('/api/carbon/activities');

      // Path B: Primary source is meals, asks to reduce
      await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'meal', details: { dietType: 'beef_lamb', count: 5 } }); // 35 kg CO2e
      
      const resMealReduce = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'tips for food' });
      expect(resMealReduce.body.response).toContain('dietary');

      // Path C: Primary source is energy, general chat response
      await request(app).delete('/api/carbon/activities');
      await request(app)
        .post('/api/carbon/activities')
        .send({ type: 'energy', details: { electricityKwh: 100, gasKwh: 100 } }); // 65 kg CO2e

      const resEnergyGeneral = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'hello assistant' });
      expect(resEnergyGeneral.body.response).toContain('home energy');

      // Restore AI
      geminiConfig.ai = originalAi;
    });
  });

  describe('Gemini SDK Config Module', () => {
    test('should warn if API key is missing', () => {
      jest.resetModules();
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      const gemini = require('../src/config/gemini');
      expect(gemini.ai).toBeNull();

      process.env.GEMINI_API_KEY = originalKey;
    });

    test('should catch initialization error if GoogleGenAI constructor throws', () => {
      jest.resetModules();
      const { GoogleGenAI } = require('@google/genai');
      const mockConstructor = jest.spyOn(require('@google/genai'), 'GoogleGenAI').mockImplementation(() => {
        throw new Error('Constructor failed');
      });

      const gemini = require('../src/config/gemini');
      expect(gemini.ai).toBeNull();

      mockConstructor.mockRestore();
    });
  });
});

