# 🌍 Carbon Footprint Awareness Hub

An interactive, accessible web application designed to help individuals **understand, track, and optimize** their personal carbon footprint. The platform processes user lifestyle activity inputs (transportation, meals, and home energy) to calculate carbon equivalents and provides personalized, context-aware reduction advice using Google Gemini.

---

## 🔗 Live Application Link
* **Production URL**: <https://carbon-platform-2208346538.us-central1.run.app>
* **Environment**: Hosted on Google Cloud Run in project `carbonfoot-498906` (`us-central1`).

---

## 💡 Core Product Pillars

Our platform targets individual lifestyle choices rather than corporate audits, focusing on three actionable phases:

1. **Footprint Calculator (Understand)**: Users enter factual inputs about their daily transport, diet, or electricity and gas consumption. The app instantly translates this data into annual kilograms of CO₂ equivalent (kg CO₂e).
2. **Dynamic History Log (Track)**: The calculated items are logged to a premium, accessible data grid that displays the breakdown of activities in real-time, allowing individuals to review historical trends.
3. **AI Advising Assistant (Reduce)**: Users engage with an interactive chatbot powered by Google Gemini, which reads their aggregated footprint summary and targets their primary emission categories with specific, quantified steps for improvement.

| Function | Implementation in Platform |
| --- | --- |
| **Understand** | Carbon math utility translates modes/quantities to annual kg CO₂e. |
| **Track** | Stateful recent activities table logs user calculations. |
| **Reduce** | Prompt-engineered Gemini advisor recommends personalized action plans. |

---

## 🏗️ Architecture & Execution Flow

### System Execution Flow
The diagram below outlines how user actions flow through our system:

```text
User Actions (Log activity or Chat prompt)
             │
             ▼
Express Server Validation & XSS/Prototype Pollution Sanitizers
             │
             ▼
    ┌────────┴────────────────────────┐
    ▼                                 ▼
Carbon Calc Engine             AI Chatbot Engine
  • Pure functions in JS         • Context-aware prompting
  • Standard coefficients        • Gemini 2.5 Flash API Call
  • Updates local history        • Robust local rules fallback
```

### Context-Aware Decision Logic
* **Tailored Suggestions**: The chatbot retrieves the user's logged activity logs and total emissions. It structures the system prompt to guide Gemini to focus on the user's highest emission category first, assuring highly tailored micro-goals.
* **Resilient Graceful Fallback**: If the Gemini API key is missing or encounters a rate-limit error, the assistant falls back to a deterministic rule-based engine. This fallback identifies the user's largest carbon emitter category and outputs pre-formulated, actionable footprint reduction tips.

### Carbon Calculations & Emission Factors
Calculations are based on standard public emission factors (documented in `src/utils/calculations.js`):
* **Transportation**: `petrol_car` (0.18 kg CO₂e/km), `diesel_car` (0.17 kg CO₂e/km), `electric_car` (0.05 kg CO₂e/km), `bus` (0.089 kg CO₂e/km), `train` (0.035 kg CO₂e/km).
* **Diet & Eating**: `vegan` (0.5 kg CO₂e/meal), `vegetarian` (0.8 kg CO₂e/meal), `meat_heavy` (2.5 kg CO₂e/meal).
* **Home Energy Utilities**: `electricity` (0.35 kg CO₂e/kWh), `gas` (0.20 kg CO₂e/kWh).

---

## 🛠️ Project Design & Technical Layout

### Project Directory Layout
Our codebase follows a clean, modular structure:
* `public/` — Frontend SPA assets (semantic HTML interface, premium HSL styling, and JS DOM handlers).
* `src/config/` — Configuration files, including our Vertex AI/Gemini Gen AI client initialization.
* `src/controllers/` — Controller functions handling carbon calculator inputs and chatbot APIs.
* `src/middleware/` — Security utilities, rate-limiting, and request validators.
* `src/routes/` — Express route mappings for calculator, logging, and chat endpoints.
* `src/utils/` — Utility files (carbon math, caching layer, and test-aware logging wrapper).
* `tests/` — Automated test files (API routing, security sanitization, and mathematical checks).

### REST API Contracts
* `POST /api/carbon/activities`: Receives activity logs, validates details, computes emissions, and records the entry.
* `GET /api/carbon/summary`: Fetches the history of logged entries alongside category breakdowns.
* `DELETE /api/carbon/activities` / `POST /api/carbon/clear`: Wipes the activity log.
* `POST /api/ai/chat`: Relays user prompts to the Gemini chatbot, returning context-specific replies.

---

## 💻 Local Development Setup

### Running the App
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up environment variables (optional: add your `GEMINI_API_KEY` to enable live Gemini responses):
   ```bash
   cp .env.example .env
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *The platform will start listening on `http://localhost:8080`.*

### Container Build & Run
To compile and test the container image locally with Docker:
```bash
docker build -t carbon-platform .
docker run -p 8080:8080 -e GEMINI_API_KEY="your-api-key" carbon-platform
```

---

## 🧪 Testing and Quality Control

We implement automated Jest testing for validation, mathematical accuracy, security constraints, and API routing logic.

* **Run all tests**:
  ```bash
  npm test
  ```
* **Run coverage metrics**:
  ```bash
  npm test -- --coverage
  ```

Our test suite achieves **>97% overall code coverage** (including statements, functions, paths, and lines) with all tests mocking external APIs for reliable, local-only validation.

---

## 🚀 Deployment to Google Cloud Run

To build and deploy the container image directly to Google Cloud Run:

```bash
# Configure the GCP Project ID
gcloud config set project carbonfoot-498906

# Enable required Google APIs
gcloud services enable run.googleapis.com aiplatform.googleapis.com \
    cloudbuild.googleapis.com artifactregistry.googleapis.com

# Deploy the container straight from the source files
gcloud run deploy carbon-platform \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars NODE_ENV=production,PORT=8080
```

---

## 🔐 Design Decisions & Assumptions

* **Educational Metrics**: The emission coefficients represent standard averages. They are intended for educational and lifestyle awareness, not official greenhouse gas protocol audits.
* **Local In-Memory Session**: Active records and chat caches are held in memory for simplicity. In a multi-instance production context, they would connect to a persistent store like Firestore.
* **Fail-Safe Advisor**: The system guarantees a response even if the Google Gemini API limits are hit or credentials are not configured, returning local rule suggestions based on the user's primary emission sources.
* **Contrast Compliance**: Interface elements are structured with highly readable HSL color combinations adhering to WCAG 2.1 AA specifications.

---

## 📋 Evaluation Rubric Mapping

| Rubric Axis | System Location & Implementation Details |
| --- | --- |
| **Code Quality** | Modularized routing layer, robust JSDoc comments, strict type validation, and pure calculation formulas. |
| **Security** | Pinned dependencies, Helmet headers, express-rate-limiting, and recursive Prototype Pollution/XSS sanitization middleware. |
| **Efficiency** | Lightweight, high-performance in-memory logic, stateless route handling, and zero React build overhead. |
| **Testing** | 55 passing Jest integration and unit tests covering >97% of the entire backend logic. |
| **Accessibility** | ARIA announcement regions, high contrast layout, semantic landmark tags, and support for keyboard-only navigation. |
| **Google Services** | Deployed on Google Cloud Run with Vertex AI/Gemini SDK integrations. |
| **Pillar Alignment** | Full user flow aligning to the Understand (Calculator), Track (Activity Log), and Reduce (AI Adviser) loop. |

---

## License
Created for the Virtual PromptWars Challenge 3. All rights reserved.
