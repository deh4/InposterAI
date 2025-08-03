/**
 * Refactored Popup JavaScript for AI Content Detector Extension
 * Uses FeedbackComponent and integrates with unified architecture
 */

import { FeedbackComponent } from '../shared/feedback-component.js';
import { FeedbackManager } from '../shared/feedback-manager.js';
import TextFormatter from '../shared/text-formatter.js';

/* global document, navigator */

class ModernPopupController {
  constructor() {
    this.currentTab = null;
    this.isAnalyzing = false;
    this.currentSettings = null;
    this.feedbackManager = new FeedbackManager();
    this.feedbackComponent = null;
    this.currentAnalysis = null;
    this.textFormatter = new TextFormatter();
    
    this.init();
  }

  async init() {
    try {
      await this.getCurrentTab();
      this.bindEvents();
      await this.checkOllamaStatus();
      await this.loadSettings();
      await this.checkForQuickAnalysisResult();
    } catch (error) {
      console.error('Popup initialization failed:', error);
      this.showError('Failed to initialize popup');
    }
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
  }

  bindEvents() {
    // Analysis button
    const analyzeBtn = document.getElementById('analyzeButton');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => this.analyzeCurrentPage());
    }

    // Retry button
    const retryBtn = document.getElementById('retryButton');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => this.analyzeCurrentPage());
    }

    // Settings button
    const settingsBtn = document.getElementById('settingsButton');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.toggleSettingsPanel());
    }

    // Close settings
    const closeSettingsBtn = document.getElementById('closeSettings');
    if (closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', () => this.closeSettingsPanel());
    }

    // Analytics dashboard button
    const dashboardBtn = document.getElementById('dashboardButton');
    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => this.openAnalyticsDashboard());
    }

    // Model selection
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => this.updateSelectedModel(e.target.value));
    }

    // Auto-analyze toggle
    const autoAnalyzeToggle = document.getElementById('autoAnalyze');
    if (autoAnalyzeToggle) {
      autoAnalyzeToggle.addEventListener('change', (e) => this.updateAutoAnalyze(e.target.checked));
    }
  }

  /**
   * Check for quick analysis result from background script
   */
  async checkForQuickAnalysisResult() {
    try {
      const stored = await chrome.storage.local.get('quickAnalysisResult');
      if (stored.quickAnalysisResult) {
        const { result, text, timestamp } = stored.quickAnalysisResult;
        
        // Check if result is recent (within 1 minute)
        if (Date.now() - timestamp < 60000) {
          this.displayAnalysisResult(result, text);
          // Clear the stored result
          chrome.storage.local.remove('quickAnalysisResult');
        }
      }
    } catch (error) {
      console.error('Failed to check quick analysis result:', error);
    }
  }

  /**
   * Analyze current page content
   */
  async analyzeCurrentPage() {
    if (this.isAnalyzing) {
      console.log('Analysis already in progress');
      return;
    }

    this.isAnalyzing = true;
    
    try {
      this.showAnalyzingState();
      
      // Get content from current tab
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'extractContent'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to extract content');
      }

      const { content, metadata } = response;
      
      if (!content || content.trim().length < 50) {
        throw new Error('Page content too short for analysis (minimum 50 characters)');
      }

      // Perform analysis via background script
      const analysisResponse = await chrome.runtime.sendMessage({
        action: 'analyzeText',
        text: content,
        options: { source: 'popup' }
      });

      if (!analysisResponse.success) {
        throw new Error(analysisResponse.error || 'Analysis failed');
      }

      // Display results
      await this.displayAnalysisResult(analysisResponse.data, content, metadata);
      
    } catch (error) {
      console.error('Analysis failed:', error);
      this.showError(error.message);
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Display analysis results with feedback component
   */
  async displayAnalysisResult(analysisData, originalText, metadata = {}) {
    this.currentAnalysis = {
      analysisData,
      originalText,
      metadata
    };

    // Show results container
    this.showResultsState();
    
    // Render analysis summary
    this.renderAnalysisSummary(analysisData);
    
    // Initialize feedback component
    await this.initializeFeedbackComponent(analysisData);
  }

  renderAnalysisSummary(analysis) {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;

    const likelihoodColor = this.getLikelihoodColor(analysis.likelihood);
    const formattedReasoning = this.formatReasoning(analysis.reasoning);

    resultsContainer.innerHTML = `
      <div class="analysis-summary">
        <div class="likelihood-header">
          <div class="likelihood-circle" style="border-color: ${likelihoodColor}">
            <div class="likelihood-percentage">${Math.round(analysis.likelihood)}%</div>
            <div class="likelihood-label">AI Likelihood</div>
          </div>
          <div class="confidence-display">
            <div class="confidence-label">Confidence</div>
            <div class="confidence-value">${Math.round(analysis.confidence)}%</div>
          </div>
        </div>

        <div class="analysis-details">
          <div class="reasoning-section">
            <h4>Analysis Reasoning</h4>
            <div class="reasoning-content">${formattedReasoning}</div>
          </div>

          ${analysis.statisticalBreakdown ? this.renderStatisticalBreakdown(analysis.statisticalBreakdown) : ''}
          
          ${analysis.method ? `
            <div class="method-badge">
              <span class="method-label">Method:</span>
              <span class="method-value">${analysis.method}</span>
            </div>
          ` : ''}
        </div>

        <div class="feedback-section">
          <div id="feedback-container"></div>
        </div>
      </div>
    `;
  }

  async initializeFeedbackComponent(analysisData) {
    const feedbackContainer = document.getElementById('feedback-container');
    if (!feedbackContainer) return;

    // Create feedback component
    this.feedbackComponent = new FeedbackComponent({
      compact: true, // Use compact mode in popup
      showAnalysisSummary: false, // Already shown above
      autoHideSuccess: true,
      successTimeout: 2000
    });

    // Render and set up callbacks
    this.feedbackComponent
      .render(feedbackContainer, analysisData)
      .onDetailedSubmit(async (feedbackData, analysis) => {
        await this.handleFeedbackSubmission(feedbackData, analysis);
      })
      .onSuccess(() => {
        console.log('Feedback submitted successfully');
      });

    // Create initial feedback record
    try {
      const systemInfo = await this.gatherSystemInfo();
      const record = await this.feedbackManager.createFeedbackRecord(analysisData, systemInfo);
      this.currentAnalysisRecord = record;
    } catch (error) {
      console.error('Failed to create feedback record:', error);
    }
  }

  async handleFeedbackSubmission(feedbackData, _analysisData) {
    try {
      if (this.currentAnalysisRecord) {
        await this.feedbackManager.submitFeedback(this.currentAnalysisRecord.id, feedbackData);
        console.log('Feedback submitted successfully');
      } else {
        console.warn('No analysis record available for feedback');
      }
    } catch (error) {
      console.error('Feedback submission failed:', error);
    }
  }

  async gatherSystemInfo() {
    return {
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      url: this.currentTab?.url || '',
      title: this.currentTab?.title || '',
      source: 'popup'
    };
  }

  renderStatisticalBreakdown(breakdown) {
    if (!breakdown || typeof breakdown !== 'object') return '';
    
    return `
      <div class="statistical-breakdown">
        <h4>Statistical Analysis</h4>
        <div class="breakdown-grid">
          ${Object.entries(breakdown).map(([key, value]) => `
            <div class="breakdown-item">
              <span class="breakdown-label">${this.formatMetricName(key)}</span>
              <span class="breakdown-value">${this.formatMetricValue(value)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  formatMetricName(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  formatMetricValue(value) {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return String(value);
  }

  formatReasoning(reasoning) {
    if (!reasoning) return 'No reasoning provided';
    
    return reasoning
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/"([^"]+)"/g, '<span class="quoted-text">"$1"</span>')
      .replace(/(high|medium|low|very) confidence/gi, '<span class="confidence-indicator">$1 confidence</span>');
  }

  getLikelihoodColor(likelihood) {
    if (likelihood >= 70) return '#e74c3c'; // Red
    if (likelihood >= 40) return '#f39c12'; // Orange
    return '#27ae60'; // Green
  }

  /**
   * Settings management
   */
  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response.success) {
        this.currentSettings = response.data;
        this.updateSettingsUI(this.currentSettings);
        await this.loadAvailableModels();
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async loadAvailableModels() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAvailableModels' });
      if (response.success && response.models) {
        this.populateModelSelect(response.models);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }

  populateModelSelect(models) {
    const modelSelect = document.getElementById('modelSelect');
    if (!modelSelect) return;

    modelSelect.innerHTML = models.map(model => 
      `<option value="${model.name}" ${model.name === this.currentSettings?.selectedModel ? 'selected' : ''}>
        ${model.name}
      </option>`
    ).join('');
  }

  updateSettingsUI(settings) {
    const autoAnalyzeToggle = document.getElementById('autoAnalyze');
    if (autoAnalyzeToggle) {
      autoAnalyzeToggle.checked = settings.autoAnalyze || false;
    }
  }

  async updateSelectedModel(modelName) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { ...this.currentSettings, selectedModel: modelName }
      });
      
      if (response.success) {
        this.currentSettings.selectedModel = modelName;
        console.log('Model updated:', modelName);
      }
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  }

  async updateAutoAnalyze(enabled) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: { ...this.currentSettings, autoAnalyze: enabled }
      });
      
      if (response.success) {
        this.currentSettings.autoAnalyze = enabled;
        console.log('Auto-analyze updated:', enabled);
      }
    } catch (error) {
      console.error('Failed to update auto-analyze:', error);
    }
  }

  toggleSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel) {
      settingsPanel.classList.toggle('hidden');
    }
  }

  closeSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel) {
      settingsPanel.classList.add('hidden');
    }
  }

  /**
   * Open analytics dashboard
   */
  openAnalyticsDashboard() {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  }

  /**
   * Check Ollama connection status
   */
  async checkOllamaStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'testOllamaConnection' });
      
      if (response.success && response.data.success) {
        this.showConnectionStatus(true, 'Connected to Ollama');
      } else {
        this.showConnectionStatus(false, response.data?.error || 'Connection failed');
      }
    } catch (error) {
      console.error('Ollama status check failed:', error);
      this.showConnectionStatus(false, 'Unable to check connection');
    }
  }

  showConnectionStatus(connected, message) {
    const statusElement = document.getElementById('ollamaStatus');
    if (statusElement) {
      statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
      statusElement.textContent = message;
    }
  }

  /**
   * UI State Management
   */
  showAnalyzingState() {
    this.hideAllStates();
    const analyzingElement = document.getElementById('analyzing');
    if (analyzingElement) {
      analyzingElement.classList.remove('hidden');
    }
  }

  showResultsState() {
    this.hideAllStates();
    const resultsElement = document.getElementById('results');
    if (resultsElement) {
      resultsElement.classList.remove('hidden');
    }
  }

  showError(message) {
    this.hideAllStates();
    const errorElement = document.getElementById('error');
    const errorMessageElement = document.getElementById('errorMessage');
    
    if (errorElement) {
      errorElement.classList.remove('hidden');
    }
    
    if (errorMessageElement) {
      errorMessageElement.textContent = message;
    }
  }

  hideAllStates() {
    const states = ['analyzing', 'results', 'error'];
    states.forEach(stateId => {
      const element = document.getElementById(stateId);
      if (element) {
        element.classList.add('hidden');
      }
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ModernPopupController();
}); 