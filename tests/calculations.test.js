/**
 * @fileoverview Unit tests for the carbon emission utility functions.
 */

const {
  calculateTransportEmission,
  calculateMealEmission,
  calculateEnergyEmission,
  calculateTotalEmission,
  EMISSION_FACTORS
} = require('../src/utils/calculations');

describe('Carbon Emission Calculations Utility', () => {
  
  describe('calculateTransportEmission', () => {
    test('should calculate correct emissions for petrol car', () => {
      const distance = 10;
      expect(calculateTransportEmission('petrol_car', distance)).toBe(1.8);
    });

    test('should calculate correct emissions for electric car', () => {
      const distance = 20.5;
      expect(calculateTransportEmission('electric_car', distance)).toBe(1.025);
    });

    test('should return 0 emissions for walking/biking', () => {
      expect(calculateTransportEmission('bike_walk', 100)).toBe(0);
    });

    test('should throw error for negative distance', () => {
      expect(() => calculateTransportEmission('petrol_car', -5)).toThrow();
    });

    test('should throw error for invalid transportation mode', () => {
      expect(() => calculateTransportEmission('spaceship', 10)).toThrow();
    });
  });

  describe('calculateMealEmission', () => {
    test('should calculate correct emissions for beef/lamb meals', () => {
      const count = 3;
      const expected = count * EMISSION_FACTORS.meals.beef_lamb;
      expect(calculateMealEmission('beef_lamb', count)).toBe(expected);
    });

    test('should calculate correct emissions for vegan meals', () => {
      const count = 5;
      const expected = count * EMISSION_FACTORS.meals.vegan;
      expect(calculateMealEmission('vegan', count)).toBe(expected);
    });

    test('should throw error for negative meal count', () => {
      expect(() => calculateMealEmission('vegetarian', -1)).toThrow();
    });

    test('should throw error for invalid diet type', () => {
      expect(() => calculateMealEmission('junkfood', 2)).toThrow();
    });
  });

  describe('calculateEnergyEmission', () => {
    test('should calculate correct energy footprint combination', () => {
      const electricity = 100; // kWh
      const gas = 50;         // kWh
      const expected = (electricity * EMISSION_FACTORS.energy.electricity) + (gas * EMISSION_FACTORS.energy.gas);
      expect(calculateEnergyEmission(electricity, gas)).toBe(expected);
    });

    test('should throw error for negative energy inputs', () => {
      expect(() => calculateEnergyEmission(-10, 5)).toThrow();
      expect(() => calculateEnergyEmission(10, -5)).toThrow();
    });
  });

  describe('calculateTotalEmission', () => {
    test('should aggregate all activity emission categories correctly', () => {
      const activities = [
        {
          type: 'transport',
          details: { mode: 'petrol_car', distance: 10 } // 10 * 0.18 = 1.8
        },
        {
          type: 'meal',
          details: { dietType: 'beef_lamb', count: 1 } // 1 * 7.0 = 7.0
        },
        {
          type: 'energy',
          details: { electricityKwh: 10, gasKwh: 20 } // (10 * 0.45) + (20 * 0.20) = 4.5 + 4.0 = 8.5
        }
      ];

      // Total = 1.8 + 7.0 + 8.5 = 17.3
      expect(calculateTotalEmission(activities)).toBe(17.3);
    });

    test('should return 0 for an empty activity array', () => {
      expect(calculateTotalEmission([])).toBe(0);
    });

    test('should throw error for non-array activities input', () => {
      expect(() => calculateTotalEmission('not-an-array')).toThrow('Activities must be an array');
    });

    test('should warn and continue if an activity item calculation fails', () => {
      const activities = [
        {
          type: 'transport',
          details: { mode: 'spaceship', distance: 10 } // Invalid transportation mode -> throws
        },
        {
          type: 'meal',
          details: { dietType: 'vegan', count: 2 } // 1.0 kg
        }
      ];

      expect(calculateTotalEmission(activities)).toBe(1.0);
    });
  });
});

