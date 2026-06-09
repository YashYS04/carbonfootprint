/**
 * @fileoverview Utility functions for calculating carbon footprint metrics based on standardized environmental factors.
 * All factors represent kilograms of CO2 equivalent (kg CO2e) per unit.
 */

/**
 * Standard emission factors.
 * @type {Readonly<{transport: {petrol_car: number, electric_car: number, public_transit: number, bike_walk: number}, meals: {vegan: number, vegetarian: number, poultry_pork: number, beef_lamb: number}, energy: {electricity: number, gas: number}}>}
 */
const EMISSION_FACTORS = Object.freeze({
  transport: {
    petrol_car: 0.18,      // kg CO2e per km
    electric_car: 0.05,    // kg CO2e per km
    public_transit: 0.04,  // kg CO2e per km
    bike_walk: 0.0         // kg CO2e per km
  },
  meals: {
    vegan: 0.5,            // kg CO2e per meal
    vegetarian: 1.0,       // kg CO2e per meal
    poultry_pork: 2.5,     // kg CO2e per meal
    beef_lamb: 7.0         // kg CO2e per meal
  },
  energy: {
    electricity: 0.45,     // kg CO2e per kWh
    gas: 0.20              // kg CO2e per kWh
  }
});

/**
 * Calculates carbon emissions from transportation.
 * @param {string} mode - The transportation mode ('petrol_car', 'electric_car', 'public_transit', 'bike_walk').
 * @param {number} distance - The distance traveled in kilometers. Must be non-negative.
 * @returns {number} The calculated emissions in kg CO2e.
 */
function calculateTransportEmission(mode, distance) {
  const dist = parseFloat(distance);
  if (isNaN(dist) || dist < 0) {
    throw new Error('Distance must be a non-negative number');
  }

  const factor = EMISSION_FACTORS.transport[mode];
  if (factor === undefined) {
    throw new Error(`Invalid transportation mode: ${mode}`);
  }

  return parseFloat((dist * factor).toFixed(3));
}

/**
 * Calculates carbon emissions from a single meal category.
 * @param {string} dietType - The type of diet ('vegan', 'vegetarian', 'poultry_pork', 'beef_lamb').
 * @param {number} count - The number of meals. Must be a non-negative integer.
 * @returns {number} The calculated emissions in kg CO2e.
 */
function calculateMealEmission(dietType, count) {
  const mealCount = parseInt(count, 10);
  if (isNaN(mealCount) || mealCount < 0) {
    throw new Error('Meal count must be a non-negative integer');
  }

  const factor = EMISSION_FACTORS.meals[dietType];
  if (factor === undefined) {
    throw new Error(`Invalid diet type: ${dietType}`);
  }

  return parseFloat((mealCount * factor).toFixed(3));
}

/**
 * Calculates carbon emissions from home energy usage.
 * @param {number} electricityKwh - Electricity consumed in kWh. Must be non-negative.
 * @param {number} gasKwh - Natural gas consumed in kWh. Must be non-negative.
 * @returns {number} The calculated emissions in kg CO2e.
 */
function calculateEnergyEmission(electricityKwh, gasKwh) {
  const elec = parseFloat(electricityKwh);
  const gasVal = parseFloat(gasKwh);

  if (isNaN(elec) || elec < 0 || isNaN(gasVal) || gasVal < 0) {
    throw new Error('Electricity and gas inputs must be non-negative numbers');
  }

  const elecEmissions = elec * EMISSION_FACTORS.energy.electricity;
  const gasEmissions = gasVal * EMISSION_FACTORS.energy.gas;

  return parseFloat((elecEmissions + gasEmissions).toFixed(3));
}

/**
 * Calculates total carbon emissions for a set of logged activities.
 * @param {Array<{type: string, details: object}>} activities - Array of user-logged activities.
 * @returns {number} The total emissions in kg CO2e.
 */
function calculateTotalEmission(activities) {
  if (!Array.isArray(activities)) {
    throw new Error('Activities must be an array');
  }

  let total = 0;

  for (const activity of activities) {
    const { type, details } = activity;
    if (!type || !details) continue;

    try {
      if (type === 'transport') {
        total += calculateTransportEmission(details.mode, details.distance);
      } else if (type === 'meal') {
        total += calculateMealEmission(details.dietType, details.count);
      } else if (type === 'energy') {
        total += calculateEnergyEmission(details.electricityKwh, details.gasKwh);
      }
    } catch (err) {
      // Log warning and ignore malformed items for calculation safety, or bubble up
      console.warn(`Skipping calculation for invalid activity item: ${err.message}`);
    }
  }

  return parseFloat(total.toFixed(3));
}

module.exports = {
  EMISSION_FACTORS,
  calculateTransportEmission,
  calculateMealEmission,
  calculateEnergyEmission,
  calculateTotalEmission
};
