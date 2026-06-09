/**
 * @fileoverview Controller for the Gemini 2.5 Flash chatbot assistant, delivering personalized carbon insights.
 */

const { ai } = require('../config/gemini');
const { aiCache } = require('../utils/cache');
const { getRawActivities } = require('./carbonController');

/**
 * Handles chatbot requests from users. Grounded on their actual carbon footprint history.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
async function chat(req, res) {
  try {
    const { message } = req.body;
    const activities = getRawActivities();
    const summary = getAggregatedSummary(activities);

    // Create a stable cache key based on user message and current footprint summary
    const cacheKey = `chat_${message.trim().toLowerCase()}_${summary.totalCo2}_${summary.byCategory.transport}_${summary.byCategory.meal}_${summary.byCategory.energy}`;
    
    // Check in-memory cache first
    const cachedResponse = aiCache.get(cacheKey);
    if (cachedResponse) {
      return res.status(200).json({
        response: cachedResponse,
        cached: true
      });
    }

    // Build grounding prompt with user context
    const contextPrompt = buildGroundingPrompt(message, activities, summary);

    const systemInstruction = 
      "You are a helpful, encouraging, and friendly Carbon Footprint Awareness Assistant. " +
      "Your goal is to analyze the user's carbon tracking history and provide actionable, personalized micro-goals and reduction strategies. " +
      "Prioritize structure (e.g. bold terms, lists) for readability. Keep responses concise and focused.";

    let assistantResponse = '';

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: contextPrompt,
          config: {
            systemInstruction: systemInstruction
          }
        });

        if (response && response.text) {
          assistantResponse = response.text.trim();
        } else {
          throw new Error('Empty response from Gemini');
        }
      } catch (geminiError) {
        console.error('Gemini API Error, falling back to local reasoning:', geminiError.message);
        assistantResponse = generateMockResponse(message, summary);
      }
    } else {
      // Offline/test mock reasoning engine
      assistantResponse = generateMockResponse(message, summary);
    }

    // Save successful response to cache (TTL: 5 minutes)
    aiCache.set(cacheKey, assistantResponse, 300);

    return res.status(200).json({
      response: assistantResponse,
      cached: false
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate chat response: ' + error.message });
  }
}

/**
 * Builds the prompt sending user context and history to the model.
 * @private
 * @param {string} userMessage - User query.
 * @param {Array} activities - List of logged activities.
 * @param {object} summary - Calculated aggregates.
 * @returns {string} The constructed prompt.
 */
function buildGroundingPrompt(userMessage, activities, summary) {
  const activityDetailsList = activities.map(act => {
    let detailsStr = '';
    if (act.type === 'transport') {
      detailsStr = `${act.details.distance} km via ${act.details.mode.replace('_', ' ')}`;
    } else if (act.type === 'meal') {
      detailsStr = `${act.details.count} ${act.details.dietType} meal(s)`;
    } else if (act.type === 'energy') {
      detailsStr = `${act.details.electricityKwh} kWh electricity, ${act.details.gasKwh} kWh gas`;
    }
    return `- [${new Date(act.timestamp).toLocaleDateString()}] ${act.type.toUpperCase()}: ${detailsStr} (${act.emissions} kg CO2e)`;
  }).slice(-10).join('\n'); // Send last 10 activities

  return `
You are interacting with a user whose persona is the "Eco-Curious Urban Commuter".
Here is their logged carbon footprint data:
- **Total Footprint**: ${summary.totalCo2} kg CO2e
- **Transportation**: ${summary.byCategory.transport} kg CO2e
- **Meals/Diet**: ${summary.byCategory.meal} kg CO2e
- **Home Energy**: ${summary.byCategory.energy} kg CO2e

**Recent Activities Logged:**
${activityDetailsList || 'No activities logged yet.'}

**User Question/Message**:
"${userMessage}"

Provide a tailored response with micro-goals and carbon footprint reduction strategies matching their data. If they haven't logged anything, encourage them to log their first activity!
`;
}

/**
 * Local fallback response generator for offline execution, testing, and rate-limits.
 * Uses user metrics to produce detailed, context-aware advice.
 * @private
 * @param {string} userMessage - User input.
 * @param {object} summary - Footprint summary stats.
 * @returns {string} Tailored advice output.
 */
function generateMockResponse(userMessage, summary) {
  const msgLower = userMessage.toLowerCase();
  
  if (summary.totalCo2 === 0) {
    return `Hello! 🌍 I see you haven't logged any activities yet today. 
To get started, try logging your transportation or meals using the tracker. Once you log your details, I can calculate your exact carbon footprint and provide personalized micro-goals to help you reduce it!`;
  }

  // Determine highest footprint category
  const categories = [
    { name: 'transportation', emissions: summary.byCategory.transport },
    { name: 'dietary', emissions: summary.byCategory.meal },
    { name: 'home energy', emissions: summary.byCategory.energy }
  ];
  categories.sort((a, b) => b.emissions - a.emissions);
  const primarySource = categories[0].name;

  if (msgLower.includes('goal') || msgLower.includes('reduce') || msgLower.includes('tip') || msgLower.includes('how')) {
    let tips = '';
    if (primarySource === 'transportation') {
      tips = `- **Try Public Transit or Cycling**: You currently have ${summary.byCategory.transport} kg CO2e from transport. Replacing a 10km solo drive with public transport saves roughly 1.4 kg CO2e!
- **Group trips**: Combine errands into one route.`;
    } else if (primarySource === 'dietary') {
      tips = `- **Try a Vegetarian/Vegan Day**: Red meat accounts for substantial emissions (approx. 7 kg CO2e per meal). Swapping one beef meal for a vegetarian option cuts its impact by 85%!
- **Reduce Food Waste**: Shop mindfully to prevent food spoilage.`;
    } else {
      tips = `- **Unplug idle electronics**: "Vampire power" accounts for up to 10% of household electric bills.
- **Adjust Thermostats**: Lowering your heating or raising AC by 1°C can reduce energy emissions significantly.`;
    }

    return `Here is your custom footprint analysis:
Your current footprint is **${summary.totalCo2} kg CO2e**, with **${primarySource}** being your largest emissions source.

**Suggested Micro-Goals:**
${tips}
- **Log Daily**: Keep tracking your activities to visualize your progress over time!`;
  }

  return `Thanks for sharing! I've analyzed your daily carbon footprint (currently at **${summary.totalCo2} kg CO2e**). 

Your largest emission contributor is **${primarySource}** (${summary.byCategory[primarySource === 'dietary' ? 'meal' : primarySource === 'home energy' ? 'energy' : 'transport']} kg CO2e). 
Would you like some specific, actionable tips to reduce emissions from this category? Just ask me for "reduction tips"!`;
}

/**
 * Helper to calculate summary for prompt building.
 * @private
 */
function getAggregatedSummary(activitiesList) {
  const summary = {
    totalCo2: 0,
    byCategory: {
      transport: 0,
      meal: 0,
      energy: 0
    }
  };

  for (const activity of activitiesList) {
    summary.totalCo2 += activity.emissions;
    if (summary.byCategory[activity.type] !== undefined) {
      summary.byCategory[activity.type] += activity.emissions;
    }
  }

  summary.totalCo2 = parseFloat(summary.totalCo2.toFixed(3));
  summary.byCategory.transport = parseFloat(summary.byCategory.transport.toFixed(3));
  summary.byCategory.meal = parseFloat(summary.byCategory.meal.toFixed(3));
  summary.byCategory.energy = parseFloat(summary.byCategory.energy.toFixed(3));

  return summary;
}

module.exports = {
  chat,
  generateMockResponse
};
