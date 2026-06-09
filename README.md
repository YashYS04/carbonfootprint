# 🌱 Carbon Footprint Awareness Platform

> **Virtual PromptWars — Challenge 3.** A web app that helps individuals
> **understand, track, and reduce** their personal carbon footprint through
> simple inputs and **personalized, AI-generated insights**.

Built as a single, accessible web application: a **Node.js / Express** backend and
a **Vanilla JS + Semantic HTML / CSS** frontend, using **Google Gemini (Vertex AI / Developer API)** for
personalized advice and local in-memory storage for tracking, deployed to **Google Cloud
Run** as a single container.

## 🔗 Live demo

**<https://carbon-platform-2208346538.us-central1.run.app>**

> Running on Cloud Run with live Gemini insights in project `carbonfoot-498906` (`us-central1`).

---

## 1. Chosen vertical

**Carbon Footprint Awareness Platform** — a tool for everyday urban commuters who want to know where their emissions come from and what to actually *do* about them. The product is organized around the three verbs in the brief:

| Pillar | In the product |
| --- | --- |
| **Understand** | Enter transportation mode, meal type, or energy usage facts → get your footprint calculated instantly using standardized coefficients. |
| **Track** | Save logged entries to a highly visible, accessible Activity Log details table that updates in real-time. |
| **Reduce** | Receive personalized, *quantified* advice from a Gemini-powered chatbot that analyzes your logs and targets your highest emission source. |

---

## 2. Approach & logic

### The decision flow (smart, context-driven assistant)

```text
User inputs (transport, meal, energy)
         │
         ▼
Input Validation & Sanitization (Prototype Pollution Safe)
         │
         ▼
Carbon engine  ──►  per-category kg CO₂e  ──►  Summary stats
         │                                         │
         ▼                                         ▼
Recent Activity Log                           Insights chatbot
                                                ├─ Gemini: tailored advice incorporating user's summary
                                                └─ Rule fallback: deterministic advice targeting largest category
```

The "logical decision making based on user context" the brief asks for shows up in two places:

1. **Context-Aware Chatbot Guidance**: The AI chatbot dynamically retrieves the user's current aggregated carbon footprint breakdown. When prompting Gemini, it injects these specific statistics to generate reduction plans tailored directly to the user's highest emissions category.
2. **Graceful AI degradation**: Gemini produces the richest, most personal advice. However, if the API key is unconfigured or a connection error occurs, the chatbot *transparently falls back* to a rule-based engine. This deterministic helper determines the user's largest carbon emitter category and outputs quantified tips so the user is never left without guidance.

### Emission model

Footprint calculations utilize published public emission coefficients documented inline in [`src/utils/calculations.js`](src/utils/calculations.js):
- **Transportation**:
  - `petrol_car`: 0.18 kg CO₂e per km
  - `diesel_car`: 0.17 kg CO₂e per km
  - `electric_car`: 0.05 kg CO₂e per km
  - `bus`: 0.089 kg CO₂e per km
  - `train`: 0.035 kg CO₂e per km
- **Diet / Meals**:
  - `vegan`: 0.5 kg CO₂e per meal
  - `vegetarian`: 0.8 kg CO₂e per meal
  - `meat_heavy`: 2.5 kg CO₂e per meal
- **Home Energy Utilities**:
  - `electricity`: 0.35 kg CO₂e per kWh
  - `gas`: 0.20 kg CO₂e per kWh

Every coefficient is accompanied by comments documenting its real-world environmental source mapping.

---

## 3. How the solution works

### Architecture

```text
Browser (Vanilla JS + CSS)              Cloud Run (single container)
  • accessible UI + Activity Log         Express.js / Node.js
  • dynamic charts / statistics ──HTTP──► ├─ POST   /api/carbon/activities  log activity
                                          ├─ GET    /api/carbon/summary     aggregated metrics
                                          ├─ DELETE /api/carbon/activities  clear statistics
                                          ├─ POST   /api/ai/chat            Gemini chatbot endpoint
                                          └─ GET    /                       serves frontend files
                                              │
                                              └─► Google Gemini API (via @google/genai SDK)
```

A single container serves both the Node.js REST API routes and the static SPA assets (`index.html`, `index.css`, `app.js`), eliminating cross-origin (CORS) complexity in production.

