/**
 * Popup JavaScript for AI Content Detector Extension
 * Handles UI interactions and coordinates analysis
 */

class PopupController {
  constructor() {
    this.currentTab = null;
    this.isAnalyzing = false;
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

    // Quick action buttons
    document.getElementById('historyButton').addEventListener('click', () => {
      this.showHistory();
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
    if (this.isAnalyzing) return;

    this.isAnalyzing = true;
    this.showAnalyzing();

    try {
      // Request analysis from content script
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'analyzeCurrentPage'
      });

      if (response.success) {
        this.displayAnalysisResult(response.data);
      } else {
        this.showError(response.error);
      }
    } catch (error) {
      this.showError(error.message || 'Failed to analyze page content');
    } finally {
      this.isAnalyzing = false;
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
    
    document.getElementById('reasoning').textContent = analysis.reasoning;
    
    document.getElementById('analysisTime').textContent = 
      `${content.wordCount} words • ${new Date().toLocaleTimeString()}`;

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

    this.resetAnalyzeButton();
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
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
}); 