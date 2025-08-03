/**
 * Feedback Manager for AI Content Detector
 * Handles feedback collection, storage, and anonymization
 */

import { v4 as uuidv4 } from 'uuid';

export class FeedbackManager {
  constructor() {
    this.storageKey = 'ai-detector-feedback';
    this.sessionKey = 'ai-detector-session';
    this.settingsKey = 'ai-detector-settings';
    this.dataRetentionDays = 90;
    
    // Initialize with default session, will be updated async
    this.currentSession = {
      id: this.generateSessionId(),
      date: new Date().toDateString(),
      analysisCount: 0,
      userExpertise: null,
      showMotivationMessage: true
    };
    
    // Initialize session asynchronously
    this.initializeSession();
  }

  /**
   * Initialize or continue session
   */
  async initializeSession() {
    const today = new Date().toDateString();
    let session = await this.getStoredSession();
    
    if (!session || session.date !== today) {
      // Create new session for today
      const settings = await this.getSettings();
      session = {
        id: this.generateSessionId(),
        date: today,
        analysisCount: 0,
        userExpertise: null,
        showMotivationMessage: !(settings.hasSeenFeedbackMotivation || false)
      };
      await this.storeSession(session);
    }
    
    this.currentSession = session;
  }

  /**
   * Generate anonymous session ID
   */
  generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `ses_${timestamp}_${random}`;
  }

  /**
   * Check if user has seen motivation message
   */
  hasSeenMotivationMessage() {
    const settings = this.getSettings();
    return settings.hasSeenFeedbackMotivation || false;
  }

  /**
   * Mark motivation message as seen
   */
  markMotivationMessageSeen() {
    const settings = this.getSettings();
    settings.hasSeenFeedbackMotivation = true;
    this.storeSettings(settings);
    
    this.currentSession.showMotivationMessage = false;
    this.storeSession(this.currentSession);
  }

  /**
   * Set user expertise for current session
   */
  async setUserExpertise(level) {
    this.currentSession.userExpertise = level;
    await this.storeSession(this.currentSession);
  }

  /**
   * Create comprehensive feedback record
   */
  async createFeedbackRecord(analysisData, systemInfo) {
    const record = {
      // Unique identifiers
      id: uuidv4(),
      timestamp: Date.now(),
      sessionId: this.currentSession.id,
      
      // Content Context (anonymized)
      textLength: analysisData.textLength || 0,
      tokenCount: this.estimateTokenCount(analysisData.textLength || 0),
      contentType: this.detectContentType(analysisData.text),
      domain: this.anonymizeDomain(analysisData.url),
      language: this.detectLanguage(analysisData.text),
      textHash: this.hashText(analysisData.text),
      textSample: this.sanitizeTextSample(analysisData.text),
      
      // Analysis Results
      aiScoring: {
        likelihood: analysisData.likelihood,
        confidence: analysisData.confidence,
        ...(analysisData.statisticalBreakdown || {}),
        agreementScore: this.calculateAgreement(analysisData.llmAnalysis, analysisData.statisticalBreakdown)
      },
      
      // Analysis Context
      analysisMethod: analysisData.method || 'ensemble',
      cacheHit: analysisData.fromCache || false,
      promptVersion: systemInfo.promptVersion || '1.0',
      statisticalWeights: systemInfo.statisticalWeights || {},
      uncertaintyFlags: this.detectUncertaintyFlags(analysisData),
      
      // Performance Metrics
      analysisTime: analysisData.analysisTime || 0,
      modelName: systemInfo.modelName || 'unknown',
      modelVersion: systemInfo.modelVersion || 'unknown',
      ollamaVersion: systemInfo.ollamaVersion || 'unknown',
      browserType: this.getBrowserType(),
      browserVersion: this.getBrowserVersion(),
      
      // User Feedback (initially null)
      userFeedback: {
        rating: null,
        correction: null,
        reasons: [],
        feedbackTime: null,
        feedbackDelay: null
      },
      
      // User Experience
      analysisSequence: ++this.currentSession.analysisCount,
      userExpertise: this.currentSession.userExpertise,
      confidenceCalibration: null // Will be calculated when feedback is provided
    };

    await this.storeSession(this.currentSession);
    return record;
  }

  /**
   * Update feedback record with user input
   */
  async updateFeedback(recordId, feedbackData) {
    const records = await this.getFeedbackRecords();
    const recordIndex = records.findIndex(r => r.id === recordId);
    
    if (recordIndex === -1) {
      throw new Error('Feedback record not found');
    }

    const record = records[recordIndex];
    const feedbackTime = Date.now();
    
    record.userFeedback = {
      rating: feedbackData.rating,
      correction: feedbackData.correction,
      reasons: feedbackData.reasons || [],
      feedbackTime: feedbackTime,
      feedbackDelay: feedbackTime - record.timestamp
    };

    // Calculate confidence calibration
    if (feedbackData.correction) {
      record.confidenceCalibration = this.calculateConfidenceCalibration(
        record.aiScoring.likelihood,
        record.aiScoring.confidence,
        feedbackData.correction.aiPercentage
      );
    }

    records[recordIndex] = record;
    await this.storeFeedbackRecords(records);
    
    return record;
  }

  /**
   * Get all feedback records
   */
  async getFeedbackRecords() {
    try {
      const result = await chrome.storage.local.get(this.storageKey);
      return result[this.storageKey] || [];
    } catch (error) {
      console.error('Failed to load feedback records:', error);
      return [];
    }
  }

  /**
   * Store feedback records
   */
  async storeFeedbackRecords(records) {
    try {
      // Clean old records before storing
      const cleanedRecords = this.cleanOldRecords(records);
      await chrome.storage.local.set({ [this.storageKey]: cleanedRecords });
    } catch (error) {
      console.error('Failed to store feedback records:', error);
    }
  }

  /**
   * Clean records older than retention period
   */
  cleanOldRecords(records) {
    const cutoffTime = Date.now() - (this.dataRetentionDays * 24 * 60 * 60 * 1000);
    return records.filter(record => record.timestamp > cutoffTime);
  }

  /**
   * Utility methods for data processing
   */
  
  estimateTokenCount(textLength) {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(textLength / 4);
  }

  detectContentType(text) {
    if (!text) return 'other';
    
    const length = text.length;
    if (length < 100) return 'comment';
    if (length < 500) return 'social_post';
    if (length < 2000) return 'email';
    return 'article';
  }

  anonymizeDomain(url) {
    if (!url) return 'unknown';
    
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      // Common domain mappings for anonymization
      const domainMap = {
        'news': ['cnn.com', 'bbc.com', 'reuters.com', 'nytimes.com'],
        'social': ['twitter.com', 'facebook.com', 'linkedin.com', 'reddit.com'],
        'tech': ['github.com', 'stackoverflow.com', 'medium.com'],
        'search': ['google.com', 'bing.com', 'duckduckgo.com']
      };

      for (const [category, domains] of Object.entries(domainMap)) {
        if (domains.some(d => domain.includes(d))) {
          return `${category}_site`;
        }
      }
      
      return 'other_site';
    } catch {
      return 'unknown';
    }
  }

  detectLanguage(text) {
    if (!text) return 'unknown';
    
    // Simple language detection based on character patterns
    const hasLatin = /[a-zA-Z]/.test(text);
    const hasCyrillic = /[а-яё]/i.test(text);
    const hasCJK = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]/.test(text);
    
    if (hasCJK) return 'cjk';
    if (hasCyrillic) return 'cyrillic';
    if (hasLatin) return 'latin';
    return 'other';
  }

  hashText(text) {
    if (!text) return '';
    
    // Simple hash function for anonymization
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  sanitizeTextSample(text) {
    if (!text) return '';
    
    return text
      .substring(0, 100)
      // Remove emails, URLs, and potential PII
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .replace(/https?:\/\/[^\s]+/g, '[URL]')
      .replace(/\b\d{10,}\b/g, '[NUMBER]')
      .trim();
  }

  calculateAgreement(llmAnalysis, statisticalBreakdown) {
    if (!llmAnalysis || !statisticalBreakdown) return 0;
    
    const llmScore = llmAnalysis.likelihood || 0;
    const statScore = statisticalBreakdown.overallAILikelihood || 0;
    
    return 100 - Math.abs(llmScore - statScore);
  }

  detectUncertaintyFlags(analysisData) {
    const flags = [];
    
    if (analysisData.confidence < 50) flags.push('low_confidence');
    if (Math.abs(analysisData.likelihood - 50) < 10) flags.push('borderline_result');
    if (analysisData.analysisTime > 10000) flags.push('slow_analysis');
    
    return flags;
  }

  calculateConfidenceCalibration(ourLikelihood, ourConfidence, userLikelihood) {
    const predictionAccuracy = 100 - Math.abs(ourLikelihood - userLikelihood);
    const calibrationScore = ourConfidence * (predictionAccuracy / 100);
    return Math.round(calibrationScore);
  }

  getBrowserType() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('opera') || userAgent.includes('opr')) return 'opera';
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    return 'unknown';
  }

  getBrowserVersion() {
    const userAgent = navigator.userAgent;
    const match = userAgent.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    return match[2] || 'unknown';
  }

  /**
   * Session and settings management
   */
  
  async getStoredSession() {
    try {
      const result = await chrome.storage.local.get(this.sessionKey);
      return result[this.sessionKey] || null;
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  async storeSession(session) {
    try {
      await chrome.storage.local.set({ [this.sessionKey]: session });
    } catch (error) {
      console.error('Failed to store session:', error);
    }
  }

  async getSettings() {
    try {
      const result = await chrome.storage.local.get(this.settingsKey);
      return result[this.settingsKey] || {};
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {};
    }
  }

  async storeSettings(settings) {
    try {
      await chrome.storage.local.set({ [this.settingsKey]: settings });
    } catch (error) {
      console.error('Failed to store settings:', error);
    }
  }

  /**
   * Export data for training/analysis
   */
  async exportFeedbackData() {
    const records = await this.getFeedbackRecords();
    const exportData = {
      exportTime: new Date().toISOString(),
      recordCount: records.length,
      dataRetentionDays: this.dataRetentionDays,
      records: records
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Get analytics summary
   */
  getAnalyticsSummary() {
    const records = this.getFeedbackRecords();
    const feedbackRecords = records.filter(r => r.userFeedback.rating);
    
    return {
      totalAnalyses: records.length,
      feedbackCount: feedbackRecords.length,
      feedbackRate: records.length > 0 ? (feedbackRecords.length / records.length * 100).toFixed(1) : 0,
      thumbsUp: feedbackRecords.filter(r => r.userFeedback.rating === 'thumbs_up').length,
      thumbsDown: feedbackRecords.filter(r => r.userFeedback.rating === 'thumbs_down').length,
      averageConfidenceCalibration: this.calculateAverageConfidenceCalibration(feedbackRecords),
      commonReasons: this.getCommonFeedbackReasons(feedbackRecords)
    };
  }

  calculateAverageConfidenceCalibration(records) {
    const calibrationScores = records
      .filter(r => r.confidenceCalibration !== null)
      .map(r => r.confidenceCalibration);
    
    if (calibrationScores.length === 0) return 0;
    
    const average = calibrationScores.reduce((sum, score) => sum + score, 0) / calibrationScores.length;
    return Math.round(average);
  }

  getCommonFeedbackReasons(records) {
    const reasonCounts = {};
    
    records.forEach(record => {
      record.userFeedback.reasons.forEach(reason => {
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });
    });

    return Object.entries(reasonCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));
  }

  async submitFeedback(recordId, feedbackData) {
    try {
      // Validate feedback data
      if (!recordId || !feedbackData) {
        throw new Error('Invalid feedback data');
      }

      // Get existing record
      const records = await this.getFeedbackRecords();
      const recordIndex = records.findIndex(r => r.id === recordId);
      
      if (recordIndex === -1) {
        throw new Error('Feedback record not found');
      }

      // Update record with feedback
      const record = records[recordIndex];
      record.feedback = {
        ...feedbackData,
        submittedAt: Date.now()
      };

      // Save updated records
      await this.storeFeedbackRecords(records);

      // Send to dashboard if available
      await this.sendFeedbackToDashboard(record);

      console.log('Feedback submitted successfully');
      return true;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  }

  async sendFeedbackToDashboard(record) {
    try {
      const dashboardUrl = 'http://localhost:3000';
      const feedbackData = {
        analysisId: record.id,
        feedbackType: record.feedback?.type || 'simple',
        rating: record.feedback?.rating,
        correctedLikelihood: record.feedback?.correctedLikelihood,
        correctedConfidence: record.feedback?.correctedConfidence,
        reasonCategory: record.feedback?.reasonCategory,
        reasonText: record.feedback?.reasonText,
        userExpertise: record.feedback?.userExpertise || 'beginner',
        isHelpful: record.feedback?.isHelpful || false,
        sessionId: record.sessionId
      };

      const response = await fetch(`${dashboardUrl}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
        mode: 'cors'
      });

      if (response.ok) {
        console.log('Successfully sent feedback to dashboard');
      } else {
        console.warn('Dashboard feedback recording failed:', response.status);
      }
    } catch (error) {
      // Dashboard server might not be running - that's ok
      console.debug('Dashboard not available for feedback:', error.message);
    }
  }
}

export default FeedbackManager; 