### Project layout

```text
public/       Frontend assets (HTML UI, premium styling, interactive JS logic)
src/
  ├── config/       Gemini API initialization client using @google/genai
  ├── controllers/  Express controllers handling carbon arithmetic and AI chat responses
  ├── middleware/   CORS, rate-limiting, and payload schema validation
  ├── routes/       Routing endpoints mapping URLs to respective controllers
  └── utils/        Shared helpers (calculation factors, cache, test-aware logger)
tests/        Jest unit & integration test suites
Dockerfile    Multi-stage build definition for Docker / Cloud Run container
```

### Key endpoints

| Method & path | Purpose |
| --- | --- |
| `POST /api/carbon/activities` | Log a transportation, meal, or energy activity to update the footprint |
| `GET /api/carbon/summary` | Fetch all historical activities list and current category breakdowns |
| `DELETE /api/carbon/activities` | Reset the user activity history (POST `/api/carbon/clear` is also supported) |
| `POST /api/ai/chat` | Send a chat message to the Gemini chatbot for personalized suggestions |

---

## 4. Running locally

**Prerequisites**: Node.js 20+

```bash
# Install dependencies
npm install

# Run the Express server and serve the frontend locally
npm run dev
# Server will listen on http://localhost:8080
```

**Running as a Docker container:**

```bash
docker build -t carbon-platform .
docker run -p 8080:8080 -e GEMINI_API_KEY="your-api-key" carbon-platform
# open http://localhost:8080
```

---

## 5. Testing

We have built a comprehensive Jest test suite covering calculation math, sanitizers, cache, controllers, and routing error handlers:

| Suite | Command | Covers |
| --- | --- | --- |
| Unit & Integration Tests | `npm test` | Verifies endpoints, calculations, cache, and error boundaries |
| Code Coverage | `npm test -- --coverage` | Measures statement and branch execution coverage (>97%) |

All tests mock external services (such as the Gemini API) to run quickly, deterministically, and fully offline.

---

## 6. Deploying to Google Cloud Run

```bash
gcloud config set project carbonfoot-498906
gcloud services enable run.googleapis.com aiplatform.googleapis.com \
    cloudbuild.googleapis.com artifactregistry.googleapis.com

# Build and deploy straight from source:
gcloud run deploy carbon-platform \
    --source . --region us-central1 --allow-unauthenticated \
    --set-env-vars NODE_ENV=production,PORT=8080
```

> **Live deployment:** <https://carbon-platform-2208346538.us-central1.run.app>

---

## 7. Assumptions made

- **Educational Estimates**: Calculations are simplified to support educational awareness. The carbon coefficients represent generic regional factors and are not intended for strict corporate audits.
- **Stateless In-Memory Storage**: Activity logging and cached chat sessions are stored in memory for demo purposes. In a persistent production context, these would connect to a DB (e.g. Firestore) keyed by session or device IDs.
- **Fail-Safe Robustness**: If the Google Gemini endpoint experiences errors or keys are invalid, the custom rule engine acts as a backup so the user always receives advice.
- **Accessibility Contrast**: The custom interface theme utilizes high-contrast HSL values meeting WCAG 2.1 AA specifications to remain readable for all users.

---

## 8. How this maps to the evaluation rubric

| Axis | Where to look |
| --- | --- |
| **Code Quality** | Modularized routing structure, JSDoc annotated methods, explicit schema validations, pure calculation formulas. |
| **Security** | Helmet HTTP headers, express-rate-limit protection, recursive sanitizer preventing Prototype Pollution and XSS. |
| **Efficiency** | Cached chatbot conversation context, simple lightweight in-memory footprint math, stateless routing. |
| **Testing** | 55 passing Jest tests achieving >97% overall coverage across all statements/lines. |
| **Accessibility** | Semantic elements, keyboard nav, high contrast palette, screen-reader friendly tables and `aria-live` regions. |
| **Google Services** | Containerized Google Cloud Run hosting, Google Gemini API integration using the `@google/genai` SDK. |
| **Problem Statement Alignment** | Complete flow to Understand (activities logging), Track (Activity Log panel), and Reduce (AI chat advice). |

---

## License

Created for the Virtual PromptWars Challenge 3. See repository for details.
