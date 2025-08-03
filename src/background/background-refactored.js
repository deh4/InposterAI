/**
 * Refactored Background Service Worker for AI Content Detector Extension
 * Uses unified AnalysisEngine for consistent analysis behavior
 */

import { AnalysisEngine } from '../shared/analysis-engine.js';



class ModernBackgroundService {
  constructor() {
    this.analysisEngine = new AnalysisEngine();
    this.dashboardUrl = 'http://localhost:3000';
    this.setupMessageHandlers();
    this.setupContextMenus();
    
    console.log('Modern Background Service initialized with unified AnalysisEngine');
  }

  setupContextMenus() {
    chrome.contextMenus.create({
      id: 'analyzeSelectedText',
      title: 'Quick Analyze with AI Detector',
      contexts: ['selection']
    });
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Context menu click handler
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });

    // Extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Badge management
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.updateBadgeForTab(tabId);
      }
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'analyzeText': {
          const result = await this.analyzeText(request.text, request.options);
          sendResponse({ success: true, data: result });
          break;
        }
        case 'testOllamaConnection': {
          const connectionTest = await this.analysisEngine.ollamaClient.testConnection();
          sendResponse({ success: true, data: connectionTest });
          break;
        }
        case 'getAnalysisFromCache': {
          const textHash = this.analysisEngine.hashText(request.text);
          const cached = this.analysisEngine.getFromCache(textHash);
          sendResponse({ success: true, data: cached });
          break;
        }
        case 'updateSettings': {
          await this.updateSettings(request.settings);
          sendResponse({ success: true });
          break;
        }
        case 'getSettings': {
          const settings = await this.getSettings();
          sendResponse({ success: true, data: settings });
          break;
        }
        case 'getAvailableModels': {
          const models = await this.getAvailableModels();
          sendResponse({ success: true, models: models });
          break;
        }
        case 'getCurrentModel': {
          const currentModel = await this.analysisEngine.ollamaClient.getCurrentModel();
          sendResponse({ success: true, model: currentModel });
          break;
        }
        case 'setCurrentModel': {
          await this.analysisEngine.ollamaClient.setCurrentModel(request.model);
          sendResponse({ success: true });
          break;
        }
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Analyze text using the unified AnalysisEngine
   */
  async analyzeText(text, options = {}) {
    const requestStartTime = Date.now();
    
    try {
      // Use the unified analysis engine
      const result = await this.analysisEngine.analyze(text, options);
      
      // Enhance with timing and metadata
      const enhancedResult = {
        ...result,
        timing: {
          requestStartTime,
          requestEndTime: Date.now(),
          totalTime: Date.now() - requestStartTime
        },
        source: 'background'
      };

      // Send to dashboard for analytics
      await this.sendAnalysisDataToDashboard(enhancedResult, text);
      
      // Update badge with result
      this.updateBadgeWithResult(enhancedResult);
      
      return enhancedResult;
      
    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Send error to dashboard
      await this.sendErrorToDashboard(error, text, requestStartTime);
      
      throw error;
    }
  }

  /**
   * Handle context menu clicks
   */
  async handleContextMenuClick(info, tab) {
    if (info.menuItemId === 'analyzeSelectedText' && info.selectionText) {
      try {
        // Send message to content script to handle quick analysis
        await chrome.tabs.sendMessage(tab.id, {
          action: 'startQuickAnalysis',
          text: info.selectionText
        });
      } catch (error) {
        console.error('Context menu analysis failed:', error);
        // Fallback: open popup with analysis
        this.openPopupWithAnalysis(info.selectionText);
      }
    }
  }

  /**
   * Open popup as fallback for context menu
   */
  async openPopupWithAnalysis(text) {
    try {
      const result = await this.analyzeText(text);
      
      // Store result for popup to retrieve
      await chrome.storage.local.set({
        'quickAnalysisResult': {
          result,
          text,
          timestamp: Date.now()
        }
      });
      
      // Open popup
      chrome.action.openPopup();
    } catch (error) {
      console.error('Popup analysis fallback failed:', error);
    }
  }

  /**
   * Handle extension installation
   */
  handleInstallation(details) {
    console.log('Extension installed:', details);
    
    if (details.reason === 'install') {
      // Set default settings
      this.setDefaultSettings();
      
      // Open welcome page or instructions
      chrome.tabs.create({
        url: chrome.runtime.getURL('src/popup/popup.html')
      });
    }
  }

  /**
   * Update badge for tab
   */
  async updateBadgeForTab(tabId) {
    try {
      // Check if content script is ready
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      
      if (response && response.status === 'ready') {
        chrome.action.setBadgeBackgroundColor({ color: '#4a9eff', tabId });
        chrome.action.setBadgeText({ text: '✓', tabId });
      }
    } catch (error) {
      // Content script not ready or not applicable
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }

  /**
   * Update badge with analysis result
   */
  updateBadgeWithResult(result) {
    const likelihood = result.likelihood;
    let badgeText = '';
    let badgeColor = '#4a9eff';
    
    if (likelihood >= 70) {
      badgeText = 'AI';
      badgeColor = '#e74c3c'; // Red
    } else if (likelihood >= 40) {
      badgeText = '?';
      badgeColor = '#f39c12'; // Orange
    } else {
      badgeText = 'H';
      badgeColor = '#27ae60'; // Green
    }
    
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: badgeColor });
  }

  /**
   * Get available Ollama models
   */
  async getAvailableModels() {
    try {
      return await this.analysisEngine.ollamaClient.getAvailableModels();
    } catch (error) {
      console.error('Failed to get models:', error);
      return [];
    }
  }

  /**
   * Settings management
   */
  async getSettings() {
    const defaults = {
      selectedModel: 'llama3.2:3b',
      autoAnalyze: false,
      analysisThreshold: 50,
      showConfidence: true,
      enableQuickAnalysis: true
    };
    
    const stored = await chrome.storage.sync.get(defaults);
    return { ...defaults, ...stored };
  }

  async updateSettings(settings) {
    await chrome.storage.sync.set(settings);
    
    // Update current model if changed
    if (settings.selectedModel) {
      await this.analysisEngine.ollamaClient.setCurrentModel(settings.selectedModel);
    }
    
    console.log('Settings updated:', settings);
  }

  async setDefaultSettings() {
    const defaults = await this.getSettings();
    await chrome.storage.sync.set(defaults);
    console.log('Default settings applied');
  }

  /**
   * Send analysis data to dashboard
   */
  async sendAnalysisDataToDashboard(analysisResult, originalText) {
    try {
      const dataToSend = {
        id: analysisResult.id,
        url: 'background-analysis',
        domain: 'extension',
        title: 'Background Analysis',
        aiLikelihood: analysisResult.likelihood,
        confidence: analysisResult.confidence,
        analysisTime: analysisResult.timing?.totalTime || 0,
        method: analysisResult.method || 'ensemble',
        modelUsed: await this.analysisEngine.ollamaClient.getCurrentModel(),
        textLength: originalText?.length || 0,
        wordCount: originalText?.split(/\s+/).length || 0,
        timestamp: Date.now(),
        source: 'background',
        llmAnalysis: analysisResult.llmAnalysis || {},
        statisticalBreakdown: analysisResult.statisticalBreakdown || {},
        userAgent: 'Extension Background Service',
        settings: await this.getSettings()
      };

      const response = await fetch(`${this.dashboardUrl}/api/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      if (!response.ok) {
        throw new Error(`Dashboard API error: ${response.status}`);
      }

      console.log('Analysis data sent to dashboard successfully');
    } catch (error) {
      console.warn('Failed to send analysis data to dashboard:', error);
      // Don't throw - dashboard communication is optional
    }
  }

  /**
   * Send error data to dashboard
   */
  async sendErrorToDashboard(error, originalText, requestStartTime) {
    try {
      const errorData = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        url: 'background-error',
        domain: 'extension',
        title: 'Analysis Error',
        error: error.message,
        analysisTime: Date.now() - requestStartTime,
        textLength: originalText?.length || 0,
        timestamp: Date.now(),
        source: 'background',
        userAgent: 'Extension Background Service'
      };

      await fetch(`${this.dashboardUrl}/api/analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      });
    } catch (dashboardError) {
      console.warn('Failed to send error data to dashboard:', dashboardError);
    }
  }
}

// Initialize the background service
const backgroundService = new ModernBackgroundService();

// Export for potential testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModernBackgroundService;
} 