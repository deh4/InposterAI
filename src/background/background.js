/**
 * Background Service Worker for AI Content Detector Extension
 * Handles Ollama API communication and manages extension state
 */

import OllamaClient from '../shared/ollama-client.js';

class BackgroundService {
  constructor() {
    this.ollamaClient = new OllamaClient();
    this.analysisCache = new Map();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle tab updates to potentially analyze new content
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab);
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

    // Check cache first
    const textHash = this.hashText(text);
    const cached = this.getFromCache(textHash);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    // Test Ollama connection
    const connectionTest = await this.ollamaClient.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Ollama not available: ${connectionTest.error}`);
    }

    // Perform analysis
    const analysis = await this.ollamaClient.analyzeText(text);
    
    // Cache result
    this.addToCache(textHash, analysis);
    
    // Update badge with result
    this.updateBadge(analysis.likelihood);

    return analysis;
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
}

// Initialize the background service
const backgroundService = new BackgroundService();

console.log('AI Content Detector background service initialized'); 