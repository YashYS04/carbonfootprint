/**
 * @fileoverview Main client-side script for serving dashboard interactions, activity logging, and AI helper integration.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  const formTransport = document.getElementById('form-transport');
  const formMeals = document.getElementById('form-meals');
  const formEnergy = document.getElementById('form-energy');
  
  const totalCo2Display = document.getElementById('total-co2-display');
  const valTransport = document.getElementById('val-transport');
  const valMeals = document.getElementById('val-meals');
  const valEnergy = document.getElementById('val-energy');
  
  const barTransport = document.getElementById('bar-transport');
  const barMeals = document.getElementById('bar-meals');
  const barEnergy = document.getElementById('bar-energy');
  
  const btnReset = document.getElementById('btn-reset');
  const logFeedback = document.getElementById('log-feedback');
  
  const chatMessages = document.getElementById('chat-messages');
  const formChat = document.getElementById('form-chat');
  const chatInput = document.getElementById('chat-input');
  const chatSubmit = document.getElementById('chat-submit');

  // --- State Variables ---
  let maxCategoryEmission = 15.0; // Dynamic scale ceiling for progress bar percentage calculations

  // --- Initialize Platform ---
  fetchSummaryData();

  // --- Accessible Tab Controller ---
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetPanelId = button.getAttribute('aria-controls');
      
      // Deactivate all buttons & panels
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
        btn.setAttribute('tabindex', '-1');
      });
      tabPanels.forEach(panel => {
        panel.classList.remove('active');
        panel.setAttribute('hidden', 'true');
      });

      // Activate selected
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      button.removeAttribute('tabindex');
      
      const targetPanel = document.getElementById(targetPanelId);
      targetPanel.classList.add('active');
      targetPanel.removeAttribute('hidden');
    });

    // Keyboard Arrow Keys support for tab navigation
    button.addEventListener('keydown', (e) => {
      const tabs = Array.from(tabButtons);
      const index = tabs.indexOf(button);
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        const nextTab = tabs[index + 1] || tabs[0];
        nextTab.focus();
        nextTab.click();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        const prevTab = tabs[index - 1] || tabs[tabs.length - 1];
        prevTab.focus();
        prevTab.click();
      }
    });
  });

  // --- API Integrations ---

  /**
   * Fetches summary dashboard statistics from the server.
   */
  async function fetchSummaryData() {
    try {
      const res = await fetch('/api/carbon/summary');
      if (!res.ok) throw new Error('Failed to load dashboard summary data.');
      
      const data = await res.json();
      updateDashboardUI(data.summary);
    } catch (err) {
      showFeedback(err.message, 'error');
    }
  }

  /**
   * Posts activity log items to the backend API.
   * @param {string} type - Activity category ('transport', 'meal', 'energy')
   * @param {object} details - Payload specifications
   */
  async function logActivity(type, details) {
    try {
      const res = await fetch('/api/carbon/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, details })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record activity.');

      showFeedback('Activity successfully logged!', 'success');
      updateDashboardUI(data.summary);

      // Trigger automatic AI assistant check-in reminder
      appendChatBubble('system', `Your activity was recorded! Emitted: **${data.activity.emissions} kg CO2e**. I've updated your dashboard summary. Ask me for suggestions based on this activity!`);
    } catch (err) {
      showFeedback(err.message, 'error');
    }
  }

  // --- Form Submissions ---

  formTransport.addEventListener('submit', (e) => {
    e.preventDefault();
    const mode = document.getElementById('transport-mode').value;
    const distance = parseFloat(document.getElementById('transport-distance').value);
    
    logActivity('transport', { mode, distance });
    formTransport.reset();
  });

  formMeals.addEventListener('submit', (e) => {
    e.preventDefault();
    const dietType = document.getElementById('meal-diet').value;
    const count = parseInt(document.getElementById('meal-count').value, 10);
    
    logActivity('meal', { dietType, count });
    formMeals.reset();
  });

  formEnergy.addEventListener('submit', (e) => {
    e.preventDefault();
    const electricityKwh = parseFloat(document.getElementById('energy-electricity').value);
    const gasKwh = parseFloat(document.getElementById('energy-gas').value);
    
    logActivity('energy', { electricityKwh, gasKwh });
    formEnergy.reset();
  });

  // --- Data Reset Function ---
  btnReset.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to clear your daily tracking history? This will clear all calculations.')) {
      return;
    }

    try {
      const res = await fetch('/api/carbon/clear', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear data.');

      showFeedback('Footprint tracker reset to zero.', 'success');
      updateDashboardUI(data.summary);
      
      // Clear Chat log except first message
      chatMessages.innerHTML = `
        <div class="chat-msg system">
          <div class="msg-bubble">Hello! I'm your Smart Carbon Assistant. Track your daily activities or ask me for personalized strategies to reduce emissions.</div>
        </div>
      `;
    } catch (err) {
      showFeedback(err.message, 'error');
    }
  });

  // --- Smart Advisor Chat Integration ---

  formChat.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    // Append user bubble
    appendChatBubble('user', message);
    chatInput.value = '';
    
    // Set UI to loading status
    chatInput.disabled = true;
    chatSubmit.disabled = true;
    const loadingBubble = appendChatBubble('system', 'Analyzing footprint and thinking...');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      const data = await res.json();
      
      // Remove loading indicator
      loadingBubble.remove();

      if (!res.ok) {
        throw new Error(data.error || 'Chat advisor encountered an error.');
      }

      appendChatBubble('system', data.response);
    } catch (err) {
      if (loadingBubble) loadingBubble.remove();
      appendChatBubble('system', `Sorry, I had trouble connecting: ${err.message}`);
    } finally {
      chatInput.disabled = false;
      chatSubmit.disabled = false;
      chatInput.focus();
    }
  });

  // --- Helper Routines ---

  /**
   * Refreshes the numbers and progress bars in the dashboard cards.
   * @param {object} summary - Emissions aggregate object.
   */
  function updateDashboardUI(summary) {
    if (!summary) return;

    totalCo2Display.textContent = summary.totalCo2.toFixed(1);
    valTransport.textContent = `${summary.byCategory.transport.toFixed(1)} kg`;
    valMeals.textContent = `${summary.byCategory.meal.toFixed(1)} kg`;
    valEnergy.textContent = `${summary.byCategory.energy.toFixed(1)} kg`;

    // Dynamic scale adjustments for progress indicators
    const currentMax = Math.max(
      summary.byCategory.transport,
      summary.byCategory.meal,
      summary.byCategory.energy,
      maxCategoryEmission
    );

    /**
     * Helper to compute progress bar percentage values relative to the maximum category emission.
     * @param {number} val - The emissions value for a specific category.
     * @returns {number} Percentage value (0 - 100).
     */
    const calcPercentage = (val) => {
      if (val === 0) return 0;
      return (val / currentMax) * 100;
    };

    barTransport.style.width = `${calcPercentage(summary.byCategory.transport)}%`;
    barMeals.style.width = `${calcPercentage(summary.byCategory.meal)}%`;
    barEnergy.style.width = `${calcPercentage(summary.byCategory.energy)}%`;
  }

  /**
   * Displays temporary confirmation/error messages to the user.
   * @param {string} msg - Feedback text.
   * @param {'success'|'error'} type - Alert design mode.
   */
  function showFeedback(msg, type) {
    logFeedback.textContent = msg;
    logFeedback.className = `toast-feedback ${type}`;
    
    // Screen reader announcement trigger
    logFeedback.setAttribute('role', 'alert');

    setTimeout(() => {
      logFeedback.style.display = 'none';
      logFeedback.removeAttribute('role');
    }, 4000);
  }

  /**
   * Securely appends a message node to the chat container, parsing simple markdown syntax.
   * @param {'user'|'system'} sender - Message author.
   * @param {string} text - Message text content.
   * @returns {HTMLElement} The created element node.
   */
  function appendChatBubble(sender, text) {
    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = `chat-msg ${sender}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    
    // Parse simple markdown format (bold and list points) safely
    bubble.innerHTML = parseMarkdownSafely(text);
    
    bubbleWrapper.appendChild(bubble);
    chatMessages.appendChild(bubbleWrapper);
    
    // Auto scroll chat to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return bubbleWrapper;
  }

  /**
   * Escapes general HTML elements and converts standard bold/list symbols to semantic nodes.
   * @param {string} text - Raw input string.
   * @returns {string} Safe structured HTML output.
   */
  function parseMarkdownSafely(text) {
    // Escape standard HTML first for strict XSS safety
    let cleanText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    // Translate markdown bold tokens: **bold text**
    cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Translate standard markdown bullet items
    const lines = cleanText.split('\n');
    let inList = false;
    const compiled = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemContent = trimmed.substring(2);
        let listPrefix = '';
        if (!inList) {
          inList = true;
          listPrefix = '<ul>';
        }
        compiled.push(`${listPrefix}<li>${itemContent}</li>`);
      } else {
        let listSuffix = '';
        if (inList) {
          inList = false;
          listSuffix = '</ul>';
        }
        compiled.push(`${listSuffix}${line}`);
      }
    }

    if (inList) {
      compiled.push('</ul>');
    }

    return compiled.join('\n');
  }
});
