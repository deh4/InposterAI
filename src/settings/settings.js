/**
 * InposterAI Settings Page
 * Manages extension configuration and preferences
 */

class SettingsManager {
  constructor() {
    this.defaultSettings = {
      // AI Model Configuration
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: '', // Legacy compatibility
      googleApiKey: '',
      googleModel: 'gemini-pro', // Legacy compatibility
      
      // Analysis Preferences
      analysisMethod: 'ensemble',
      selectedModel: '', // Unified model selection
      systemInstructions: '', // Custom LLM instructions
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
    this.populateForm();
    this.setupEventListeners();
    
    // Setup tabs last to ensure DOM is fully ready
    setTimeout(() => {
      this.setupTabs();
    }, 50);
    
    this.testConnections();
    
    // Auto-load models if we have credentials and a selected model
    // This ensures saved model selections are properly restored
    if (this.currentSettings.selectedModel || this.currentSettings.googleApiKey) {
      setTimeout(() => {
        this.refreshAllModels();
      }, 100);
    }
  }

  // Settings Management
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('aiDetectorSettings');
      if (result.aiDetectorSettings) {
        this.currentSettings = { ...this.defaultSettings, ...result.aiDetectorSettings };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ aiDetectorSettings: this.currentSettings });
      this.showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showStatus('Failed to save settings', 'error');
    }
  }

  // Event Listeners
  setupEventListeners() {
    // Tab switching is handled in setupTabs() method

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
    
    // Note: ollama-model dropdown was removed in favor of unified model selection
    const ollamaModelElement = document.getElementById('ollama-model');
    if (ollamaModelElement) {
      ollamaModelElement.addEventListener('change', (e) => {
        this.showModelInfo(e.target.value);
      });
    }

    // Confidence threshold slider
    const confidenceThreshold = document.getElementById('confidence-threshold');
    const confidenceValue = document.getElementById('confidence-value');
    if (confidenceThreshold && confidenceValue) {
      confidenceThreshold.addEventListener('input', (e) => {
        confidenceValue.textContent = e.target.value + '%';
      });
    }

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

    // Auto-save on form changes
    this.setupAutoSave();
    
    // Google API key change handler
    document.getElementById('google-api-key').addEventListener('input', (e) => {
      this.onGoogleApiKeyChange(e.target.value);
    });
    
    // Unified model refresh handler
    document.getElementById('refresh-models').addEventListener('click', () => {
      this.refreshAllModels();
    });
  }

  // Tab Management
  setupTabs() {
    console.log('🔧 Setting up tabs...');
    
    // Wait a bit to ensure DOM is ready and try again if elements not found
    const trySetupTabs = (attempt = 1) => {
      console.log(`🔍 Tab setup attempt ${attempt}`);
      
      // Direct approach - find buttons by data-tab attribute
      const localButton = document.querySelector('[data-tab="local"]');
      const cloudButton = document.querySelector('[data-tab="cloud"]');
      const localContent = document.getElementById('local-tab');
      const cloudContent = document.getElementById('cloud-tab');
      
      console.log('🔍 Tab elements found:');
      console.log('  Local button:', localButton ? 'FOUND' : 'MISSING');
      console.log('  Cloud button:', cloudButton ? 'FOUND' : 'MISSING');
      console.log('  Local content:', localContent ? 'FOUND' : 'MISSING');
      console.log('  Cloud content:', cloudContent ? 'FOUND' : 'MISSING');
      
      if (!cloudButton && attempt < 5) {
        console.log('❌ Cloud tab button not found, retrying...');
        setTimeout(() => trySetupTabs(attempt + 1), 100);
        return;
      }
      
      if (!cloudButton) {
        console.error('❌ Cloud tab button not found after 5 attempts!');
        return;
      }
      
      console.log('✅ Setting up event listeners...');
      
      // Add click handlers directly
      if (localButton) {
        localButton.addEventListener('click', (e) => {
          console.log('🏠 Local tab clicked');
          e.preventDefault();
          this.activateTab('local');
        });
        console.log('  ✅ Local button listener added');
      }
      
      if (cloudButton) {
        cloudButton.addEventListener('click', (e) => {
          console.log('☁️ Cloud tab clicked');
          e.preventDefault();
          this.activateTab('cloud');
        });
        console.log('  ✅ Cloud button listener added');
      }
      
      console.log('🎉 Tab setup completed successfully!');
    };
    
    trySetupTabs();
  }
  
  activateTab(tabId) {
    console.log(`🎯 Activating tab: ${tabId}`);
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
      console.log(`  Removed active from: ${btn.dataset.tab}`);
    });
    
    // Remove active class from all contents
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
      console.log(`  Hidden content: ${content.id}`);
    });
    
    // Activate the selected tab
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`${tabId}-tab`);
    
    if (activeButton) {
      activeButton.classList.add('active');
      console.log(`  ✅ Activated button: ${tabId}`);
    }
    
    if (activeContent) {
      activeContent.classList.add('active');
      console.log(`  ✅ Showed content: ${activeContent.id}`);
    }
  }

  switchTab(tabId) {
    const buttons = document.querySelectorAll('.tab-button');
    const contents = document.querySelectorAll('.tab-content');
    
    // Update button states
    buttons.forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    
    // Update content visibility
    contents.forEach(content => {
      content.classList.remove('active');
      if (content.id === `${tabId}-tab`) {
        content.classList.add('active');
      }
    });
  }

  // Form Management
  populateForm() {
    console.log('🔧 Populating form with settings...');
    
    try {
      // AI Model Configuration
      const ollamaUrl = document.getElementById('ollama-url');
      const googleApiKey = document.getElementById('google-api-key');
      
      if (ollamaUrl) ollamaUrl.value = this.currentSettings.ollamaUrl;
      if (googleApiKey) googleApiKey.value = this.currentSettings.googleApiKey;
      
      // Note: google-model dropdown was removed in favor of unified model selection
      
      // Initialize model dropdown with default state
      this.initializeModelDropdown();
      
      // Analysis Preferences
      const analysisMethod = document.getElementById('analysis-method');
      const selectedModel = document.getElementById('selected-model');
      const systemInstructions = document.getElementById('system-instructions');
      const confidenceThreshold = document.getElementById('confidence-threshold');
      const confidenceValue = document.getElementById('confidence-value');
      const cacheEnabled = document.getElementById('cache-enabled');
      const cacheDuration = document.getElementById('cache-duration');
      
      if (analysisMethod) analysisMethod.value = this.currentSettings.analysisMethod;
      if (selectedModel) selectedModel.value = this.currentSettings.selectedModel || '';
      if (systemInstructions) systemInstructions.value = this.currentSettings.systemInstructions || '';
      if (confidenceThreshold) confidenceThreshold.value = this.currentSettings.confidenceThreshold;
      if (confidenceValue) confidenceValue.textContent = this.currentSettings.confidenceThreshold + '%';
      if (cacheEnabled) cacheEnabled.checked = this.currentSettings.cacheEnabled;
      if (cacheDuration) cacheDuration.value = this.currentSettings.cacheDuration;
      
      // Feedback & Privacy
      const feedbackEnabled = document.getElementById('feedback-enabled');
      const userExpertise = document.getElementById('user-expertise');
      const anonymizationLevel = document.getElementById('anonymization-level');
      const dataRetention = document.getElementById('data-retention');
      
      if (feedbackEnabled) feedbackEnabled.checked = this.currentSettings.feedbackEnabled;
      if (userExpertise) userExpertise.value = this.currentSettings.userExpertise;
      if (anonymizationLevel) anonymizationLevel.value = this.currentSettings.anonymizationLevel;
      if (dataRetention) dataRetention.value = this.currentSettings.dataRetention;
      
      // Dashboard & Analytics
      const dashboardUrl = document.getElementById('dashboard-url');
      const realtimeUpdates = document.getElementById('realtime-updates');
      
      if (dashboardUrl) dashboardUrl.value = this.currentSettings.dashboardUrl;
      if (realtimeUpdates) realtimeUpdates.checked = this.currentSettings.realtimeUpdates;
      
      // Advanced Settings
      const maxTextLength = document.getElementById('max-text-length');
      const analysisTimeout = document.getElementById('analysis-timeout');
      const debugMode = document.getElementById('debug-mode');
      
      if (maxTextLength) maxTextLength.value = this.currentSettings.maxTextLength;
      if (analysisTimeout) analysisTimeout.value = this.currentSettings.analysisTimeout;
      if (debugMode) debugMode.checked = this.currentSettings.debugMode;

      console.log('✅ Form populated successfully');
      
    } catch (error) {
      console.error('❌ Error populating form:', error);
    }

    // Load Ollama models (separate from form population)
    try {
      this.loadOllamaModels();
    } catch (error) {
      console.error('❌ Error loading Ollama models:', error);
    }
  }

  collectFormData() {
    console.log('🔧 Collecting form data...');
    
    // Helper function to safely get element value
    const getValue = (id, defaultValue = '') => {
      const element = document.getElementById(id);
      return element ? element.value : defaultValue;
    };
    
    const getChecked = (id, defaultValue = false) => {
      const element = document.getElementById(id);
      return element ? element.checked : defaultValue;
    };
    
    this.currentSettings = {
      // AI Model Configuration
      ollamaUrl: getValue('ollama-url', 'http://localhost:11434'),
      ollamaModel: getValue('ollama-model'), // Legacy - kept for backward compatibility
      googleApiKey: getValue('google-api-key'),
      googleModel: getValue('google-model', 'gemini-pro'), // Legacy - kept for backward compatibility
      
      // Analysis Preferences (including new unified fields)
      analysisMethod: getValue('analysis-method', 'ensemble'),
      selectedModel: getValue('selected-model'), // New unified model selection
      systemInstructions: getValue('system-instructions'), // New custom instructions
      confidenceThreshold: parseInt(getValue('confidence-threshold', '70')),
      cacheEnabled: getChecked('cache-enabled', true),
      cacheDuration: parseInt(getValue('cache-duration', '24')),
      
      // Feedback & Privacy
      feedbackEnabled: getChecked('feedback-enabled', true),
      userExpertise: getValue('user-expertise', 'intermediate'),
      anonymizationLevel: getValue('anonymization-level', 'medium'),
      dataRetention: parseInt(getValue('data-retention', '90')),
      
      // Dashboard & Analytics
      dashboardUrl: getValue('dashboard-url', 'http://localhost:3000'),
      realtimeUpdates: getChecked('realtime-updates', true),
      
      // Advanced Settings
      maxTextLength: parseInt(getValue('max-text-length', '5000')),
      analysisTimeout: parseInt(getValue('analysis-timeout', '30')),
      debugMode: getChecked('debug-mode', false)
    };
    
    console.log('✅ Form data collected:', this.currentSettings);
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
    
    // Note: ollama-model dropdown was removed, so this function may not be needed
    if (!select) {
      console.log('Ollama model dropdown not found (expected - using unified dropdown now)');
      return;
    }
    
    const ollamaUrlElement = document.getElementById('ollama-url');
    if (!ollamaUrlElement) {
      console.error('Ollama URL element not found');
      return;
    }
    
    const url = ollamaUrlElement.value;
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

  setupAutoSave() {
    // Auto-save on any form input change
    const formInputs = document.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
      input.addEventListener('change', () => {
        this.collectFormData();
        this.saveSettings();
      });
    });
  }

  initializeModelDropdown() {
    const select = document.getElementById('selected-model');
    if (!select) return;
    
    // Set default options without making API calls
    select.innerHTML = `
      <option value="">Select a model...</option>
      <optgroup label="📍 Ollama (Local)">
        <option value="ollama:gemma3n:e4b">gemma3n:e4b</option>
        <option value="ollama:llama3.2:latest">llama3.2:latest</option>
        <option value="ollama:phi4:latest">phi4:latest</option>
      </optgroup>
      <optgroup label="☁️ Google Gemini">
        <option value="google:gemini-pro">gemini-pro</option>
        <option value="google:gemini-pro-vision">gemini-pro-vision</option>
        <option value="google:gemini-flash">gemini-flash</option>
      </optgroup>
    `;
    
    // Set the current selected model if available
    if (this.currentSettings.selectedModel) {
      select.value = this.currentSettings.selectedModel;
    }
    
    console.log('Initialized model dropdown with default options');
  }

  async onGoogleApiKeyChange(apiKey) {
    if (apiKey && apiKey.length > 20) {
      try {
        // Validate API key and refresh all models
        const valid = await this.validateGoogleApiKey(apiKey);
        if (valid) {
          await this.refreshAllModels(); // Refresh the unified model list
        }
      } catch (error) {
        console.error('Google API key validation failed:', error);
      }
    }
  }

  async validateGoogleApiKey(apiKey) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'validateGoogleApiKey',
        apiKey: apiKey
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error validating Google API key:', chrome.runtime.lastError);
          resolve(false);
        } else {
          resolve(response?.valid || false);
        }
      });
    });
  }

  async loadGoogleModels(apiKey) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getGoogleModels',
        apiKey: apiKey
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error getting Google models:', chrome.runtime.lastError);
          resolve([]);
        } else {
          const models = response?.models || [];
          this.populateGoogleModels(models);
          resolve(models);
        }
      });
    });
  }

  populateGoogleModels(models) {
    // Note: google-model dropdown was removed in favor of unified model selection
    // This function is now handled by refreshAllModels() and populateUnifiedModels()
    console.log(`Retrieved ${models.length} Google models - will be added to unified dropdown`);
    
    // Just log the models for debugging - the unified dropdown will be populated by refreshAllModels()
    if (models.length > 0) {
      console.log('Google models available:', models.map(m => m.name || m.displayName).slice(0, 5), '...');
    }
  }

  async refreshAllModels() {
    console.log('Refreshing all available models...');
    const select = document.getElementById('selected-model');
    
    // Safety check - ensure the select element exists
    if (!select) {
      console.error('Model select element not found, skipping refresh');
      return;
    }
    
    // Show loading state
    select.innerHTML = '<option value="">🔄 Loading models...</option>';
    
    try {
      const allModels = [];
      
      // Get Ollama models
      try {
        const ollamaModels = await this.getOllamaModels();
        ollamaModels.forEach(model => {
          allModels.push({
            value: `ollama:${model.name}`,
            label: `📍 ${model.name} (Ollama)`,
            source: 'ollama',
            name: model.name
          });
        });
      } catch (error) {
        console.log('Ollama models not available:', error.message);
      }
      
      // Get Google models if API key is available
      const googleApiKeyElement = document.getElementById('google-api-key');
      const googleApiKey = this.currentSettings.googleApiKey || (googleApiKeyElement ? googleApiKeyElement.value : '');
      if (googleApiKey) {
        try {
          const googleModels = await this.loadGoogleModels(googleApiKey);
          googleModels.forEach(model => {
            allModels.push({
              value: `google:${model.name}`,
              label: `☁️ ${model.displayName || model.name} (Google)`,
              source: 'google',
              name: model.name
            });
          });
        } catch (error) {
          console.log('Google models not available:', error.message);
        }
      }
      
      // Populate unified dropdown
      this.populateUnifiedModels(allModels);
      
    } catch (error) {
      console.error('Failed to refresh models:', error);
      // Fall back to default options if refresh fails
      this.initializeModelDropdown();
    }
  }

  async getOllamaModels() {
    return new Promise((resolve) => {
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.log('Ollama models request timed out');
        resolve([]);
      }, 5000); // 5 second timeout
      
      chrome.runtime.sendMessage({
        action: 'getAvailableModels'
      }, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError) {
          console.error('Error getting Ollama models:', chrome.runtime.lastError);
          resolve([]);
        } else {
          resolve(response?.models || []);
        }
      });
    });
  }

  populateUnifiedModels(models) {
    const select = document.getElementById('selected-model');
    
    // Clear existing options
    select.innerHTML = '';
    
    if (models.length === 0) {
      select.innerHTML = '<option value="">No models available</option>';
      return;
    }
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a model...';
    select.appendChild(defaultOption);
    
    // Group by source
    const ollamaModels = models.filter(m => m.source === 'ollama');
    const googleModels = models.filter(m => m.source === 'google');
    
    // Add Ollama models
    if (ollamaModels.length > 0) {
      const ollamaGroup = document.createElement('optgroup');
      ollamaGroup.label = '📍 Ollama (Local)';
      ollamaModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.name;
        ollamaGroup.appendChild(option);
      });
      select.appendChild(ollamaGroup);
    }
    
    // Add Google models
    if (googleModels.length > 0) {
      const googleGroup = document.createElement('optgroup');
      googleGroup.label = '☁️ Google Gemini';
      googleModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.value;
        option.textContent = model.name;
        googleGroup.appendChild(option);
      });
      select.appendChild(googleGroup);
    }
    
    // Restore the previously selected model if it exists in the new list
    if (this.currentSettings.selectedModel) {
      const savedValue = this.currentSettings.selectedModel;
      select.value = savedValue;
      
      // If the saved value doesn't exist in the new list, log a warning
      if (select.value !== savedValue) {
        console.warn(`Previously selected model "${savedValue}" not found in current model list`);
        // Keep the setting but reset the dropdown to default
        select.value = '';
      } else {
        console.log(`✅ Restored selected model: ${savedValue}`);
      }
    }
    
    console.log(`Populated ${models.length} total models (${ollamaModels.length} Ollama, ${googleModels.length} Google)`);
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