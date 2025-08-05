/**
 * InposterAI Settings Page
 * Manages extension configuration and preferences
 */

class SettingsManager {
  constructor() {
    this.defaultSettings = {
      // AI Model Configuration
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: '',
      googleApiKey: '',
      googleModel: 'gemini-pro',
      
      // Analysis Preferences
      analysisMethod: 'ensemble',
      confidenceThreshold: 70,
      cacheEnabled: true,
      cacheDuration: 24,
      
      // Feedback & Privacy
      feedbackEnabled: true,
      userExpertise: 'intermediate',
      anonymizationLevel: 'medium',
      dataRetention: 90,
      
      // Dashboard & Analytics
      dashboardUrl: 'http://localhost:3000',
      realtimeUpdates: true,
      
      // Advanced Settings
      maxTextLength: 2000,
      analysisTimeout: 30,
      debugMode: false
    };
    
    this.currentSettings = { ...this.defaultSettings };
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.setupTabs();
    this.populateForm();
    this.testConnections();
  }

  // Settings Management
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('settings');
      if (result.settings) {
        this.currentSettings = { ...this.defaultSettings, ...result.settings };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ settings: this.currentSettings });
      this.showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showStatus('Failed to save settings', 'error');
    }
  }

  // Event Listeners
  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });

    // API key visibility toggle
    document.getElementById('toggle-api-key').addEventListener('click', () => {
      this.toggleApiKeyVisibility();
    });

    // Connection tests
    document.getElementById('test-ollama').addEventListener('click', () => {
      this.testOllamaConnection();
    });
    
    document.getElementById('test-google').addEventListener('click', () => {
      this.testGoogleConnection();
    });
    
    document.getElementById('test-dashboard').addEventListener('click', () => {
      this.testDashboardConnection();
    });

    // Model management
    document.getElementById('refresh-models').addEventListener('click', () => {
      this.loadOllamaModels();
    });
    
    document.getElementById('ollama-model').addEventListener('change', (e) => {
      this.showModelInfo(e.target.value);
    });

    // Confidence threshold slider
    document.getElementById('confidence-threshold').addEventListener('input', (e) => {
      document.getElementById('confidence-value').textContent = e.target.value + '%';
    });

    // Dashboard actions
    document.getElementById('open-dashboard').addEventListener('click', () => {
      window.open(this.currentSettings.dashboardUrl, '_blank');
    });
    
    document.getElementById('export-data').addEventListener('click', () => {
      this.exportData();
    });
    
    document.getElementById('clear-data').addEventListener('click', () => {
      this.clearData();
    });

    // Footer actions
    document.getElementById('reset-settings').addEventListener('click', () => {
      this.resetSettings();
    });
    
    document.getElementById('save-settings').addEventListener('click', () => {
      this.collectFormData();
      this.saveSettings();
    });
  }

  // Tab Management
  setupTabs() {
    const buttons = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');
    
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        
        // Update button states
        buttons.forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        
        // Update content visibility
        contents.forEach(content => {
          content.classList.remove('active');
          if (content.id === `${tabId}-tab`) {
            content.classList.add('active');
          }
        });
      });
    });
  }

  switchTab(tabId) {
    document.querySelector(`[data-tab="${tabId}"]`).click();
  }

  // Form Management
  populateForm() {
    // AI Model Configuration
    document.getElementById('ollama-url').value = this.currentSettings.ollamaUrl;
    document.getElementById('google-api-key').value = this.currentSettings.googleApiKey;
    document.getElementById('google-model').value = this.currentSettings.googleModel;
    
    // Analysis Preferences
    document.getElementById('analysis-method').value = this.currentSettings.analysisMethod;
    document.getElementById('confidence-threshold').value = this.currentSettings.confidenceThreshold;
    document.getElementById('confidence-value').textContent = this.currentSettings.confidenceThreshold + '%';
    document.getElementById('cache-enabled').checked = this.currentSettings.cacheEnabled;
    document.getElementById('cache-duration').value = this.currentSettings.cacheDuration;
    
    // Feedback & Privacy
    document.getElementById('feedback-enabled').checked = this.currentSettings.feedbackEnabled;
    document.getElementById('user-expertise').value = this.currentSettings.userExpertise;
    document.getElementById('anonymization-level').value = this.currentSettings.anonymizationLevel;
    document.getElementById('data-retention').value = this.currentSettings.dataRetention;
    
    // Dashboard & Analytics
    document.getElementById('dashboard-url').value = this.currentSettings.dashboardUrl;
    document.getElementById('realtime-updates').checked = this.currentSettings.realtimeUpdates;
    
    // Advanced Settings
    document.getElementById('max-text-length').value = this.currentSettings.maxTextLength;
    document.getElementById('analysis-timeout').value = this.currentSettings.analysisTimeout;
    document.getElementById('debug-mode').checked = this.currentSettings.debugMode;

    // Load Ollama models
    this.loadOllamaModels();
  }

  collectFormData() {
    this.currentSettings = {
      // AI Model Configuration
      ollamaUrl: document.getElementById('ollama-url').value,
      ollamaModel: document.getElementById('ollama-model').value,
      googleApiKey: document.getElementById('google-api-key').value,
      googleModel: document.getElementById('google-model').value,
      
      // Analysis Preferences
      analysisMethod: document.getElementById('analysis-method').value,
      confidenceThreshold: parseInt(document.getElementById('confidence-threshold').value),
      cacheEnabled: document.getElementById('cache-enabled').checked,
      cacheDuration: parseInt(document.getElementById('cache-duration').value),
      
      // Feedback & Privacy
      feedbackEnabled: document.getElementById('feedback-enabled').checked,
      userExpertise: document.getElementById('user-expertise').value,
      anonymizationLevel: document.getElementById('anonymization-level').value,
      dataRetention: parseInt(document.getElementById('data-retention').value),
      
      // Dashboard & Analytics
      dashboardUrl: document.getElementById('dashboard-url').value,
      realtimeUpdates: document.getElementById('realtime-updates').checked,
      
      // Advanced Settings
      maxTextLength: parseInt(document.getElementById('max-text-length').value),
      analysisTimeout: parseInt(document.getElementById('analysis-timeout').value),
      debugMode: document.getElementById('debug-mode').checked
    };
  }

  // API Key Management
  toggleApiKeyVisibility() {
    const input = document.getElementById('google-api-key');
    const button = document.getElementById('toggle-api-key');
    
    if (input.type === 'password') {
      input.type = 'text';
      button.textContent = '🙈';
    } else {
      input.type = 'password';
      button.textContent = '👁️';
    }
  }

  // Connection Testing
  async testOllamaConnection() {
    const button = document.getElementById('test-ollama');
    const status = document.getElementById('ollama-status');
    
    button.classList.add('loading');
    button.textContent = 'Testing...';
    
    try {
      const url = document.getElementById('ollama-url').value;
      const response = await fetch(`${url}/api/tags`);
      
      if (response.ok) {
        this.showConnectionStatus('ollama-status', 'Connected to Ollama successfully', 'success');
        this.loadOllamaModels();
      } else {
        this.showConnectionStatus('ollama-status', 'Failed to connect to Ollama', 'error');
      }
    } catch (error) {
      this.showConnectionStatus('ollama-status', `Connection error: ${error.message}`, 'error');
    } finally {
      button.classList.remove('loading');
      button.textContent = 'Test Connection';
    }
  }

  async testGoogleConnection() {
    const button = document.getElementById('test-google');
    const status = document.getElementById('google-status');
    const apiKey = document.getElementById('google-api-key').value;
    
    if (!apiKey) {
      this.showConnectionStatus('google-status', 'Please enter your Google AI API key', 'warning');
      return;
    }
    
    button.classList.add('loading');
    button.textContent = 'Testing...';
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
      
      if (response.ok) {
        this.showConnectionStatus('google-status', 'Google AI API key is valid', 'success');
      } else {
        this.showConnectionStatus('google-status', 'Invalid Google AI API key', 'error');
      }
    } catch (error) {
      this.showConnectionStatus('google-status', `Connection error: ${error.message}`, 'error');
    } finally {
      button.classList.remove('loading');
      button.textContent = 'Test Google AI Connection';
    }
  }

  async testDashboardConnection() {
    const button = document.getElementById('test-dashboard');
    const status = document.getElementById('dashboard-status');
    
    button.classList.add('loading');
    button.textContent = 'Testing...';
    
    try {
      const url = document.getElementById('dashboard-url').value;
      const response = await fetch(`${url}/api/health`);
      
      if (response.ok) {
        this.showConnectionStatus('dashboard-status', 'Dashboard is running and accessible', 'success');
      } else {
        this.showConnectionStatus('dashboard-status', 'Dashboard is not responding', 'error');
      }
    } catch (error) {
      this.showConnectionStatus('dashboard-status', `Dashboard not available: ${error.message}`, 'warning');
    } finally {
      button.classList.remove('loading');
      button.textContent = 'Test Connection';
    }
  }

  // Model Management
  async loadOllamaModels() {
    const select = document.getElementById('ollama-model');
    const url = document.getElementById('ollama-url').value;
    
    select.innerHTML = '<option value="">Loading models...</option>';
    
    try {
      const response = await fetch(`${url}/api/tags`);
      const data = await response.json();
      
      select.innerHTML = '<option value="">Select a model...</option>';
      
      if (data.models && data.models.length > 0) {
        data.models.forEach(model => {
          const option = document.createElement('option');
          option.value = model.name;
          option.textContent = model.name;
          if (model.name === this.currentSettings.ollamaModel) {
            option.selected = true;
          }
          select.appendChild(option);
        });
        
        if (this.currentSettings.ollamaModel) {
          this.showModelInfo(this.currentSettings.ollamaModel);
        }
      } else {
        select.innerHTML = '<option value="">No models found</option>';
      }
    } catch (error) {
      select.innerHTML = '<option value="">Failed to load models</option>';
      console.error('Failed to load Ollama models:', error);
    }
  }

  async showModelInfo(modelName) {
    const infoDiv = document.getElementById('model-info');
    
    if (!modelName) {
      infoDiv.innerHTML = '<span class="placeholder">Select a model to view details</span>';
      return;
    }
    
    try {
      const url = document.getElementById('ollama-url').value;
      const response = await fetch(`${url}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });
      
      const data = await response.json();
      
      infoDiv.innerHTML = `
        <div class="model-details">
          <div class="detail-item">
            <span class="detail-label">Model:</span>
            <span>${data.details?.family || 'Unknown'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Size:</span>
            <span>${this.formatBytes(data.size || 0)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Format:</span>
            <span>${data.details?.format || 'Unknown'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Parameters:</span>
            <span>${data.details?.parameter_size || 'Unknown'}</span>
          </div>
        </div>
      `;
    } catch (error) {
      infoDiv.innerHTML = `<span class="placeholder">Failed to load model information</span>`;
      console.error('Failed to load model info:', error);
    }
  }

  // Data Management
  async exportData() {
    try {
      const result = await chrome.storage.local.get(null);
      const dataBlob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `inposterai-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showStatus('Data exported successfully!', 'success');
    } catch (error) {
      console.error('Failed to export data:', error);
      this.showStatus('Failed to export data', 'error');
    }
  }

  async clearData() {
    if (!confirm('Are you sure you want to clear all stored data? This action cannot be undone.')) {
      return;
    }
    
    try {
      await chrome.storage.local.clear();
      this.showStatus('All data cleared successfully!', 'success');
    } catch (error) {
      console.error('Failed to clear data:', error);
      this.showStatus('Failed to clear data', 'error');
    }
  }

  resetSettings() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }
    
    this.currentSettings = { ...this.defaultSettings };
    this.populateForm();
    this.showStatus('Settings reset to defaults', 'success');
  }

  // Utility Functions
  showConnectionStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.className = `status-indicator ${type}`;
    element.textContent = message;
  }

  showStatus(message, type) {
    // Create a temporary status message
    const status = document.createElement('div');
    status.className = `status-indicator ${type} fade-in`;
    status.textContent = message;
    status.style.position = 'fixed';
    status.style.top = '20px';
    status.style.right = '20px';
    status.style.zIndex = '10000';
    
    document.body.appendChild(status);
    
    setTimeout(() => {
      status.remove();
    }, 3000);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Initialize settings when page loads
document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
}); 