# 🌍 Carbon Footprint Awareness Platform

## 🎯 The Vertical & Persona
**Persona:** The Eco-Curious Urban Commuter.
**Goal:** Helping daily commuters track their transport and energy footprint while offering highly personalized, actionable AI-driven reduction strategies.

## 🧠 Approach and Logic
The platform uses a modular architecture containerized for Google Cloud Run. The core tracking engine calculates emission metrics based on standardized environmental data. To provide contextual advice, user logs are processed through an intelligent agent powered by Gemini 2.5 Flash (via Google ADK), generating tailored, context-aware suggestions rather than generic, static advice.

## ⚙️ How the Solution Works
1.  **Data Ingestion:** Users input daily activities via an accessible, WCAG-compliant UI.
2.  **Processing:** The backend sanitizes inputs securely and calculates the raw carbon equivalent.
3.  **Smart Assistant:** The state is passed to the Gemini 2.5 Flash model, which returns dynamic insights and achievable micro-goals.
4.  **Reporting:** Data and AI insights are rendered back to the user seamlessly.

## 🔐 Assumptions Made
* Users are comfortable interacting with an AI assistant for personalized guidance.
* The application will be hosted in a stateless, containerized environment (Cloud Run)
