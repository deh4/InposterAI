/**
 * Popup JavaScript for AI Content Detector Extension
 * Handles UI interactions and coordinates analysis
 */

import TextFormatter from '../shared/text-formatter.js';
import FeedbackManager from '../shared/feedback-manager.js';
import FeedbackUI from '../shared/feedback-ui.js';

class PopupController {
  constructor() {
    this.currentTab = null;
    this.isAnalyzing = false;
    this.currentSettings = null;
    this.feedbackManager = new FeedbackManager();
    this.feedbackUI = new FeedbackUI(this.feedbackManager);
    this.currentAnalysisRecord = null;
    
    this.init();
  }

  async init() {
    await this.getCurrentTab();
    this.bindEvents();
    this.checkOllamaStatus();
    this.loadSettings();
  }

  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
  }

  bindEvents() {
    // Analysis button
    document.getElementById('analyzeButton').addEventListener('click', () => {
      this.analyzeCurrentPage();
    });

    // Retry button
    document.getElementById('retryButton').addEventListener('click', () => {
      this.analyzeCurrentPage();
    });

    // Settings panel toggle
    document.getElementById('settingsButton').addEventListener('click', () => {
      this.toggleSettingsPanel();
    });

    document.getElementById('closeSettings').addEventListener('click', () => {
      this.toggleSettingsPanel();
    });

    // Settings actions
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings();
    });

    document.getElementById('refreshModels').addEventListener('click', () => {
      this.loadAvailableModels();
    });

    // Quick action buttons
    document.getElementById('historyButton').addEventListener('click', () => {
      this.openAnalyticsDashboard();
    });

    document.getElementById('helpButton').addEventListener('click', () => {
      this.showHelp();
    });

    // Footer links
    document.getElementById('aboutLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showAbout();
    });

    document.getElementById('githubLink').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: 'https://github.com/yourusername/ai-content-detector-extension' });
    });
  }

  async checkOllamaStatus() {
    const statusIndicator = document.getElementById('ollamaStatus');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');

    try {
      const response = await chrome.runtime.sendMessage({ action: 'testOllamaConnection' });
      
      if (response.success && response.data.success) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = `Connected (v${response.data.version})`;
      } else {
        statusDot.className = 'status-dot error';
        statusText.textContent = 'Ollama not available';
      }
    } catch (error) {
      statusDot.className = 'status-dot error';
      statusText.textContent = 'Connection error';
    }
  }

  async analyzeCurrentPage() {
    try {
      this.isAnalyzing = true;
      this.showAnalyzing();

      // Get current tab info
      if (!this.currentTab || !this.currentTab.url) {
        throw new Error('No valid tab selected');
      }

      console.log('Analyzing tab:', this.currentTab.url);

      // Check if we can inject scripts on this tab
      if (this.isRestrictedUrl(this.currentTab.url)) {
        throw new Error('Cannot analyze browser internal pages, extensions, or chrome:// URLs');
      }

      // Test if content script is responsive first
      let contentScriptLoaded = false;
      try {
        const pingResponse = await chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' });
        contentScriptLoaded = pingResponse && pingResponse.success;
        console.log('Content script ping result:', contentScriptLoaded);
      } catch (error) {
        console.log('Content script not responsive:', error.message);
        // Try to inject content script manually
        await this.ensureContentScriptLoaded();
        contentScriptLoaded = true;
      }

      if (!contentScriptLoaded) {
        // Try to inject content script manually
        await this.ensureContentScriptLoaded();
      }

      // Now try the actual analysis
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'analyzeCurrentPage'
      });

      if (response && response.success) {
        this.displayAnalysisResult(response.data);
      } else {
        this.showError(response?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      let errorMessage = error.message;
      
      if (error.message.includes('Could not establish connection')) {
        errorMessage = 'Content script not loaded. Try refreshing the page and analyzing again.';
      } else if (error.message.includes('Receiving end does not exist')) {
        errorMessage = 'Extension not properly loaded on this page. Please refresh and try again.';
      } else if (error.message.includes('Cannot access')) {
        errorMessage = 'Cannot analyze this type of page. Try navigating to a regular website.';
      }
      
      this.showError(errorMessage);
    } finally {
      this.isAnalyzing = false;
    }
  }

  async ensureContentScriptLoaded() {
    try {
      // Inject content script if it's not already loaded
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        files: ['content/content.js']
      });
      
      // Wait a moment for script to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Content script injected successfully');
    } catch (error) {
      console.error('Failed to inject content script:', error);
      throw new Error('Failed to load content script on this page');
    }
  }

  showAnalyzing() {
    const analyzeButton = document.getElementById('analyzeButton');
    const analysisResult = document.getElementById('analysisResult');
    const errorMessage = document.getElementById('errorMessage');
    const noContentMessage = document.getElementById('noContentMessage');

    analyzeButton.textContent = 'Analyzing...';
    analyzeButton.disabled = true;
    analyzeButton.classList.add('loading');

    analysisResult.classList.add('hidden');
    errorMessage.classList.add('hidden');
    noContentMessage.classList.add('hidden');
  }

  displayAnalysisResult(data) {
    const { content, analysis } = data;

    // Update UI elements
    document.getElementById('likelihoodScore').querySelector('.score-value').textContent = 
      `${Math.round(analysis.likelihood)}%`;
    
    document.getElementById('confidenceScore').querySelector('.score-value').textContent = 
      `${Math.round(analysis.confidence)}%`;
    
    document.getElementById('reasoning').innerHTML = TextFormatter.formatReasoning(analysis.reasoning);
    
    document.getElementById('analysisTime').textContent = 
      `${content.wordCount} words • ${new Date().toLocaleTimeString()}`;

    // Show statistical breakdown if available
    this.displayStatisticalBreakdown(analysis);

    // Show analysis method
    const analysisMethod = document.getElementById('analysisMethod');
    if (analysisMethod) {
      const method = analysis.method || 'basic';
      analysisMethod.innerHTML = `<small>🔬 Method: ${method}</small>`;
    }

    // Show cache indicator if applicable
    const cacheStatus = document.getElementById('cacheStatus');
    if (analysis.fromCache) {
      cacheStatus.classList.remove('hidden');
    } else {
      cacheStatus.classList.add('hidden');
    }

    // Update likelihood color coding
    const likelihoodElement = document.getElementById('likelihoodScore');
    likelihoodElement.className = 'likelihood-score';
    if (analysis.likelihood > 70) {
      likelihoodElement.classList.add('high-risk');
    } else if (analysis.likelihood > 40) {
      likelihoodElement.classList.add('medium-risk');
    } else {
      likelihoodElement.classList.add('low-risk');
    }

    // Show result and hide other states
    document.getElementById('analysisResult').classList.remove('hidden');
    document.getElementById('errorMessage').classList.add('hidden');
    document.getElementById('noContentMessage').classList.add('hidden');

    // Create and store feedback record
    this.createFeedbackRecord(data);

    // Add feedback widget
    this.addFeedbackWidget();

    this.resetAnalyzeButton();
  }

  createFeedbackRecord(data) {
    try {
      // Collect system info
      const systemInfo = {
        promptVersion: '1.0',
        statisticalWeights: {},
        modelName: this.currentSettings?.model || 'unknown',
        modelVersion: 'unknown',
        ollamaVersion: 'unknown'
      };

      // Prepare analysis data for feedback record
      const analysisData = {
        text: data.content?.text || '',
        textLength: data.content?.charCount || 0,
        url: this.currentTab?.url || '',
        ...data.analysis,
        analysisTime: data.analysis?.analysisTime || 0
      };

      // Create feedback record
      this.currentAnalysisRecord = this.feedbackManager.createFeedbackRecord(
        analysisData,
        systemInfo
      );

      // Store the record
      const records = this.feedbackManager.getFeedbackRecords();
      records.push(this.currentAnalysisRecord);
      this.feedbackManager.storeFeedbackRecords(records);

    } catch (error) {
      console.error('Failed to create feedback record:', error);
    }
  }

  addFeedbackWidget() {
    if (!this.currentAnalysisRecord) return;

    // Inject feedback CSS if not already present
    this.injectFeedbackCSS();

    // Remove any existing feedback widget
    const existingWidget = document.querySelector('.feedback-widget');
    if (existingWidget) {
      existingWidget.remove();
    }

    // Create and add feedback widget
    const feedbackWidget = this.feedbackUI.createPopupFeedbackWidget(
      this.currentAnalysisRecord.id
    );

    // Insert after analysis result
    const analysisResult = document.getElementById('analysisResult');
    if (analysisResult && analysisResult.parentNode) {
      analysisResult.parentNode.insertBefore(
        feedbackWidget,
        analysisResult.nextSibling
      );
    }
  }

  injectFeedbackCSS() {
    if (document.getElementById('feedback-styles')) {
      return; // Already injected
    }

    const style = document.createElement('style');
    style.id = 'feedback-styles';
    style.textContent = FeedbackUI.getFeedbackCSS();
    document.head.appendChild(style);
  }

  displayStatisticalBreakdown(analysis) {
    const breakdown = analysis.statisticalBreakdown;
    if (!breakdown) {
      // Hide statistical breakdown if not available
      const statisticalSection = document.getElementById('statisticalBreakdown');
      if (statisticalSection) {
        statisticalSection.style.display = 'none';
      }
      return;
    }

    // Show and populate statistical breakdown
    const statisticalSection = document.getElementById('statisticalBreakdown');
    if (statisticalSection) {
      statisticalSection.style.display = 'block';
    }

    // Update individual statistical values
    this.updateStatValue('perplexityValue', breakdown.perplexityScore);
    this.updateStatValue('burstinessValue', breakdown.burstinessScore);
    this.updateStatValue('vocabularyValue', breakdown.vocabularyDiversity);
    this.updateStatValue('aiIndicatorsValue', breakdown.aiIndicatorScore);
  }

  updateStatValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element && value !== undefined) {
      element.textContent = `${Math.round(value)}`;
      
      // Add color coding based on value
      element.className = 'stat-value';
      if (value > 70) {
        element.style.color = 'var(--error-color)';
      } else if (value > 40) {
        element.style.color = 'var(--warning-color)';
      } else {
        element.style.color = 'var(--success-color)';
      }
    }
  }

  showError(errorMessage) {
    document.getElementById('errorText').textContent = errorMessage;
    document.getElementById('errorMessage').classList.remove('hidden');
    document.getElementById('analysisResult').classList.add('hidden');
    document.getElementById('noContentMessage').classList.add('hidden');

    this.resetAnalyzeButton();
  }

  showNoContent() {
    document.getElementById('noContentMessage').classList.remove('hidden');
    document.getElementById('analysisResult').classList.add('hidden');
    document.getElementById('errorMessage').classList.add('hidden');

    this.resetAnalyzeButton();
  }

  resetAnalyzeButton() {
    const analyzeButton = document.getElementById('analyzeButton');
    analyzeButton.innerHTML = '<span class="btn-icon">🔍</span>Analyze';
    analyzeButton.disabled = false;
    analyzeButton.classList.remove('loading');
  }

  toggleSettingsPanel() {
    const settingsPanel = document.getElementById('settingsPanel');
    const isHidden = settingsPanel.classList.contains('hidden');
    
    if (isHidden) {
      settingsPanel.classList.remove('hidden');
      this.loadCurrentSettings();
      this.loadAvailableModels(); // Load models when opening settings
    } else {
      settingsPanel.classList.add('hidden');
    }
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response.success) {
        this.currentSettings = response.data;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async loadAvailableModels() {
    const modelSelect = document.getElementById('modelSelect');
    const modelStatus = document.getElementById('modelStatus');
    const refreshButton = document.getElementById('refreshModels');
    
    // Show loading state
    refreshButton.disabled = true;
    refreshButton.textContent = '🔄 Loading...';
    modelSelect.innerHTML = '<option value="" disabled>Loading models...</option>';
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAvailableModels' });
      
      if (response.success && response.models && response.models.length > 0) {
        // Clear loading option
        modelSelect.innerHTML = '';
        
        // Group models by family for better organization
        const modelsByFamily = this.groupModelsByFamily(response.models);
        
        // Add models to select
        for (const [family, models] of Object.entries(modelsByFamily)) {
          if (Object.keys(modelsByFamily).length > 1) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = family;
            modelSelect.appendChild(optgroup);
            
            models.forEach(model => {
              const option = document.createElement('option');
              option.value = model.name;
              option.textContent = this.formatModelName(model);
              optgroup.appendChild(option);
            });
          } else {
            // No grouping needed
            models.forEach(model => {
              const option = document.createElement('option');
              option.value = model.name;
              option.textContent = this.formatModelName(model);
              modelSelect.appendChild(option);
            });
          }
        }
        
        // Restore saved selection
        if (this.currentSettings?.model) {
          modelSelect.value = this.currentSettings.model;
        }
        
        // Update status
        const modelInfo = document.querySelector('.model-info') || document.createElement('span');
        modelInfo.className = 'model-info';
        modelInfo.textContent = `${response.models.length} models available`;
        if (!document.querySelector('.model-info')) {
          modelStatus.insertBefore(modelInfo, refreshButton);
        }
        
      } else {
        // No models found
        modelSelect.innerHTML = '<option value="" disabled>No models found</option>';
        
        const modelInfo = document.querySelector('.model-info') || document.createElement('span');
        modelInfo.className = 'model-info';
        modelInfo.textContent = 'No models available - install models with: ollama pull <model>';
        modelInfo.style.color = 'var(--warning-color)';
        if (!document.querySelector('.model-info')) {
          modelStatus.insertBefore(modelInfo, refreshButton);
        }
      }
      
    } catch (error) {
      console.error('Failed to load models:', error);
      modelSelect.innerHTML = '<option value="" disabled>Failed to load models</option>';
      
      const modelInfo = document.querySelector('.model-info') || document.createElement('span');
      modelInfo.className = 'model-info';
      modelInfo.textContent = 'Connection error - check Ollama is running';
      modelInfo.style.color = 'var(--error-color)';
      if (!document.querySelector('.model-info')) {
        modelStatus.insertBefore(modelInfo, refreshButton);
      }
    } finally {
      // Reset button state
      refreshButton.disabled = false;
      refreshButton.textContent = '🔄 Refresh';
    }
  }

  groupModelsByFamily(models) {
    const families = {};
    
    models.forEach(model => {
      const name = model.name.toLowerCase();
      let family = 'Other';
      
      if (name.includes('gemma')) family = 'Gemma';
      else if (name.includes('phi')) family = 'Phi';
      else if (name.includes('llama')) family = 'Llama';
      else if (name.includes('mistral')) family = 'Mistral';
      else if (name.includes('qwen')) family = 'Qwen';
      else if (name.includes('codellama')) family = 'CodeLlama';
      
      if (!families[family]) families[family] = [];
      families[family].push(model);
    });
    
    return families;
  }

  formatModelName(model) {
    const name = model.name;
    const size = model.size ? this.formatModelSize(model.size) : '';
    const modified = model.modified_at ? new Date(model.modified_at).toLocaleDateString() : '';
    
    let displayName = name;
    if (size) displayName += ` (${size})`;
    
    return displayName;
  }

  formatModelSize(bytes) {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(1)}GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)}MB`;
  }

  loadCurrentSettings() {
    if (!this.currentSettings) return;

    document.getElementById('autoAnalyzeToggle').checked = this.currentSettings.autoAnalyze;
    document.getElementById('modelSelect').value = this.currentSettings.model;
    document.getElementById('sensitivitySelect').value = this.currentSettings.sensitivityLevel;
  }

  async saveSettings() {
    const settings = {
      autoAnalyze: document.getElementById('autoAnalyzeToggle').checked,
      model: document.getElementById('modelSelect').value,
      sensitivityLevel: document.getElementById('sensitivitySelect').value,
      minTextLength: this.currentSettings?.minTextLength || 100
    };

    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'updateSettings', 
        settings 
      });

      if (response.success) {
        this.currentSettings = settings;
        this.showSettingsSaved();
        this.toggleSettingsPanel();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  async resetSettings() {
    const defaultSettings = {
      autoAnalyze: true,
      minTextLength: 100,
      model: 'gemma3n:e4b',
      sensitivityLevel: 'medium'
    };

    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'updateSettings', 
        settings: defaultSettings 
      });

      if (response.success) {
        this.currentSettings = defaultSettings;
        this.loadCurrentSettings();
        this.showSettingsReset();
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }

  showSettingsSaved() {
    // Could add a toast notification here
    console.log('Settings saved');
  }

  showSettingsReset() {
    // Could add a toast notification here
    console.log('Settings reset to defaults');
  }

  showHistory() {
    // Placeholder for history functionality
    alert('Analysis history feature coming soon!');
  }

  showHelp() {
    // Open help documentation
    chrome.tabs.create({ 
      url: 'https://github.com/yourusername/ai-content-detector-extension/wiki/Help' 
    });
  }

  showAbout() {
    // Show about dialog
    alert(`AI Content Detector v0.1.0\n\nA privacy-first browser extension that uses local Ollama models to detect AI-generated content.\n\nBuilt with ❤️ for transparency and privacy.`);
  }

  isRestrictedUrl(url) {
    const restrictedPatterns = [
      'chrome://',
      'chrome-extension://',
      'opera://',
      'moz-extension://',
      'edge://',
      'about:',
      'data:',
      'file:///',
      'view-source:'
    ];
    
    return restrictedPatterns.some(pattern => url.startsWith(pattern));
  }

  openAnalyticsDashboard() {
    // Open analytics dashboard in new tab
    chrome.tabs.create({ 
      url: 'http://localhost:3000',
      active: true 
    }).catch(() => {
      // Fallback: show instructions if can't open tab
      alert('Please open http://localhost:3000 in your browser to view the analytics dashboard.\n\nMake sure the dashboard server is running with: npm start');
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
}); 