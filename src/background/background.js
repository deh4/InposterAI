/**
 * Background Service Worker for AI Content Detector Extension
 * Handles Ollama API communication and manages extension state
 */

import OllamaClient from '../shared/ollama-client.js';

class BackgroundService {
  constructor() {
    this.ollamaClient = new OllamaClient();
    this.analysisCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.dashboardUrl = 'http://localhost:3000'; // Dashboard server URL
    this.setupMessageHandlers();
    this.setupContextMenus();
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
          const connectionTest = await this.ollamaClient.testConnection();
          sendResponse({ success: true, data: connectionTest });
          break;
        }
        case 'getAnalysisFromCache': {
          const cached = this.getFromCache(request.textHash);
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
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async analyzeText(text, options = {}) {
    if (!text || text.trim().length < 50) {
      throw new Error('Text too short for reliable analysis (minimum 50 characters)');
    }

    const requestStartTime = Date.now();

    // Check cache first
    const textHash = this.hashText(text);
    const cached = this.getFromCache(textHash);
    if (cached) {
      // Add cache hit timing and model info for dashboard
      const enhancedCached = {
        ...cached,
        fromCache: true,
        analysisTime: Date.now() - requestStartTime,
        modelName: cached.modelName || (await this.getSettings()).model,
        cacheHitTime: Date.now() - requestStartTime
      };
      
      // Send cache hit to dashboard
      await this.sendToDashboard('analysis', {
        ...enhancedCached,
        metadata: options.metadata,
        sessionId: await this.getSessionId()
      });
      
      return enhancedCached;
    }

    // Test Ollama connection
    const connectionTest = await this.ollamaClient.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Ollama not available: ${connectionTest.error}`);
    }

    // Get current settings and system info
    const settings = await this.getSettings();
    const ollamaVersion = await this.ollamaClient.getOllamaVersion();
    const modelInfo = await this.ollamaClient.getModelInfo(settings.model);

    // Update ollama client model if settings changed
    this.ollamaClient.setModel(settings.model);

    // Perform analysis
    const analysisStartTime = Date.now();
    const analysis = await this.ollamaClient.analyzeText(text);
    const analysisEndTime = Date.now();
    
    // Enhance analysis with comprehensive system data
    const enhancedAnalysis = {
      ...analysis,
      // Timing information
      totalRequestTime: Date.now() - requestStartTime,
      analysisTime: analysisEndTime - analysisStartTime,
      connectionTestTime: analysisStartTime - requestStartTime,
      
      // System information
      modelName: settings.model,
      modelInfo: modelInfo,
      ollamaVersion: ollamaVersion,
      extensionVersion: chrome.runtime.getManifest()?.version || '1.0.0',
      
      // Settings context
      currentSettings: {
        autoAnalyze: settings.autoAnalyze,
        minTextLength: settings.minTextLength,
        sensitivityLevel: settings.sensitivityLevel
      },
      
      // Cache performance
      fromCache: false,
      cacheSize: this.analysisCache.size,
      
      // Analysis context
      textLength: text.length,
      wordCount: text.split(/\s+/).length,
      timestamp: Date.now()
    };
    
    // Cache result
    this.addToCache(textHash, enhancedAnalysis);
    
    // Update badge with result
    this.updateBadge(enhancedAnalysis.likelihood);

    // Send to dashboard if available
    await this.sendToDashboard('analysis', {
      ...enhancedAnalysis,
      metadata: options.metadata,
      sessionId: await this.getSessionId()
    });

    return enhancedAnalysis;
  }

  hashText(text) {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  getFromCache(textHash) {
    return this.analysisCache.get(textHash);
  }

  addToCache(textHash, analysis) {
    // Limit cache size to prevent memory issues
    if (this.analysisCache.size > 100) {
      const firstKey = this.analysisCache.keys().next().value;
      this.analysisCache.delete(firstKey);
    }
    
    this.analysisCache.set(textHash, {
      ...analysis,
      timestamp: Date.now()
    });
  }

  async updateBadge(likelihood) {
    const color = likelihood > 70 ? '#ff4444' : likelihood > 40 ? '#ffaa00' : '#44ff44';
    const text = likelihood > 70 ? 'AI' : likelihood > 40 ? '?' : 'OK';

    try {
      await chrome.action.setBadgeBackgroundColor({ color });
      await chrome.action.setBadgeText({ text });
    } catch (error) {
      console.warn('Failed to update badge:', error);
    }
  }

  async updateSettings(settings) {
    return chrome.storage.sync.set({ aiDetectorSettings: settings });
  }

  async getSettings() {
    const result = await chrome.storage.sync.get('aiDetectorSettings');
    return result.aiDetectorSettings || {
      autoAnalyze: true,
      minTextLength: 100,
      model: 'gemma3n:e4b',
      sensitivityLevel: 'medium'
    };
  }

  async getAvailableModels() {
    try {
      const models = await this.ollamaClient.getModels();
      return models;
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }

  handleInstallation(details) {
    if (details.reason === 'install') {
      console.log('AI Content Detector installed');
      // Set default settings
      this.updateSettings({
        autoAnalyze: true,
        minTextLength: 100,
        model: 'gemma3n:e4b',
        sensitivityLevel: 'medium'
      });
    } else if (details.reason === 'update') {
      console.log('AI Content Detector updated to version', chrome.runtime.getManifest().version);
    }
  }

  async handleContextMenuClick(info, tab) {
    if (info.menuItemId === 'analyzeSelectedText' && info.selectionText) {
      try {
        console.log('Context menu analysis started for text:', info.selectionText.substring(0, 50));
        
        // Show loading indicator immediately
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'showQuickAnalysisLoading',
            selectedText: info.selectionText
          });
          console.log('Loading indicator sent successfully');
        } catch (loadingError) {
          console.warn('Failed to show loading indicator:', loadingError);
          // Continue with analysis even if loading indicator fails
        }

        // Analyze the selected text
        const analysis = await this.analyzeText(info.selectionText, { quickAnalysis: true });
        console.log('Analysis completed:', analysis);
        
        // Send result to content script for overlay display
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'showQuickAnalysisResult',
            analysis: analysis,
            selectedText: info.selectionText
          });
          console.log('Results sent successfully');
        } catch (resultError) {
          console.error('Failed to send results:', resultError);
        }
      } catch (error) {
        console.error('Context menu analysis failed:', error);
        
        // Show error to user
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'showQuickAnalysisError',
            error: error.message
          });
        } catch (errorMsgError) {
          console.error('Failed to send error message:', errorMsgError);
        }
      }
    }
  }

  async updateBadgeForTab(tabId) {
    // Disable automatic badge updates for now - they should be triggered after analysis
    // const tab = await chrome.tabs.get(tabId);
    // if (tab && tab.url) {
    //   try {
    //     const analysis = await this.analyzeText(tab.url, { quickAnalysis: true });
    //     this.updateBadge(analysis.likelihood);
    //   } catch (error) {
    //     console.warn('Failed to update badge for tab:', error);
    //   }
    // }
  }

  async handleTabUpdate(tabId, tab) {
    // Potentially trigger automatic analysis based on settings
    const settings = await this.getSettings();
    if (settings.autoAnalyze && this.shouldAnalyzeUrl(tab.url)) {
      // Send message to content script to start analysis
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'autoAnalyze' });
      } catch (error) {
        // Tab might not have content script loaded yet, ignore
      }
    }
  }

  shouldAnalyzeUrl(url) {
    if (!url) return false;
    
    // Skip chrome:// and extension pages
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return false;
    }
    
    // Focus on article/blog/news sites
    const articlePatterns = [
      /\/article\//,
      /\/blog\//,
      /\/news\//,
      /\/post\//,
      /medium\.com/,
      /substack\.com/,
      /wordpress\.com/,
      /blogspot\.com/
    ];
    
    return articlePatterns.some(pattern => pattern.test(url));
  }

  async sendToDashboard(type, data) {
    try {
      const endpoint = type === 'analysis' ? '/api/analysis' : '/api/feedback';
      
      // Enhance data with additional context
      const enhancedData = {
        ...data,
        // Add browser context
        browserInfo: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          extensionVersion: chrome.runtime.getManifest()?.version || '1.0.0',
          timestamp: Date.now()
        },
        // Add performance context for analysis
        ...(type === 'analysis' && {
          performance: {
            cacheHit: data.fromCache || false,
            totalAnalysisTime: data.analysisTime || 0,
            extractionMethod: data.metadata?.source || 'unknown'
          }
        })
      };
      
      const response = await fetch(`${this.dashboardUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedData),
        mode: 'cors'
      });

      if (response.ok) {
        console.log(`Successfully sent ${type} to dashboard`);
      } else {
        console.warn(`Dashboard ${type} recording failed:`, response.status);
      }
    } catch (error) {
      // Dashboard server might not be running - that's ok
      console.debug(`Dashboard not available for ${type}:`, error.message);
    }
  }

  async getSessionId() {
    // Generate or get existing session ID for today
    const today = new Date().toISOString().split('T')[0];
    const sessionKey = `session_${today}`;
    
    try {
      const result = await chrome.storage.local.get(sessionKey);
      let sessionId = result[sessionKey];
      
      if (!sessionId) {
        sessionId = `session_${today}_${Math.random().toString(36).substr(2, 9)}`;
        await chrome.storage.local.set({ [sessionKey]: sessionId });
      }
      
      return sessionId;
    } catch (error) {
      console.error('Failed to get session ID:', error);
      return `session_${today}_fallback`;
    }
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();

console.log('AI Content Detector background service initialized'); 

chrome.action.onClicked.addListener(async (_tab) => {
  // Open settings page when toolbar icon is clicked
  chrome.runtime.openOptionsPage();
}); 